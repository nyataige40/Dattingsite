// API routes: catalogue and monetization endpoints
import express from 'express';
import { getCatalogue, unlockPartner, addFunds, getTransactions } from '../controllers/catalogueController.js';

const router = express.Router();

router.get('/', getCatalogue);
router.post('/unlock', unlockPartner);
router.post('/add-funds', addFunds);
router.get('/transactions', getTransactions);

export default router;
