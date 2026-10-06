// SQLite database initialization for development
// Mirrors the PostgreSQL schema in database/schema.sql
// Uses is_bot flags to allow seamless transition from AI bots to real humans

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.resolve(process.env.DB_PATH || './database/app.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('Connected to SQLite database:', dbPath);
                resolve();
            }
        });
    });
};

export const getDb = () => {
    const db = new sqlite3.Database(dbPath);
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    return db;
};

export const createSchema = async () => {
    const db = getDb();

    const columnsOf = (table) => new Promise((resolve) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) return resolve([]);
            resolve((rows || []).map(r => r.name));
        });
    });

    // SQLite has no ADD COLUMN IF NOT EXISTS, so guard each migration.
    const addColumnIfMissing = async (table, column, definition) => {
        const cols = await columnsOf(table);
        if (!cols.length || cols.includes(column)) return false;
        await new Promise((resolve, reject) => {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
                if (err) reject(err); else resolve();
            });
        });
        return true;
    };

    if (await addColumnIfMissing('users', 'is_admin', 'INTEGER DEFAULT 0')) {
        console.log('[DB] Migration: users.is_admin added');
    }

    // Layer 4 records what each charge was for, so the billing history and the
    // admin payments tab can label rows beyond the raw reference code.
    if (await addColumnIfMissing('transactions', 'description', 'TEXT')) {
        console.log('[DB] Migration: transactions.description added');
    }

    if (await addColumnIfMissing('subscriptions', 'updated_at', "TEXT DEFAULT (datetime('now'))")) {
        console.log('[DB] Migration: subscriptions.updated_at added');
    }

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    email           TEXT UNIQUE NOT NULL,
                    password_hash   TEXT,
                    full_name       TEXT NOT NULL,
                    auth_provider   TEXT DEFAULT 'email',
                    auth_provider_id TEXT,
                    is_verified     INTEGER DEFAULT 0,
                    created_at      TEXT DEFAULT (datetime('now')),
                    updated_at      TEXT DEFAULT (datetime('now'))
                )
            `);

            // Profiles table with is_bot flag
            db.run(`
                CREATE TABLE IF NOT EXISTS profiles (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    full_name       TEXT,
                    gender          TEXT NOT NULL,
                    age             INTEGER NOT NULL,
                    bio             TEXT,
                    location        TEXT,
                    interests       TEXT,
                    photo_url       TEXT,
                    tier            TEXT DEFAULT 'Standard',
                    is_bot          INTEGER DEFAULT 0,
                    bot_persona     TEXT,
                    is_active       INTEGER DEFAULT 1,
                    created_at      TEXT DEFAULT (datetime('now')),
                    updated_at      TEXT DEFAULT (datetime('now'))
                )
            `);

            // Wallets table
            db.run(`
                CREATE TABLE IF NOT EXISTS wallets (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    balance         REAL DEFAULT 50.00,
                    currency        TEXT DEFAULT 'USD',
                    created_at      TEXT DEFAULT (datetime('now')),
                    updated_at      TEXT DEFAULT (datetime('now'))
                )
            `);

            // Transactions table
            db.run(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER REFERENCES users(id),
                    profile_id      INTEGER REFERENCES profiles(id),
                    amount          REAL NOT NULL,
                    currency        TEXT DEFAULT 'USD',
                    payment_method  TEXT DEFAULT 'wallet',
                    payment_status  TEXT DEFAULT 'completed',
                    transaction_ref TEXT,
                    description     TEXT,
                    created_at      TEXT DEFAULT (datetime('now'))
                )
            `);

            // Unlocked partners table
            db.run(`
                CREATE TABLE IF NOT EXISTS unlocked_partners (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER REFERENCES users(id),
                    profile_id      INTEGER REFERENCES profiles(id),
                    unlocked_at     TEXT DEFAULT (datetime('now')),
                    UNIQUE(user_id, profile_id)
                )
            `);

            // Messages table with is_bot flag
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id       INTEGER REFERENCES profiles(id),
                    receiver_id     INTEGER REFERENCES profiles(id),
                    content         TEXT NOT NULL,
                    is_bot          INTEGER DEFAULT 0,
                    conversation_id TEXT,
                    created_at      TEXT DEFAULT (datetime('now')),
                    is_read         INTEGER DEFAULT 0
                )
            `);

            // Notifications table
            db.run(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER REFERENCES users(id),
                    profile_id      INTEGER REFERENCES profiles(id),
                    message         TEXT NOT NULL,
                    type            TEXT DEFAULT 'interest',
                    is_read         INTEGER DEFAULT 0,
                    created_at      TEXT DEFAULT (datetime('now'))
                )
            `);

            db.run('CREATE INDEX IF NOT EXISTS idx_profiles_is_bot ON profiles(is_bot)');
            db.run('CREATE INDEX IF NOT EXISTS idx_messages_is_bot ON messages(is_bot)');
            db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');

            // ----------------------------------------------------------
            // Layer 4: business & management architecture
            // ----------------------------------------------------------

            // Recurring subscriptions (Free / Plus / Gold tier upgrades)
            db.run(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    plan            TEXT NOT NULL,
                    monthly_price   REAL NOT NULL,
                    started_at      TEXT DEFAULT (datetime('now')),
                    renews_at       TEXT,
                    payment_method  TEXT DEFAULT 'stripe',
                    auto_renew      INTEGER DEFAULT 1,
                    status          TEXT DEFAULT 'active',
                    updated_at      TEXT DEFAULT (datetime('now'))
                )
            `);

            // Temporary profile boosts
            db.run(`
                CREATE TABLE IF NOT EXISTS boosts (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    profile_id      INTEGER REFERENCES profiles(id),
                    boost_type      TEXT NOT NULL,
                    duration_hours  INTEGER NOT NULL,
                    cost            REAL NOT NULL,
                    started_at      TEXT DEFAULT (datetime('now')),
                    ends_at         TEXT NOT NULL,
                    status          TEXT DEFAULT 'active',
                    created_at      TEXT DEFAULT (datetime('now'))
                )
            `);

            // Priority like signal
            db.run(`
                CREATE TABLE IF NOT EXISTS super_likes (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    target_profile_id INTEGER REFERENCES profiles(id),
                    cost              REAL DEFAULT 0,
                    direction         TEXT DEFAULT 'outgoing',
                    message           TEXT,
                    created_at        TEXT DEFAULT (datetime('now')),
                    UNIQUE(user_id, target_profile_id)
                )
            `);

            // Moderation queue backing reports and block requests
            db.run(`
                CREATE TABLE IF NOT EXISTS moderation_reports (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    subject_type      TEXT NOT NULL,
                    subject_id        INTEGER,
                    reporter_user_id  INTEGER REFERENCES users(id),
                    reason            TEXT NOT NULL,
                    details           TEXT,
                    severity          TEXT DEFAULT 'low',
                    status            TEXT DEFAULT 'pending',
                    moderator_note    TEXT,
                    reviewed_by       INTEGER REFERENCES users(id),
                    reviewed_at       TEXT,
                    created_at        TEXT DEFAULT (datetime('now'))
                )
            `);

            // Blocked pairs, enforced by controllers before any chat access
            db.run(`
                CREATE TABLE IF NOT EXISTS user_blocks (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    blocker_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    blocked_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    reason        TEXT,
                    created_at    TEXT DEFAULT (datetime('now')),
                    UNIQUE(blocker_id, blocked_id)
                )
            `);

            // Customer support ticketing
            db.run(`
                CREATE TABLE IF NOT EXISTS support_tickets (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    category    TEXT DEFAULT 'general',
                    subject     TEXT NOT NULL,
                    body        TEXT,
                    priority    TEXT DEFAULT 'normal',
                    status      TEXT DEFAULT 'open',
                    created_at  TEXT DEFAULT (datetime('now')),
                    updated_at  TEXT DEFAULT (datetime('now'))
                )
            `);

            // Every admin action is recorded
            db.run(`
                CREATE TABLE IF NOT EXISTS admin_audit_log (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    admin_id    INTEGER REFERENCES users(id),
                    action      TEXT NOT NULL,
                    entity      TEXT,
                    entity_id   INTEGER,
                    meta        TEXT,
                    created_at  TEXT DEFAULT (datetime('now'))
                )
            `);

            db.run('CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id, status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_boosts_user ON boosts(user_id, status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_superlikes_target ON super_likes(target_profile_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_reports_status ON moderation_reports(status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_blocks_pair ON user_blocks(blocker_id, blocked_id)');
        });

        db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, rows) => {
            if (err) reject(err);
            else {
                console.log('Tables created:', rows.map(r => r.name).join(', '));
                db.close();
                resolve();
            }
        });
    });
};
