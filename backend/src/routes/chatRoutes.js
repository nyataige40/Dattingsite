// API routes: chat endpoints
import express from 'express';
import { getConversation, sendMessage, getRecentConversations } from '../controllers/chatController.js';

const router = express.Router();

router.get('/conversations', getRecentConversations);
router.get('/conversation/:partnerId', getConversation);
router.post('/message/:partnerId', sendMessage);

export default router;
