import express from 'express';
import {
    analytics, listReports, resolveReport, listTickets, updateTicket,
    listSubscribers, listTransactions, runMaintenance
} from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every admin route requires a valid token and the is_admin flag
router.use(authenticate, requireAdmin);

router.get('/analytics', analytics);

router.get('/reports', listReports);
router.put('/reports/:id', resolveReport);

router.get('/tickets', listTickets);
router.put('/tickets/:id', updateTicket);

router.get('/subscribers', listSubscribers);
router.get('/transactions', listTransactions);

router.post('/maintenance', runMaintenance);

export default router;