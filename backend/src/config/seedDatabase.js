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
                is_admin INTEGER DEFAULT 0,
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
                description TEXT,
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

        // ----------------------------------------------------------
        // Layer 4 tables
        // ----------------------------------------------------------
        await run(`
            CREATE TABLE subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                plan TEXT NOT NULL,
                monthly_price REAL NOT NULL,
                started_at TEXT DEFAULT (datetime('now')),
                renews_at TEXT,
                payment_method TEXT DEFAULT 'stripe',
                auto_renew INTEGER DEFAULT 1,
                status TEXT DEFAULT 'active',
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE boosts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                profile_id INTEGER,
                boost_type TEXT NOT NULL,
                duration_hours INTEGER NOT NULL,
                cost REAL NOT NULL,
                started_at TEXT DEFAULT (datetime('now')),
                ends_at TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE super_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                target_profile_id INTEGER,
                cost REAL DEFAULT 0,
                direction TEXT DEFAULT 'outgoing',
                message TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(user_id, target_profile_id)
            )
        `);

        await run(`
            CREATE TABLE moderation_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_type TEXT NOT NULL,
                subject_id INTEGER,
                reporter_user_id INTEGER,
                reason TEXT NOT NULL,
                details TEXT,
                severity TEXT DEFAULT 'low',
                status TEXT DEFAULT 'pending',
                moderator_note TEXT,
                reviewed_by INTEGER,
                reviewed_at TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE user_blocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blocker_id INTEGER,
                blocked_id INTEGER,
                reason TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(blocker_id, blocked_id)
            )
        `);

        await run(`
            CREATE TABLE support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                category TEXT DEFAULT 'general',
                subject TEXT NOT NULL,
                body TEXT,
                priority TEXT DEFAULT 'normal',
                status TEXT DEFAULT 'open',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run(`
            CREATE TABLE admin_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                action TEXT NOT NULL,
                entity TEXT,
                entity_id INTEGER,
                meta TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await run('CREATE INDEX idx_subs_user ON subscriptions(user_id, status)');
        await run('CREATE INDEX idx_boosts_user ON boosts(user_id, status)');
        await run('CREATE INDEX idx_superlikes_target ON super_likes(target_profile_id)');
        await run('CREATE INDEX idx_reports_status ON moderation_reports(status)');
        await run('CREATE INDEX idx_tickets_status ON support_tickets(status)');
        await run('CREATE INDEX idx_blocks_pair ON user_blocks(blocker_id, blocked_id)');

        // Create indexes
        await run('CREATE INDEX idx_profiles_is_bot ON profiles(is_bot)');
        await run('CREATE INDEX idx_messages_is_bot ON messages(is_bot)');
        await run('CREATE INDEX idx_messages_conversation ON messages(conversation_id)');
        await run('CREATE INDEX idx_notifications_user_id ON notifications(user_id)');

        // Insert admin account
        const adminPassword = await bcrypt.hash('admin123', 12);
        const adminResult = await run(
            `INSERT INTO users (email, password_hash, full_name, is_verified, is_admin) VALUES (?, ?, ?, 1, 1)`,
            ['admin@dattingsite.com', adminPassword, 'Platform Admin']
        );
        const adminId = adminResult.id;

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

        // ----------------------------------------------------------
        // Layer 4 demo data: revenue history, subscriptions, ops queue
        // ----------------------------------------------------------
        const botIds = (await all(`SELECT id, tier FROM profiles WHERE is_bot = 1`)).map(r => r.id);
        const priceFor = tier => ({ Standard: 9.99, Premium: 29.99, Elite: 99.99 }[tier] || 9.99);
        const methods = ['wallet', 'stripe', 'paypal'];

        // Spread unlock transactions over the past two weeks so charts have shape
        for (let day = 13; day >= 0; day--) {
            const count = (day * 7) % 4 + 1;
            for (let i = 0; i < count; i++) {
                const botId = botIds[(day * 3 + i) % botIds.length];
                const rows = await all(`SELECT tier FROM profiles WHERE id = ?`, botId);
                const tier = rows[0]?.tier || 'Standard';
                await run(
                    `INSERT INTO transactions (user_id, profile_id, amount, currency, payment_method, payment_status, transaction_ref, description, created_at)
                     VALUES (?, ?, ?, 'USD', ?, 'completed', ?, 'Profile unlock', datetime('now', ?))`,
                    [
                        userId, botId, priceFor(tier),
                        methods[(day + i) % methods.length],
                        `seed_${day}_${i}_${Date.now().toString(36)}`,
                        `-${day} days`
                    ]
                );
            }
        }

        // Demo user is on the Plus plan
        await run(
            `INSERT INTO subscriptions (user_id, plan, monthly_price, renews_at, payment_method, auto_renew, status)
             VALUES (?, 'plus', 14.99, datetime('now', '+30 days'), 'stripe', 1, 'active')`,
            [userId]
        );
        await run(
            `INSERT INTO transactions (user_id, profile_id, amount, currency, payment_method, payment_status, transaction_ref, description, created_at)
             VALUES (?, NULL, 14.99, 'USD', 'stripe', 'completed', ?, 'Plus subscription', datetime('now', '-12 days'))`,
            [userId, `SUB_PLUS_seed_${Date.now().toString(36)}`]
        );

        // An active boost and a spent super like
        const demoProfileRows = await all(`SELECT id FROM profiles WHERE user_id = ?`, userId);
        const demoProfileId = demoProfileRows[0]?.id;
        if (demoProfileId) {
            await run(
                `INSERT INTO boosts (user_id, profile_id, boost_type, duration_hours, cost, started_at, ends_at, status)
                 VALUES (?, ?, 'spotlight', 6, 0, datetime('now'), datetime('now', '+6 hours'), 'active')`,
                [userId, demoProfileId]
            );
        }
        if (botIds.length) {
            await run(
                `INSERT OR IGNORE INTO super_likes (user_id, target_profile_id, cost, direction, message, created_at)
                 VALUES (?, ?, 7.99, 'outgoing', 'Your taste in music is impeccable.', datetime('now', '-2 days'))`,
                [userId, botIds[1]]
            );
        }

        // Operations queue
        const reportRows = [
            ['profile', botIds[0], 'harassment', 'Message felt threatening and repetitive.', 'high', 'pending'],
            ['message', null, 'spam', 'Repeated promotional links across several chats.', 'medium', 'pending'],
            ['profile', botIds[3], 'fake_profile', 'Photos appear to be taken from another account.', 'medium', 'reviewing'],
            ['profile', botIds[5], 'inappropriate_media', 'Photo set included explicit content.', 'high', 'resolved'],
            ['message', null, 'scam', 'Asked me to send money for verification.', 'high', 'dismissed']
        ];
        for (let i = 0; i < reportRows.length; i++) {
            const [subjectType, subjectId, reason, details, severity, status] = reportRows[i];
            await run(
                `INSERT INTO moderation_reports (subject_type, subject_id, reporter_user_id, reason, details, severity, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`,
                [subjectType, subjectId || null, userId, reason, details, severity, status, `-${i * 2} days`]
            );
        }

        const ticketRows = [
            ['billing', 'I was charged but my subscription did not activate', 'Paid for Plus yesterday and it still shows Free.', 'high', 'open'],
            ['account', 'Cannot reset my password', 'The reset email never arrives.', 'normal', 'open'],
            ['billing', 'Refund request for a boost', 'Bought Spotlight by mistake, it was not useful.', 'normal', 'pending'],
            ['general', 'Feature suggestion: video prompts', 'Would love short video answers to prompts.', 'low', 'resolved']
        ];
        for (let i = 0; i < ticketRows.length; i++) {
            const [category, subject, body, priority, status] = ticketRows[i];
            await run(
                `INSERT INTO support_tickets (user_id, category, subject, body, priority, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
                [userId, category, subject, body, priority, status, `-${i * 3} days`]
            );
        }

        await run(
            `INSERT INTO admin_audit_log (admin_id, action, entity, entity_id, meta, created_at)
             VALUES (?, 'report.resolved', 'moderation_report', 4, '{"note":"Media removed"}', datetime('now', '-1 days'))`,
            [adminId]
        );

        const profileCount = await all('SELECT COUNT(*) as count FROM profiles');
        const userCount = await all('SELECT COUNT(*) as count FROM users');
        const txnCount = await all('SELECT COUNT(*) as count FROM transactions');
        console.log(`[Seed] ${profileCount[0].count} profiles created.`);
        console.log(`[Seed] ${userCount[0].count} users created.`);
        console.log(`[Seed] ${txnCount[0].count} transactions created.`);
        console.log('[Seed] Demo user: demo@example.com / password123');
        console.log('[Seed] Admin user: admin@dattingsite.com / admin123');
    } catch (err) {
        console.error('[Seed] Error:', err.message);
    } finally {
        db.close();
    }
};

seedDatabase();
