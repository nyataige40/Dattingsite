// Auth controller: handles registration, login, and social login
import { registerUser, loginUser, socialLogin } from '../services/authService.js';

export const register = async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const result = await registerUser({ email, password, full_name });
        res.status(201).json({
            user: result.user,
            token: result.token,
            message: 'Registration successful'
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const result = await loginUser({ email, password });
        res.json({
            user: result.user,
            token: result.token,
            message: 'Login successful'
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const socialAuth = async (req, res) => {
    try {
        const { email, full_name, provider, provider_id } = req.body;

        if (!email || !provider || !provider_id) {
            return res.status(400).json({ message: 'Email, provider, and provider_id are required' });
        }

        const result = await socialLogin({ email, full_name, provider, provider_id });
        res.json({
            user: result.user,
            token: result.token,
            message: `Login successful via ${provider}`
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const getMe = async (req, res) => {
    try {
        res.json({ user: req.user });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
