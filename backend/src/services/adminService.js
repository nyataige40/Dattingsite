// Admin service: analytics, moderation queue, support tickets, audit trail
import {
    AnalyticsModel, ModerationModel, TicketModel, AdminAuditModel,
    SubscriptionModel, BoostModel, SuperLikeModel, runQuery, getDb, transaction
} from '../models/index.js';
import { subscriptionMetrics } from './subscriptionService.js';
import { boostMetrics } from './boostService.js';

export const getAnalytics = async () => {
    const [overview, revenueByDay, revenueByTier, revenueByMethod, signups, subs, boosts, reportCounts, ticketCounts, audit] =
        await Promise.all([
            AnalyticsModel.overview(),
            AnalyticsModel.revenueByDay(14),
            AnalyticsModel.revenueByTier(),
            AnalyticsModel.revenueByMethod(),
            AnalyticsModel.signupSeries(14),
            subscriptionMetrics(),
            boostMetrics(),
            ModerationModel.countsByStatus(),
            TicketModel.countsByStatus(),
            AdminAuditModel.recent(12)
        ]);

    const unlocksByTier = revenueByTier.reduce((acc, r) => { acc[r.tier] = r.unlocks; return acc; }, {});

    return {
        overview: {
            ...overview,
            mrr: subs.mrr,
            activeSubscriptions: subs.active,
            activeBoosts: boosts.activeBoosts,
            superLikes: boosts.superLikes
        },
        revenue: {
            total: overview.grossRevenue,
            byDay: revenueByDay,
            byTier: revenueByTier,
            byMethod: revenueByMethod
        },
        subscriptions: {
            active: subs.active,
            mrr: subs.mrr,
            byPlan: subs.byPlan
        },
        engagement: {
            unlocks: overview.unlocks,
            unlocksByTier,
            superLikes: boosts.superLikes,
            activeBoosts: boosts.activeBoosts
        },
        growth: { signupsByDay: signups },
        operations: {
            reports: reportCounts.reduce((acc, r) => { acc[r.status] = r.n; return acc; }, {}),
            tickets: ticketCounts.reduce((acc, r) => { acc[r.status] = r.n; return acc; }, {}),
            audit
        }
    };
};

export const listReports = async ({ status, limit } = {}) => {
    const rows = await ModerationModel.list({ status, limit });
    return rows.map(r => ({
        id: r.id,
        subject_type: r.subject_type,
        subject_id: r.subject_id,
        reporter: r.reporter_name || 'Unknown',
        reason: r.reason,
        details: r.details,
        severity: r.severity,
        status: r.status,
        moderator_note: r.moderator_note,
        created_at: r.created_at,
        reviewed_at: r.reviewed_at
    }));
};

export const resolveReport = async (adminId, reportId, { status = 'resolved', note = '' }) => {
    const allowed = ['pending', 'reviewing', 'resolved', 'dismissed', 'actioned'];
    if (!allowed.includes(status)) {
        const err = new Error('Invalid report status');
        err.status = 400;
        throw err;
    }

    await ModerationModel.resolve(reportId, { status, moderator_note: note, reviewed_by: adminId });
    await AdminAuditModel.log({
        admin_id: adminId,
        action: `report.${status}`,
        entity: 'moderation_report',
        entity_id: reportId,
        meta: { note }
    });
    return { ok: true, message: `Report #${reportId} marked ${status}.` };
};

export const listTickets = async ({ status, limit } = {}) => {
    const rows = await TicketModel.list({ status, limit });
    return rows.map(t => ({
        id: t.id,
        user: t.user_name,
        email: t.email,
        category: t.category,
        subject: t.subject,
        body: t.body,
        priority: t.priority,
        status: t.status,
        created_at: t.created_at
    }));
};

export const setTicketStatus = async (adminId, ticketId, status) => {
    const allowed = ['open', 'pending', 'resolved', 'closed'];
    if (!allowed.includes(status)) {
        const err = new Error('Invalid ticket status');
        err.status = 400;
        throw err;
    }
    await TicketModel.updateStatus(ticketId, status);
    await AdminAuditModel.log({ admin_id: adminId, action: `ticket.${status}`, entity: 'support_ticket', entity_id: ticketId });
    return { ok: true, message: `Ticket #${ticketId} marked ${status}.` };
};

export const listSubscribers = async () => {
    const db = getDb();
    const rows = await runQuery(db,
        `SELECT s.*, u.full_name, u.email FROM subscriptions s JOIN users u ON u.id = s.user_id
         ORDER BY s.status ASC, s.id DESC LIMIT 100`,
        [], false
    );
    return rows.map(r => ({
        id: r.id,
        user: r.full_name,
        email: r.email,
        plan: r.plan,
        monthly_price: r.monthly_price,
        status: r.status,
        auto_renew: !!r.auto_renew,
        renews_at: r.renews_at,
        started_at: r.started_at
    }));
};

export const listTransactions = async ({ limit = 100 } = {}) => {
    const db = getDb();
    const rows = await runQuery(db,
        `SELECT t.*, u.full_name, u.email FROM transactions t JOIN users u ON u.id = t.user_id
         ORDER BY t.id DESC LIMIT ?`,
        [limit], false
    );
    return rows.map(r => ({
        id: r.id,
        user: r.full_name,
        email: r.email,
        amount: r.amount,
        method: r.payment_method,
        status: r.payment_status,
        description: r.description || (r.profile_id ? 'Profile unlock' : 'Payment'),
        ref: r.transaction_ref,
        at: r.created_at
    }));
};

/** Maintenance action used by the admin console to retire lapsed plans. */
export const runMaintenance = async (adminId) => {
    const subs = await SubscriptionModel.expireDue();
    await AdminAuditModel.log({ admin_id: adminId, action: 'maintenance.expire_subscriptions', meta: { expired: subs.changes } });
    return { expiredSubscriptions: subs.changes };
};

export const grantPlan = async (adminId, userId, planId) => {
    const res = await runQuery(getDb(),
        `UPDATE subscriptions SET plan = ?, monthly_price = ?, status = 'active' WHERE user_id = ?`,
        [planId, planId === 'gold' ? 34.99 : planId === 'plus' ? 14.99 : 0, userId], false);
    await AdminAuditModel.log({ admin_id: adminId, action: 'subscription.grant', entity: 'user', entity_id: userId, meta: { planId } });
    return { ok: res.changes > 0 };
};