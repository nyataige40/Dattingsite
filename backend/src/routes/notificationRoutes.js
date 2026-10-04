// API routes: notification endpoints
import express from 'express';
import { getNotifications, markAsRead, triggerInterest } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.get('/trigger', triggerInterest);
router.put('/read', markAsRead);

export default router;
