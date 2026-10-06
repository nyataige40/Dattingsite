// Subscription service: recurring plans and tier upgrades
import { SubscriptionModel, TransactionModel, WalletModel, transaction, getDb, runQuery } from '../models/index.js';

export const PLANS = {
    free: {
        id: 'free',
        label: 'Free',
        price: 0,
        monthly: 0,
        perks: [
            'Unlimited profile views',
            '7 conversations per week',
            'Standard discovery ranking',
            'One active boost'
        ]
    },
    plus: {
        id: 'plus',
        label: 'Plus',
        price: 14.99,
        monthly: 14.99,
        popular: true,
        perks: [
            'Unlimited conversations',
            'See who liked you',
            'Advanced discovery filters',
            '5 profile boosts per month',
            'Super Likes included'
        ]
    },
    gold: {
        id: 'gold',
        label: 'Gold',
        price: 34.99,
        monthly: 34.99,
        perks: [
            'Everything in Plus',
            'Top-of-feed placement',
            'Unlimited profile boosts',
            'Priority support queue',
            'See who viewed your profile'
        ]
    }
};

export const PLAN_IDS = Object.keys(PLANS);

const addMonths = (iso, months) => {
    const d = new Date(iso);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

const renewsFromNow = () => addMonths(new Date().toISOString(), 1);

/**
 * Subscribe a user to a plan. When the wallet can cover the first month it is
 * debited and recorded as a transaction in the same transaction block, so a
 * failure cannot leave a charge without a subscription or vice versa.
 */
export const subscribe = async (userId, planId, { payment_method = 'wallet' } = {}) => {
    const plan = PLANS[planId];
    if (!plan) {
        const err = new Error('Unknown plan');
        err.status = 400;
        throw err;
    }

    if (planId === 'free') {
        await SubscriptionModel.cancel(userId).catch(() => {});
        return { ok: true, plan: plan.id, price: 0, message: 'Switched to the Free plan.' };
    }

    const existing = await SubscriptionModel.findByUserId(userId);
    if (existing && existing.plan === planId) {
        return { ok: true, plan: plan.id, price: 0, alreadySubscribed: true, message: `You are already on ${plan.label}.` };
    }

    let balanceAfter = null;

    if (payment_method === 'wallet') {
        const wallet = await WalletModel.findByUserId(userId);
        if (!wallet) {
            const err = new Error('Wallet not found');
            err.status = 404;
            throw err;
        }
        if (wallet.balance < plan.price) {
            const err = new Error(`Insufficient wallet balance. ${plan.label} costs $${plan.price.toFixed(2)}.`);
            err.status = 400;
            throw err;
        }
        balanceAfter = Math.round((wallet.balance - plan.price) * 100) / 100;
    }

    const startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const renewsAt = renewsFromNow();

    // One transaction: retire the old plan, charge the wallet and write the new
    // plan together. Splitting this up could cancel a plan the user never paid
    // to replace, or charge them for a plan that was never stored.
    const result = await transaction(async (tx) => {
        if (payment_method === 'wallet') {
            const row = await tx.get(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
            if (!row) {
                const err = new Error('Wallet not found');
                err.status = 404;
                throw err;
            }
            if (row.balance < plan.price) {
                const err = new Error('Insufficient wallet balance');
                err.status = 400;
                throw err;
            }
            await tx.run(`UPDATE wallets SET balance = ROUND(balance - ?, 2), updated_at = datetime('now') WHERE user_id = ?`, [plan.price, userId]);
        }

        await tx.run(`UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'`, [userId]);

        const created = await tx.run(
            `INSERT INTO subscriptions (user_id, plan, monthly_price, started_at, renews_at, payment_method, auto_renew, status) VALUES (?, ?, ?, ?, ?, ?, 1, 'active')`,
            [userId, plan.id, plan.price, startedAt, renewsAt, payment_method]
        );

        await tx.run(
            `INSERT INTO transactions (user_id, profile_id, amount, currency, payment_method, payment_status, transaction_ref, description)
             VALUES (?, NULL, ?, 'USD', ?, 'completed', ?, ?)`,
            [userId, plan.price, payment_method, `SUB_${plan.id.toUpperCase()}_${Date.now()}`, `${plan.label} subscription`]
        );

        return { id: created.id };
    });

    return {
        ok: true,
        plan: plan.id,
        price: plan.price,
        balance: balanceAfter,
        subscriptionId: result.id,
        message: `Subscribed to ${plan.label}. Renews next month.`
    };
};

export const cancelSubscription = async (userId) => {
    const active = await SubscriptionModel.findByUserId(userId);
    if (!active) {
        const err = new Error('No active subscription');
        err.status = 404;
        throw err;
    }
    const res = await SubscriptionModel.cancel(userId);
    return { ok: res.success, message: 'Subscription cancelled. You keep access until the period ends.' };
};

export const changePlan = async (userId, planId, options) => {
    const target = PLANS[planId];
    if (!target) {
        const err = new Error('Unknown plan');
        err.status = 400;
        throw err;
    }
    if (planId === 'free') return cancelSubscription(userId);

    const current = await SubscriptionModel.findByUserId(userId);
    if (current && current.plan === planId) {
        return { ok: true, plan: planId, price: 0, message: `Already on ${target.label}.` };
    }
    return subscribe(userId, planId, options);
};

export const currentPlanFor = async (userId) => {
    const sub = await SubscriptionModel.findAnyByUserId(userId);
    const isActive = !!sub && sub.status === 'active';

    // Only an active subscription grants its plan. Reporting the last plan for
    // a cancelled row would hand the user that plan's allowances forever, since
    // boosts and Super Likes read plan_id to decide what is free.
    const plan = isActive ? (PLANS[sub.plan] || PLANS.free) : PLANS.free;

    return {
        plan_id: plan.id,
        label: plan.label,
        price: plan.price,
        perks: plan.perks,
        status: isActive ? 'active' : (sub?.status || 'none'),
        renews_at: isActive ? sub.renews_at : null,
        auto_renew: isActive ? !!sub.auto_renew : false,
        started_at: isActive ? (sub?.started_at || null) : null,
        // Surfaced so a client can explain a lapsed plan it still has on file
        lapsed_plan: !isActive && sub ? sub.plan : null
    };
};

export const listPlans = () =>
    PLAN_IDS.map(id => ({ ...PLANS[id], price: PLANS[id].price, monthly_price: PLANS[id].monthly }));

/** Retire subscriptions whose renewal date passed with auto-renew disabled. */
export const runExpirySweep = async () => {
    const res = await SubscriptionModel.expireDue();
    return { expired: res.changes };
};

export const subscriptionMetrics = async () => {
    const byPlan = await SubscriptionModel.countByPlan();
    const active = await SubscriptionModel.countActive();
    const mrr = await SubscriptionModel.mrr();
    return {
        active: active.n,
        mrr: mrr.mrr,
        byPlan: byPlan.reduce((acc, row) => {
            acc[row.plan] = row.members;
            return acc;
        }, {})
    };
};