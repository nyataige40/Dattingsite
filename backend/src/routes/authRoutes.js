// API routes: authentication endpoints
import express from 'express';
import { register, login, socialAuth, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/social', socialAuth);
router.get('/me', authenticate, getMe);

export default router;
