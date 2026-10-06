// Authentication middleware: verifies JWT tokens and protects routes
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { id: decoded.userId };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ message: 'Invalid token' });
    }
};

export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = { id: decoded.userId };
        } catch (err) {
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
};

/**
 * Requires a valid token AND the is_admin flag. The role is read from the
 * database on every request rather than trusted from the token, so a
 * demoted admin loses access immediately instead of at token expiry.
 */
export const requireAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ message: 'Account not found' });
        }
        if (!user.is_admin) {
            return res.status(403).json({ message: 'Administrator access required' });
        }
        req.user.isAdmin = true;
        next();
    } catch (err) {
        console.error('Admin auth error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
