// Data models with is_bot flags for seamless AI-to-human transition
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(process.env.DB_PATH || './database/app.db');

const getDb = () => {
    const db = new sqlite3.Database(dbPath);
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    return db;
};

// Helper: run a SQL operation and close the connection in the callback
const runQuery = (db, sql, params, single = false) => {
    return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
            if (single) {
                db.get(sql, params, (err, row) => { db.close(); if (err) reject(err); else resolve(row); });
            } else {
                db.all(sql, params, (err, rows) => { db.close(); if (err) reject(err); else resolve(rows); });
            }
        } else if (sql.trim().toUpperCase().startsWith('INSERT') || sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE') || sql.trim().toUpperCase().startsWith('CREATE')) {
            db.run(sql, params, function (err) {
                db.close();
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        } else {
            db.all(sql, params, (err, rows) => { db.close(); if (err) reject(err); else resolve(rows); });
        }
    });
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
        const db = getDb();
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.get(`SELECT balance FROM wallets WHERE user_id = ?`, [userId], (err, row) => {
                    if (err) {
                        db.close();
                        reject(err);
                    } else if (!row) {
                        db.close();
                        resolve({ success: false, message: 'Wallet not found' });
                    } else if (row.balance < amount) {
                        db.close();
                        resolve({ success: false, message: 'Insufficient balance' });
                    } else {
                        db.run(
                            `UPDATE wallets SET balance = balance - ? WHERE user_id = ?`,
                            [amount, userId],
                            (err) => {
                                db.close();
                                if (err) reject(err);
                                else resolve({ success: true, message: 'Balance deducted' });
                            }
                        );
                    }
                });
            });
        });
    },

    async addFunds(userId, amount) {
        const db = getDb();
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE wallets SET balance = balance + ? WHERE user_id = ?`,
                [amount, userId],
                function (err) {
                    db.close();
                    if (err) reject(err);
                    else resolve({ success: true, changes: this.changes });
                }
            );
        });
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
        return runQuery(db,
            `SELECT t.*, p.gender, p.tier, p.full_name as partner_name FROM transactions t JOIN profiles p ON t.profile_id = p.id WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT ?`,
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

export { getDb, runQuery };
