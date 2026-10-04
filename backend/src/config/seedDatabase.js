// Seed database with initial bot profiles and sample data
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(process.env.DB_PATH || './database/app.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Sample bot profiles for AI companions (all have is_bot=1)
const BOT_PROFILES = [
    // Female bots (for male users)
    { full_name: 'Sophia', gender: 'Woman', age: 28, bio: 'Adventure seeker and coffee enthusiast. I love exploring hidden cafes and finding the perfect hiking trails.', location: 'San Francisco, CA', interests: ['hiking', 'coffee', 'travel', 'yoga'], tier: 'Standard', bot_persona: 'female_ai_1', photo_url: 'https://i.pravatar.cc/300?img=1' },
    { full_name: 'Isabella', gender: 'Woman', age: 31, bio: 'Marketing professional by day, amateur chef by night. Always looking for authentic Italian cuisine and good wine.', location: 'New York, NY', interests: ['cooking', 'wine', 'reading', 'travel'], tier: 'Premium', bot_persona: 'female_ai_2', photo_url: 'https://i.pravatar.cc/300?img=2' },
    { full_name: 'Charlotte', gender: 'Woman', age: 26, bio: 'Creative director with a passion for art and music. I play the guitar and enjoy indie film festivals.', location: 'Los Angeles, CA', interests: ['music', 'art', 'film', 'guitar'], tier: 'Elite', bot_persona: 'female_ai_3', photo_url: 'https://i.pravatar.cc/300?img=5' },
    { full_name: 'Amelia', gender: 'Woman', age: 29, bio: 'Software engineer who loves sci-fi novels and board games. Weekend warrior and puzzle solver.', location: 'Seattle, WA', interests: ['technology', 'reading', 'board games', 'cycling'], tier: 'Premium', bot_persona: 'female_ai_4', photo_url: 'https://i.pravatar.cc/300?img=9' },
    { full_name: 'Mia', gender: 'Woman', age: 27, bio: 'Yoga instructor and wellness coach. Passionate about mindfulness and healthy living.', location: 'Miami, FL', interests: ['yoga', 'wellness', 'meditation', 'beach'], tier: 'Standard', bot_persona: 'female_ai_5', photo_url: 'https://i.pravatar.cc/300?img=10' },

    // Male bots (for female users)
    { full_name: 'Ethan', gender: 'Man', age: 30, bio: 'Tech entrepreneur with a love for photography and good food. Always chasing the perfect sunset shot.', location: 'San Francisco, CA', interests: ['technology', 'photography', 'food', 'travel'], tier: 'Premium', bot_persona: 'male_ai_1', photo_url: 'https://i.pravatar.cc/300?img=3' },
    { full_name: 'Liam', gender: 'Man', age: 28, bio: 'Fitness trainer and nutritionist. I believe in living a balanced lifestyle and helping others do the same.', location: 'Austin, TX', interests: ['fitness', 'nutrition', 'outdoors', 'music'], tier: 'Standard', bot_persona: 'male_ai_2', photo_url: 'https://i.pravatar.cc/300?img=4' },
    { full_name: 'Noah', gender: 'Man', age: 33, bio: 'Architect with an eye for design. I appreciate art, architecture, and meaningful conversations over whiskey.', location: 'Denver, CO', interests: ['architecture', 'art', 'whiskey', 'design'], tier: 'Elite', bot_persona: 'male_ai_3', photo_url: 'https://i.pravatar.cc/300?img=6' },
    { full_name: 'Lucas', gender: 'Man', age: 27, bio: 'Musician and music therapist. I play piano in a jazz band and believe music heals the soul.', location: 'Nashville, TN', interests: ['music', 'jazz', 'therapy', 'piano'], tier: 'Premium', bot_persona: 'male_ai_4', photo_url: 'https://i.pravatar.cc/300?img=7' },
    { full_name: 'Mason', gender: 'Man', age: 29, bio: 'Book publisher who reads everything from classics to sci-fi. Coffee snob and amateur astronomer.', location: 'Boston, MA', interests: ['reading', 'coffee', 'astronomy', 'writing'], tier: 'Standard', bot_persona: 'male_ai_5', photo_url: 'https://i.pravatar.cc/300?img=8' }
];

const seedDatabase = async () => {
    // Remove existing DB for fresh start
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    const db = new sqlite3.Database(dbPath);

    // Wrapper: promisify db.run, db.get, db.all for sequential execution
    const run = (sql, params = []) =>
        new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });

    const get = (sql, params = []) =>
        new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

    const all = (sql, params = []) =>
        new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

    try {
        // Create tables
        await run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                full_name TEXT NOT NULL,
                auth_provider TEXT DEFAULT 'email',
                auth_provider_id TEXT,
                is_verified INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                full_name TEXT,
                gender TEXT NOT NULL,
                age INTEGER NOT NULL,
                bio TEXT,
                location TEXT,
                interests TEXT,
                photo_url TEXT,
                tier TEXT DEFAULT 'Standard',
                is_bot INTEGER DEFAULT 0,
                bot_persona TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                balance REAL DEFAULT 50.00,
                currency TEXT DEFAULT 'USD',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                profile_id INTEGER,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                payment_method TEXT DEFAULT 'wallet',
                payment_status TEXT DEFAULT 'completed',
                transaction_ref TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE unlocked_partners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                profile_id INTEGER,
                unlocked_at TEXT DEFAULT (datetime('now')),
                UNIQUE(user_id, profile_id)
            )
        `);

        await run(`
            CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER,
                receiver_id INTEGER,
                content TEXT NOT NULL,
                is_bot INTEGER DEFAULT 0,
                conversation_id TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                is_read INTEGER DEFAULT 0
            )
        `);

        await run(`
            CREATE TABLE notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                profile_id INTEGER,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'interest',
                is_read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // Create indexes
        await run('CREATE INDEX idx_profiles_is_bot ON profiles(is_bot)');
        await run('CREATE INDEX idx_messages_is_bot ON messages(is_bot)');
        await run('CREATE INDEX idx_messages_conversation ON messages(conversation_id)');
        await run('CREATE INDEX idx_notifications_user_id ON notifications(user_id)');

        // Insert demo user (compute hash BEFORE inserting)
        const hashedPassword = await bcrypt.hash('password123', 12);
        const userResult = await run(
            `INSERT INTO users (email, password_hash, full_name, is_verified) VALUES (?, ?, ?, 1)`,
            ['demo@example.com', hashedPassword, 'Demo User']
        );
        const userId = userResult.id;

        // Insert bot profiles (these have no user_id since they're bots)
        for (const profile of BOT_PROFILES) {
            await run(
                `INSERT INTO profiles (full_name, gender, age, bio, location, interests, photo_url, tier, is_bot, bot_persona) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
                [profile.full_name, profile.gender, profile.age, profile.bio, profile.location, JSON.stringify(profile.interests), profile.photo_url, profile.tier, profile.bot_persona]
            );
        }

        // Create demo user profile (Man by default) - uses the actual user ID
        await run(
            `INSERT INTO profiles (user_id, full_name, gender, age, bio, location, interests, photo_url, tier, is_bot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [userId, 'Demo User', 'Man', 30, 'Software developer who loves good food and travel.', 'San Francisco, CA', JSON.stringify(['food', 'travel', 'technology']), 'https://i.pravatar.cc/300?img=12', 'Standard']
        );

        await run(
            `INSERT INTO wallets (user_id, balance) VALUES (?, 50.00)`,
            [userId]
        );

        const profileCount = await all('SELECT COUNT(*) as count FROM profiles');
        const userCount = await all('SELECT COUNT(*) as count FROM users');
        console.log(`[Seed] ${profileCount[0].count} profiles created.`);
        console.log(`[Seed] ${userCount[0].count} users created.`);
        console.log('[Seed] Demo user: demo@example.com / password123');
    } catch (err) {
        console.error('[Seed] Error:', err.message);
    } finally {
        db.close();
    }
};

seedDatabase();
