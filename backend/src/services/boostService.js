// Boost and Super Like service: microtransactions on top of unlocks
import { BoostModel, SuperLikeModel, WalletModel, ProfileModel, TransactionModel, transaction } from '../models/index.js';
import { PLANS } from './subscriptionService.js';

export const BOOST_TYPES = {
    spotlight: {
        id: 'spotlight',
        label: 'Spotlight',
        price: 4.99,
        duration_hours: 6,
        note: 'Appears in the top slot of discovery for 6 hours',
        multiplier: 3
    },
    turbo: {
        id: 'turbo',
        label: 'Turbo',
        price: 9.99,
        duration_hours: 24,
        note: '10x more visibility for a full day',
        multiplier: 10
    },
    spotlight_weekly: {
        id: 'spotlight_weekly',
        label: 'Spotlight Week',
        price: 19.99,
        duration_hours: 168,
        note: 'Continuous top-of-feed placement for a week',
        multiplier: 3
    }
};

export const SUPER_LIKE_COST = 7.99;

// Paid plans include a monthly allowance; free accounts must pay per use.
const planAllowance = (planId, boostType) => {
    if (planId === 'gold') return Infinity;
    if (planId === 'plus') {
        if (boostType === 'superlike') return 3;
        return boostType === 'spotlight' ? 5 : 1;
    }
    if (planId === 'free') return boostType === 'spotlight' ? 1 : 0;
    return 0;
};

const addHours = (iso, hours) => {
    const d = new Date(iso);
    d.setHours(d.getHours() + hours);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

// Allowances reset on the 1st, so count usage from the start of this month.
const startOfCurrentMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Start a profile boost. Charged atomically with the boost row so the boost is
 * never granted without a matching debit.
 */
export const startBoost = async (userId, boostTypeId, { payment_method = 'wallet', planId = 'free' } = {}) => {
    const boost = BOOST_TYPES[boostTypeId];
    if (!boost) {
        const err = new Error('Unknown boost type');
        err.status = 400;
        throw err;
    }

    const profile = await ProfileModel.findByUserId(userId);
    if (!profile) {
        const err = new Error('Create your profile before boosting');
        err.status = 400;
        throw err;
    }

    const startedAt = new Date().toISOString();
    const endsAt = addHours(startedAt, boost.duration_hours);

    // Usage must come from full history, not the active list, or a boost that
    // already expired earlier this month would not count against the allowance.
    const periodStart = startOfCurrentMonth();
    const usageThisPeriod = (await BoostModel.historyByUser(userId, 500))
        .filter(b => b.started_at >= periodStart && b.boost_type === boostTypeId);
    const allowance = planAllowance(planId, boostTypeId);

    // Plan allowance covers the cost; anything beyond it is charged.
    const allowanceLeft = allowance === Infinity
        ? Infinity
        : Math.max(0, allowance - usageThisPeriod.length);
    const charge = allowanceLeft > 0 ? 0 : boost.price;

    if (charge > 0 && payment_method === 'wallet') {
        const wallet = await WalletModel.findByUserId(userId);
        if (!wallet) {
            const err = new Error('Wallet not found');
            err.status = 404;
            throw err;
        }
        if (wallet.balance < charge) {
            const err = new Error(`Insufficient wallet balance. ${boost.label} costs $${boost.price.toFixed(2)}.`);
            err.status = 400;
            throw err;
        }
    }

    const created = await transaction(async (tx) => {
        if (charge > 0 && payment_method === 'wallet') {
            const row = await tx.get(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
            if (!row || row.balance < charge) {
                const err = new Error('Insufficient wallet balance');
                err.status = 400;
                throw err;
            }
            await tx.run(`UPDATE wallets SET balance = ROUND(balance - ?, 2), updated_at = datetime('now') WHERE user_id = ?`, [charge, userId]);
        }

        const res = await tx.run(
            `INSERT INTO boosts (user_id, profile_id, boost_type, duration_hours, cost, started_at, ends_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [userId, profile.id, boostTypeId, boost.duration_hours, charge, startedAt.slice(0, 19).replace('T', ' '), endsAt]
        );

        if (charge > 0) {
            await tx.run(
                `INSERT INTO transactions (user_id, profile_id, amount, currency, payment_method, payment_status, transaction_ref, description)
                 VALUES (?, NULL, ?, 'USD', ?, 'completed', ?, ?)`,
                [userId, charge, payment_method, `BOOST_${boostTypeId.toUpperCase()}_${Date.now()}`, `${boost.label} boost`]
            );
        }

        return { id: res.id };
    });

    return {
        ok: true,
        boost_id: created.id,
        type: boostTypeId,
        label: boost.label,
        charged: charge,
        covered_by_plan: charge === 0,
        multiplier: boost.multiplier,
        ends_at: endsAt,
        message: charge === 0
            ? `${boost.label} boost active, included with your plan.`
            : `${boost.label} boost active for ${boost.duration_hours}h.`
    };
};

export const activeBoosts = async (userId) => {
    const rows = await BoostModel.activeForUser(userId);
    return rows.map(b => ({
        id: b.id,
        type: b.boost_type,
        label: BOOST_TYPES[b.boost_type]?.label || b.boost_type,
        multiplier: BOOST_TYPES[b.boost_type]?.multiplier || 1,
        ends_at: b.ends_at,
        charged: b.cost
    }));
};

export const boostHistory = async (userId) => {
    const rows = await BoostModel.historyByUser(userId);
    return rows.map(b => ({
        id: b.id,
        type: b.boost_type,
        label: BOOST_TYPES[b.boost_type]?.label || b.boost_type,
        cost: b.cost,
        started_at: b.started_at,
        ends_at: b.ends_at,
        status: b.status
    }));
};

/** Send a paid Super Like. Duplicate sends are rejected rather than charged twice. */
export const sendSuperLike = async (userId, targetProfileId, { message = null, payment_method = 'wallet', planId = 'free' } = {}) => {
    const target = await ProfileModel.findById(targetProfileId);
    if (!target) {
        const err = new Error('Profile not found');
        err.status = 404;
        throw err;
    }

    const mine = await ProfileModel.findByUserId(userId);
    if (mine && target.id === mine.id) {
        const err = new Error('You cannot Super Like yourself');
        err.status = 400;
        throw err;
    }

    const allowance = planId === 'free' ? 0 : planId === 'plus' ? 3 : Infinity;
    const existing = await SuperLikeModel.sentByUser(userId, 100);
    const already = existing.filter(s => s.target_profile_id === targetProfileId);
    if (already.length) {
        return { ok: true, duplicate: true, message: `You already Super Liked ${target.full_name || 'this profile'}.` };
    }

    const charge = allowance === Infinity || existing.length < allowance ? 0 : SUPER_LIKE_COST;

    if (charge > 0 && payment_method === 'wallet') {
        const wallet = await WalletModel.findByUserId(userId);
        if (!wallet || wallet.balance < charge) {
            const err = new Error(`Insufficient wallet balance. Super Like costs $${SUPER_LIKE_COST.toFixed(2)}.`);
            err.status = 400;
            throw err;
        }
    }

    const result = await transaction(async (tx) => {
        if (charge > 0 && payment_method === 'wallet') {
            const row = await tx.get(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
            if (!row || row.balance < charge) {
                const err = new Error('Insufficient wallet balance');
                err.status = 400;
                throw err;
            }
            await tx.run(`UPDATE wallets SET balance = ROUND(balance - ?, 2), updated_at = datetime('now') WHERE user_id = ?`, [charge, userId]);
        }

        const dup = await tx.get(`SELECT id FROM super_likes WHERE user_id = ? AND target_profile_id = ?`, [userId, targetProfileId]);
        if (dup) {
            const err = new Error('Already Super Liked');
            err.status = 409;
            throw err;
        }

        const res = await tx.run(
            `INSERT INTO super_likes (user_id, target_profile_id, cost, direction, message) VALUES (?, ?, ?, 'outgoing', ?)`,
            [userId, targetProfileId, charge, message]
        );

        if (charge > 0) {
            await tx.run(
                `INSERT INTO transactions (user_id, profile_id, amount, currency, payment_method, payment_status, transaction_ref, description)
                 VALUES (?, NULL, ?, 'USD', ?, 'completed', ?, ?)`,
                [userId, charge, payment_method, `SL_${Date.now()}`, 'Super Like']
            );
        }

        return { id: res.id };
    });

    return {
        ok: true,
        id: result.id,
        charged: charge,
        covered_by_plan: charge === 0,
        message: charge === 0
            ? `Super Liked ${target.full_name}. Included with your plan.`
            : `Super Liked ${target.full_name}.`
    };
};

export const superLikesReceived = async (userId) => {
    const rows = await SuperLikeModel.receivedByUser(userId);
    return rows.map(r => ({
        id: r.id,
        // s.user_id is the sender's account, so their profile id is the join key
        profile_id: r.user_id,
        from: r.full_name,
        photo: r.photo_url,
        tier: r.tier,
        age: r.age,
        message: r.message,
        at: r.created_at
    }));
};

export const superLikesSent = async (userId) => {
    const rows = await SuperLikeModel.sentByUser(userId);
    return rows.map(r => ({
        id: r.id,
        profile_id: r.target_profile_id,
        to: r.full_name,
        photo: r.photo_url,
        tier: r.tier,
        cost: r.cost,
        at: r.created_at
    }));
};

export const cataloguePricing = (planId = 'free') => ({
    plans: Object.values(PLANS).map(p => ({ id: p.id, label: p.label, price: p.price })),
    boosts: Object.values(BOOST_TYPES).map(b => ({
        ...b,
        included: planAllowance(planId, b.id) > 0
    })),
    superLike: { cost: SUPER_LIKE_COST, included: planAllowance(planId, 'superlike') > 0 }
});

export const boostMetrics = async () => {
    const active = await BoostModel.countActive();
    const likes = await SuperLikeModel.countAll();
    return { activeBoosts: active.n, superLikes: likes.n };
};