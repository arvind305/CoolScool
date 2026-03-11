/**
 * Daily Challenge Routes
 *
 * Daily challenge endpoints.
 * All routes require authentication.
 */

import { Router } from 'express';
import * as dailyChallengeController from '../controllers/daily-challenge.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All daily challenge routes require authentication
router.use(authenticate);

// GET /daily-challenge - Get today's challenge with user attempt status
router.get('/', dailyChallengeController.getTodayChallenge);

// POST /daily-challenge - Submit answer for today's challenge
router.post('/', dailyChallengeController.submitAnswer);

export default router;
