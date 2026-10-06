import express from 'express';
import {
    getSubscription, getPlans, createSubscription, updateSubscription, deleteSubscription,
    getBoosts, createBoost, getSuperLikes, createSuperLike, getPricing, sweepSubscriptions
} from '../controllers/monetizationController.js';
import { authenticate, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public pricing so the marketing pages can render plans before sign-in
router.get('/plans', getPlans);
router.get('/pricing', optionalAuth, getPricing);

// Subscriptions
router.get('/subscription', authenticate, getSubscription);
router.post('/subscription', authenticate, createSubscription);
router.put('/subscription', authenticate, updateSubscription);
router.delete('/subscription', authenticate, deleteSubscription);

// Profile boosts
router.get('/boosts', authenticate, getBoosts);
router.post('/boosts', authenticate, createBoost);

// Super Likes
router.get('/superlikes', authenticate, getSuperLikes);
router.post('/superlikes', authenticate, createSuperLike);

// Housekeeping
router.post('/maintenance/subscriptions', authenticate, sweepSubscriptions);

export default router;