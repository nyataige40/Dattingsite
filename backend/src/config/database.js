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
