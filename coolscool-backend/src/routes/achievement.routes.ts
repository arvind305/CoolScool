/**
 * Achievement Routes
 *
 * Achievement and level endpoints.
 * All routes require authentication.
 */

import { Router } from 'express';
import * as achievementController from '../controllers/achievement.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All achievement routes require authentication
router.use(authenticate);

// GET /achievements - Get all achievements with earned status
router.get('/', achievementController.getMyAchievements);

// GET /achievements/stats - Get achievement summary for dashboard
router.get('/stats', achievementController.getMyAchievementStats);

// GET /achievements/level - Get current level info
router.get('/level', achievementController.getLevelInfo);

export default router;
