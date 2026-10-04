// API routes: profile endpoints
import express from 'express';
import { createProfile, getMyProfile, updateProfile, getDashboardMatches } from '../controllers/profileController.js';

const router = express.Router();

router.post('/', createProfile);
router.get('/', getMyProfile);
router.put('/', updateProfile);
router.get('/matches', getDashboardMatches);

export default router;
