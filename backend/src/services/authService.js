// Authentication service: JWT-based with email/password and social login support
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/index.js';
import { WalletModel } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// The client routes on this flag, so it travels with every auth response.
// The server still re-reads is_admin from the database per admin request.
const publicUser = (user, extra = {}) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    is_admin: user.is_admin ? 1 : 0,
    ...extra
});

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password, hash) => {
    if (!hash) return false;
    return await bcrypt.compare(password, hash);
};

// Register new user with email/password
export const registerUser = async ({ email, password, full_name }) => {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
        throw new Error('User already exists with this email');
    }

    const password_hash = await hashPassword(password);
    const user = await UserModel.create({ email, password_hash, full_name });

    // Create wallet with starting balance
    await WalletModel.create(user.id, 50.00);

    const token = generateToken(user.id);
    return { user: publicUser(user), token };
};

// Login with email/password
export const loginUser = async ({ email, password }) => {
    const user = await UserModel.findByEmail(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
        throw new Error('Invalid email or password');
    }

    const token = generateToken(user.id);
    return { user: publicUser(user), token };
};

// Social login (Google / Facebook)
export const socialLogin = async ({ email, full_name, provider, provider_id }) => {
    let user = await UserModel.findByEmail(email);

    if (!user) {
        user = await UserModel.create({
            email,
            full_name,
            auth_provider: provider,
            auth_provider_id: provider_id,
            password_hash: null
        });
        await WalletModel.create(user.id, 50.00);
    } else if (!user.auth_provider_id) {
        user = await UserModel.create({
            email: `${provider}_${provider_id}@${provider}.com`,
            full_name,
            auth_provider: provider,
            auth_provider_id: provider_id,
            password_hash: null
        });
        await WalletModel.create(user.id, 50.00);
    }

    const token = generateToken(user.id);
    return { user: publicUser(user, { auth_provider: user.auth_provider }), token };
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
};
