// Main Express application
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { initDatabase, createSchema } from './config/database.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import catalogueRoutes from './routes/catalogueRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import monetizationRoutes from './routes/monetizationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Middleware
import { authenticate } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const rateLimit = (windowMs, max) => {
    const clients = new Map();
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!clients.has(clientId)) {
            clients.set(clientId, []);
        }

        const requests = clients.get(clientId).filter(time => time > windowStart);
        requests.push(now);
        clients.set(clientId, requests);

        if (requests.length > max) {
            return res.status(429).json({ message: 'Too many requests' });
        }

        next();
    };
};

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Static files for uploads
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'Dattingsite API', timestamp: new Date().toISOString() });
});

// API routes (with authentication where needed)
app.use('/api/auth', authRoutes);
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/catalogue', authenticate, catalogueRoutes);
app.use('/api/chat', authenticate, chatRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);

// Layer 4: monetization (subscriptions, boosts, super likes)
// Plans and pricing stay public so marketing pages can render them signed out;
// their per-route middleware still enforces auth where it matters.
app.use('/api/billing', monetizationRoutes);
// Layer 4: admin console (analytics, moderation, tickets)
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Start server
const startServer = async () => {
    try {
        await initDatabase();
        await createSchema();

        // Check if database needs seeding
        const db = new sqlite3.Database(process.env.DB_PATH || './database/app.db');

        const userCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                db.close();
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        if (userCount === 0) {
            console.log('Database is empty. Run: node src/config/seedDatabase.js');
        } else {
            console.log('[DB] Database ready, skipping seed');
        }

        app.listen(PORT, () => {
            console.log(`\n========================================`);
            console.log(`  Dattingsite Backend API`);
            console.log(`  Server running on http://localhost:${PORT}`);
            console.log(`  Health: http://localhost:${PORT}/health`);
            console.log(`  API Docs: http://localhost:${PORT}/api/`);
            console.log(`========================================\n`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
