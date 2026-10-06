// Data models with is_bot flags for seamless AI-to-human transition
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(process.env.DB_PATH || './database/app.db');

// A single shared connection is reused for every call. Opening (and closing) a
// connection per query cannot support multi-statement transactions, which the
// payment and subscription flows depend on for correctness.
let _db = null;

const getDb = () => {
    if (_db) return _db;
    _db = new sqlite3.Database(dbPath);
    _db.configure('busyTimeout', 5000);
    _db.run('PRAGMA journal_mode = WAL');
    _db.run('PRAGMA foreign_keys = ON');
    return _db;
};

export const closeDb = () => {
    if (_db) {
        const handle = _db;
        _db = null;
        handle.close();
    }
};

// Helper: run a SQL operation against the shared connection.
// The connection stays open; callers must not close it.
const runQuery = (db, sql, params = [], single = false) => {
    return new Promise((resolve, reject) => {
        const verb = sql.trim().split(/\s+/)[0].toUpperCase();

        if (verb === 'SELECT' || verb === 'PRAGMA' || verb === 'WITH') {
            if (single) {
                db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
            } else {
                db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
            }
            return;
        }

        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

// Transactions are chained so two concurrent callers never interleave their
// BEGIN/COMMIT blocks on the shared connection. sqlite3 queues statements per
// connection in order, which keeps the block contiguous.
let _txChain = Promise.resolve();

const transaction = (fn) => {
    const run = _txChain.then(() => new Promise((resolve, reject) => {
        const db = getDb();

        const handle = {
            get: (sql, params) => runQuery(db, sql, params, true),
            all: (sql, params) => runQuery(db, sql, params, false),
            run: (sql, params) => runQuery(db, sql, params, false)
        };

        db.run('BEGIN IMMEDIATE', (beginErr) => {
            if (beginErr) return reject(beginErr);

            Promise.resolve()
                .then(() => fn(handle))
                .then((result) => {
                    db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                            db.run('ROLLBACK', () => reject(commitErr));
                        } else {
                            resolve(result);
                        }
                    });
                })
                .catch((err) => {
                    db.run('ROLLBACK', () => reject(err));
                });
        });
    }));

    _txChain = run.then(() => undefined, () => undefined);
    return run;
};

// ============================================================
// User Model
// ============================================================
export const UserModel = {
    async create({ email, password_hash, full_name, auth_provider = 'email', auth_provider_id = null }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO users (email, password_hash, full_name, auth_provider, auth_provider_id, is_verified) VALUES (?, ?, ?, ?, ?, 1)`,
            [email, password_hash, full_name, auth_provider, auth_provider_id],
            false
        ).then(result => ({ id: result.id, email, full_name }));
    },

    async findByEmail(email) {
        const db = getDb();
        return runQuery(db, `SELECT * FROM users WHERE email = ?`, [email], true);
    },

    async findById(id) {
        const db = getDb();
        return runQuery(db, `SELECT * FROM users WHERE id = ?`, [id], true);
    },

    async findByAuthProvider(provider_id) {
        const db = getDb();
        return runQuery(db, `SELECT * FROM users WHERE auth_provider_id = ?`, [provider_id], true);
    }
};

// ============================================================
// Profile Model (with is_bot flag for AI-to-human transition)
// ============================================================
export const ProfileModel = {
    async create({ user_id, gender, age, bio, location, interests, photo_url, tier = 'Standard', is_bot = false, bot_persona = null, full_name = null }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO profiles (user_id, full_name, gender, age, bio, location, interests, photo_url, tier, is_bot, bot_persona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, full_name, gender, age, bio, location, JSON.stringify(interests || []), photo_url, tier, is_bot ? 1 : 0, bot_persona],
            false
        ).then(result => ({ id: result.id }));
    },

    async findByUserId(user_id) {
        const db = getDb();
        return runQuery(db, `SELECT * FROM profiles WHERE user_id = ?`, [user_id], true);
    },

    async findById(id) {
        const db = getDb();
        return runQuery(db, `SELECT * FROM profiles WHERE id = ?`, [id], true);
    },

    async findByGenderAndTier(gender, limit = 50) {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM profiles WHERE gender = ? AND is_active = 1 ORDER BY is_bot DESC, tier DESC LIMIT ?`,
            [gender, limit],
            false
        );
    },

    async findBotsByGenderAndTier(gender, tier) {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM profiles WHERE gender = ? AND tier = ? AND is_bot = 1 AND is_active = 1 ORDER BY created_at DESC LIMIT 50`,
            [gender, tier],
            false
        );
    },

    async findPotentialMatches(userId) {
        const db = getDb();
        return runQuery(db,
            `
            SELECT p.*, u.full_name, u.email
            FROM profiles p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id != ? AND p.is_active = 1
            ORDER BY p.is_bot DESC, p.tier DESC
            LIMIT 12
            `,
            [userId],
            false
        );
    },

    async updateFields(userId, patch) {
        const allowed = ['bio', 'location', 'interests', 'photo_url', 'full_name', 'gender', 'age', 'tier'];
        const fields = [];
        const values = [];

        for (const key of allowed) {
            if (patch[key] === undefined) continue;
            fields.push(`${key} = ?`);
            values.push(key === 'interests' ? JSON.stringify(patch[key] || []) : patch[key]);
        }

        if (fields.length === 0) return { success: false, message: 'Nothing to update' };

        values.push(userId);
        const db = getDb();
        return runQuery(db,
            `UPDATE profiles SET ${fields.join(', ')}, updated_at = datetime('now') WHERE user_id = ?`,
            values,
            false
        ).then(r => ({ success: r.changes > 0, changes: r.changes }));
    }
};

// ============================================================
// Wallet Model
// ============================================================
export const WalletModel = {
    async create(userId, initialBalance = 50.00) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO wallets (user_id, balance) VALUES (?, ?)`,
            [userId, initialBalance],
            false
        ).then(result => ({ id: result.id, balance: initialBalance }));
    },

    async findByUserId(userId) {
        const db = getDb();
        return runQuery(db, `SELECT * FROM wallets WHERE user_id = ?`, [userId], true);
    },

    async deduct(userId, amount) {
        // Read-then-write must be atomic or two concurrent unlocks can both
        // pass the balance check and overdraw the wallet.
        return transaction(async (tx) => {
            const row = await tx.get(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
            if (!row) return { success: false, message: 'Wallet not found' };
            if (row.balance < amount) return { success: false, message: 'Insufficient balance' };

            // ROUND guards against binary floating point drift accumulating in a
// stored money column (40 - 14.99 evaluates to 25.009999999999998).
await tx.run(`UPDATE wallets SET balance = ROUND(balance - ?, 2), updated_at = datetime('now') WHERE user_id = ?`, [amount, userId]);
            return { success: true, message: 'Balance deducted', balance: row.balance - amount };
        });
    },

    async addFunds(userId, amount) {
        const db = getDb();
        return runQuery(db,
            `UPDATE wallets SET balance = balance + ?, updated_at = datetime('now') WHERE user_id = ?`,
            [amount, userId],
            false
        ).then(r => ({ success: true, changes: r.changes }));
    }
};

// ============================================================
// Transaction Model
// ============================================================
export const TransactionModel = {
    async create({ user_id, profile_id, amount, currency = 'USD', payment_method = 'wallet', payment_status = 'completed', transaction_ref = null }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO transactions (user_id, profile_id, amount, currency, payment_method, payment_status, transaction_ref) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id, profile_id, amount, currency, payment_method, payment_status, transaction_ref],
            false
        ).then(result => ({ id: result.id }));
    },

    async getByUserId(userId, limit = 50) {
        const db = getDb();
        // LEFT JOIN, not INNER: subscriptions, boosts and Super Likes are billed
        // against the account rather than a profile, so their profile_id is NULL
        // and an inner join would hide them from the billing history.
        return runQuery(db,
            `SELECT t.*, p.gender, p.tier, p.full_name as partner_name FROM transactions t LEFT JOIN profiles p ON t.profile_id = p.id WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT ?`,
            [userId, limit],
            false
        );
    }
};

// ============================================================
// Unlocked Partners Model
// ============================================================
export const UnlockedPartnerModel = {
    async isUnlocked(userId, profileId) {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM unlocked_partners WHERE user_id = ? AND profile_id = ?`,
            [userId, profileId],
            true
        ).then(row => !!row);
    },

    async unlock(userId, profileId) {
        const db = getDb();
        return runQuery(db,
            `INSERT OR IGNORE INTO unlocked_partners (user_id, profile_id) VALUES (?, ?)`,
            [userId, profileId],
            false
        ).then(result => result.changes > 0);
    }
};

// ============================================================
// Message Model (with is_bot flag)
// ============================================================
export const MessageModel = {
    async create({ sender_id, receiver_id, content, is_bot = false, conversation_id }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO messages (sender_id, receiver_id, content, is_bot, conversation_id) VALUES (?, ?, ?, ?, ?)`,
            [sender_id, receiver_id, content, is_bot ? 1 : 0, conversation_id],
            false
        ).then(result => ({ id: result.id }));
    },

    async getConversation(profileA_id, profileB_id, limit = 100) {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC LIMIT ?`,
            [profileA_id, profileB_id, profileB_id, profileA_id, limit],
            false
        );
    },

    async getRecentMessages(profileId, limit = 20) {
        const db = getDb();
        return runQuery(db,
            `SELECT DISTINCT m.*, p.full_name, p.photo_url, p.is_bot FROM messages m JOIN profiles p ON (p.id = m.sender_id OR p.id = m.receiver_id) WHERE (m.sender_id = ? OR m.receiver_id = ?) AND p.id != ? ORDER BY m.created_at DESC LIMIT ?`,
            [profileId, profileId, profileId, limit],
            false
        );
    }
};

// ============================================================
// Notification Model
// ============================================================
export const NotificationModel = {
    async create({ user_id, profile_id, message, type = 'interest' }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO notifications (user_id, profile_id, message, type) VALUES (?, ?, ?, ?)`,
            [user_id, profile_id, message, type],
            false
        ).then(result => ({ id: result.id }));
    },

    async getUnreadByUserId(userId, limit = 20) {
        const db = getDb();
        return runQuery(db,
            `SELECT n.*, p.full_name, p.photo_url, p.tier FROM notifications n JOIN profiles p ON n.profile_id = p.id WHERE n.user_id = ? AND n.is_read = 0 ORDER BY n.created_at DESC LIMIT ?`,
            [userId, limit],
            false
        );
    },

    async getAllByUserId(userId, limit = 50) {
        const db = getDb();
        return runQuery(db,
            `SELECT n.*, p.full_name, p.photo_url, p.tier FROM notifications n JOIN profiles p ON n.profile_id = p.id WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`,
            [userId, limit],
            false
        );
    },

    async markAllRead(userId) {
        const db = getDb();
        return runQuery(db,
            `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
            [userId],
            false
        ).then(result => result.changes);
    }
};

// ============================================================
// Subscription Model (Layer 4: recurring plans + tier upgrades)
// ============================================================
export const SubscriptionModel = {
    async findByUserId(userId) {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1`,
            [userId],
            true
        );
    },

    async findAnyByUserId(userId) {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
            [userId],
            true
        );
    },

    async create({ user_id, plan, monthly_price, started_at, renews_at, payment_method = 'stripe', auto_renew = 1, status = 'active' }) {
        const db = getDb();
        return transaction(async (tx) => {
            await tx.run(`UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'`, [user_id]);
            const res = await tx.run(
                `INSERT INTO subscriptions (user_id, plan, monthly_price, started_at, renews_at, payment_method, auto_renew, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [user_id, plan, monthly_price, started_at, renews_at, payment_method, auto_renew, status]
            );
            return { id: res.id };
        });
    },

    async cancel(userId) {
        const db = getDb();
        return runQuery(db,
            `UPDATE subscriptions SET status = 'cancelled', auto_renew = 0, updated_at = datetime('now') WHERE user_id = ? AND status = 'active'`,
            [userId],
            false
        ).then(r => ({ success: r.changes > 0, changes: r.changes }));
    },

    async countByPlan() {
        const db = getDb();
        return runQuery(db,
            `SELECT plan, COUNT(*) as members FROM subscriptions WHERE status = 'active' GROUP BY plan`,
            [],
            false
        );
    },

    async countActive() {
        const db = getDb();
        return runQuery(db, `SELECT COUNT(*) as n FROM subscriptions WHERE status = 'active'`, [], true);
    },

    async mrr() {
        const db = getDb();
        return runQuery(db,
            `SELECT COALESCE(SUM(monthly_price), 0) as mrr FROM subscriptions WHERE status = 'active'`,
            [],
            true
        );
    },

    // Subscriptions that have passed their renewal date and are not auto-renewing
    async findExpired() {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM subscriptions WHERE status = 'active' AND auto_renew = 0 AND renews_at < datetime('now')`,
            [],
            false
        );
    },

    async expireDue() {
        const db = getDb();
        return runQuery(db,
            `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE status = 'active' AND auto_renew = 0 AND renews_at < datetime('now')`,
            [],
            false
        ).then(r => ({ changes: r.changes }));
    }
};

// ============================================================
// Boost Model (profile boost: temporary discovery boost)
// ============================================================
export const BoostModel = {
    async create({ user_id, profile_id, boost_type, duration_hours, cost, started_at, ends_at }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO boosts (user_id, profile_id, boost_type, duration_hours, cost, started_at, ends_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [user_id, profile_id, boost_type, duration_hours, cost, started_at, ends_at],
            false
        ).then(r => ({ id: r.id }));
    },

    async activeForUser(userId) {
        const db = getDb();
        return runQuery(db,
            `SELECT b.*, p.full_name, p.photo_url FROM boosts b LEFT JOIN profiles p ON p.id = b.profile_id
             WHERE b.user_id = ? AND b.status = 'active' AND b.ends_at > datetime('now')
             ORDER BY b.ends_at DESC`,
            [userId],
            false
        );
    },

    async historyByUser(userId, limit = 25) {
        const db = getDb();
        return runQuery(db,
            `SELECT * FROM boosts WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
            [userId, limit],
            false
        );
    },

    async countActive() {
        const db = getDb();
        return runQuery(db,
            `SELECT COUNT(*) as n FROM boosts WHERE status = 'active' AND ends_at > datetime('now')`,
            [],
            true
        );
    }
};

// ============================================================
// SuperLike Model (priority like signal)
// ============================================================
export const SuperLikeModel = {
    async create({ user_id, target_profile_id, cost, direction = 'outgoing', message = null }) {
        const db = getDb();
        return transaction(async (tx) => {
            const existing = await tx.get(
                `SELECT id FROM super_likes WHERE user_id = ? AND target_profile_id = ?`,
                [user_id, target_profile_id]
            );
            if (existing) return { duplicate: true, id: existing.id };

            const res = await tx.run(
                `INSERT INTO super_likes (user_id, target_profile_id, cost, direction, message) VALUES (?, ?, ?, ?, ?)`,
                [user_id, target_profile_id, cost, direction, message]
            );
            return { duplicate: false, id: res.id };
        });
    },

    async receivedByUser(userId, limit = 25) {
        const db = getDb();
        return runQuery(db,
            `SELECT s.*, p.full_name, p.photo_url, p.tier, p.age, p.gender FROM super_likes s JOIN profiles p ON p.id = s.user_id
             WHERE s.target_profile_id = (SELECT id FROM profiles WHERE user_id = ?) ORDER BY s.id DESC LIMIT ?`,
            [userId, limit],
            false
        );
    },

    async sentByUser(userId, limit = 50) {
        const db = getDb();
        return runQuery(db,
            `SELECT s.*, p.full_name, p.photo_url, p.tier FROM super_likes s JOIN profiles p ON p.id = s.target_profile_id
             WHERE s.user_id = ? ORDER BY s.id DESC LIMIT ?`,
            [userId, limit],
            false
        );
    },

    async countAll() {
        const db = getDb();
        return runQuery(db, `SELECT COUNT(*) as n FROM super_likes`, [], true);
    }
};

// ============================================================
// Moderation Model (Layer 3 groundwork, surfaced through admin)
// ============================================================
export const ModerationModel = {
    async create({ subject_type, subject_id, reporter_user_id, reason, details = null, severity = 'low', status = 'pending' }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO moderation_reports (subject_type, subject_id, reporter_user_id, reason, details, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [subject_type, subject_id, reporter_user_id, reason, details, severity, status],
            false
        ).then(r => ({ id: r.id }));
    },

    async list({ status = null, limit = 50 } = {}) {
        const db = getDb();
        if (status) {
            return runQuery(db,
                `SELECT m.*, u.full_name as reporter_name FROM moderation_reports m
                 LEFT JOIN users u ON u.id = m.reporter_user_id
                 WHERE m.status = ? ORDER BY m.id DESC LIMIT ?`,
                [status, limit], false
            );
        }
        return runQuery(db,
            `SELECT m.*, u.full_name as reporter_name FROM moderation_reports m
             LEFT JOIN users u ON u.id = m.reporter_user_id
             ORDER BY m.id DESC LIMIT ?`,
            [limit], false
        );
    },

    async resolve(id, { status, moderator_note, reviewed_by }) {
        const db = getDb();
        return runQuery(db,
            `UPDATE moderation_reports SET status = ?, moderator_note = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`,
            [status, moderator_note || null, reviewed_by || null, id],
            false
        ).then(r => ({ success: r.changes > 0 }));
    },

    async countsByStatus() {
        const db = getDb();
        return runQuery(db, `SELECT status, COUNT(*) as n FROM moderation_reports GROUP BY status`, [], false);
    }
};

// ============================================================
// Support Ticket Model
// ============================================================
export const TicketModel = {
    async create({ user_id, category, subject, body, priority = 'normal' }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO support_tickets (user_id, category, subject, body, priority, status) VALUES (?, ?, ?, ?, ?, 'open')`,
            [user_id, category, subject, body, priority],
            false
        ).then(r => ({ id: r.id }));
    },

    async list({ status = null, limit = 50 } = {}) {
        const db = getDb();
        if (status) {
            return runQuery(db,
                `SELECT t.*, u.full_name as user_name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id
                 WHERE t.status = ? ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.id DESC LIMIT ?`,
                [status, limit], false
            );
        }
        return runQuery(db,
            `SELECT t.*, u.full_name as user_name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id
             ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.id DESC LIMIT ?`,
            [limit], false
        );
    },

    async updateStatus(id, status) {
        const db = getDb();
        return runQuery(db, `UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id], false)
            .then(r => ({ success: r.changes > 0 }));
    },

    async countsByStatus() {
        const db = getDb();
        return runQuery(db, `SELECT status, COUNT(*) as n FROM support_tickets GROUP BY status`, [], false);
    }
};

// ============================================================
// Admin Audit Log
// ============================================================
export const AdminAuditModel = {
    async log({ admin_id, action, entity, entity_id, meta = null }) {
        const db = getDb();
        return runQuery(db,
            `INSERT INTO admin_audit_log (admin_id, action, entity, entity_id, meta) VALUES (?, ?, ?, ?, ?)`,
            [admin_id, action, entity, entity_id || null, meta ? JSON.stringify(meta) : null],
            false
        ).then(r => ({ id: r.id }));
    },

    async recent(limit = 25) {
        const db = getDb();
        return runQuery(db,
            `SELECT a.*, u.full_name as admin_name FROM admin_audit_log a
             LEFT JOIN users u ON u.id = a.admin_id ORDER BY a.id DESC LIMIT ?`,
            [limit], false
        );
    }
};

// ============================================================
// Analytics (aggregates for the admin dashboard)
// ============================================================
export const AnalyticsModel = {
    async overview() {
        const db = getDb();
        const one = (sql, ...params) => runQuery(db, sql, params, true);
        const [users, profiles, bots, humans, unlocks, txns, revenue, activeSubs, pendingReports, openTickets, avgAge] = await Promise.all([
            one(`SELECT COUNT(*) as n FROM users`),
            one(`SELECT COUNT(*) as n FROM profiles WHERE is_bot = 0`),
            one(`SELECT COUNT(*) as n FROM profiles WHERE is_bot = 1`),
            one(`SELECT COUNT(*) as n FROM users`),
            one(`SELECT COUNT(*) as n FROM unlocked_partners`),
            one(`SELECT COUNT(*) as n FROM transactions WHERE payment_status = 'completed'`),
            one(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE payment_status = 'completed'`),
            one(`SELECT COUNT(*) as n FROM subscriptions WHERE status = 'active'`),
            one(`SELECT COUNT(*) as n FROM moderation_reports WHERE status = 'pending'`),
            one(`SELECT COUNT(*) as n FROM support_tickets WHERE status = 'open'`),
            one(`SELECT COALESCE(AVG(age), 0) as avg_age FROM profiles WHERE is_bot = 0`)
        ]);
        return {
            users: users.n,
            humanProfiles: profiles.n,
            botProfiles: bots.n,
            accounts: humans.n,
            unlocks: unlocks.n,
            transactions: txns.n,
            grossRevenue: revenue.total,
            activeSubscriptions: activeSubs.n,
            pendingReports: pendingReports.n,
            openTickets: openTickets.n,
            averageAge: Math.round(avgAge.avg_age * 10) / 10
        };
    },

    async revenueByDay(days = 14) {
        const db = getDb();
        return runQuery(db,
            `SELECT date(created_at) as day,
                    COUNT(*) as transactions,
                    COALESCE(SUM(amount), 0) as revenue
             FROM transactions
             WHERE payment_status = 'completed' AND created_at >= datetime('now', ?)
             GROUP BY day ORDER BY day ASC`,
            [`-${days} days`],
            false
        );
    },

    async revenueByTier() {
        const db = getDb();
        return runQuery(db,
            `SELECT p.tier, COUNT(*) as unlocks, COALESCE(SUM(t.amount), 0) as revenue
             FROM transactions t JOIN profiles p ON p.id = t.profile_id
             WHERE t.payment_status = 'completed' GROUP BY p.tier ORDER BY revenue DESC`,
            [],
            false
        );
    },

    async revenueByMethod() {
        const db = getDb();
        return runQuery(db,
            `SELECT payment_method, COUNT(*) as transactions, COALESCE(SUM(amount), 0) as revenue
             FROM transactions WHERE payment_status = 'completed' GROUP BY payment_method ORDER BY revenue DESC`,
            [],
            false
        );
    },

    async signupSeries(days = 14) {
        const db = getDb();
        return runQuery(db,
            `SELECT date(created_at) as day, COUNT(*) as signups
             FROM users WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day ASC`,
            [`-${days} days`],
            false
        );
    }
};

export { getDb, runQuery, transaction };
