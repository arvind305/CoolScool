/**
 * Progress Routes
 *
 * User progress management endpoints.
 * All routes require authentication.
 */

import { Router } from 'express';
import * as progressController from '../controllers/progress.controller.js';
import { authenticate } from '../middleware/auth.js';
import { exportLimiter } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validate.js';
import Joi from 'joi';

const router = Router();

// All progress routes require authentication
router.use(authenticate);

// GET /progress - Get full user progress
router.get(
  '/',
  progressController.getUserProgress
);

// GET /progress/summary - Get dashboard summary
router.get(
  '/summary',
  progressController.getProgressSummary
);

// GET /progress/topics/:topicId - Get single topic progress
router.get(
  '/topics/:topicId',
  validate(
    Joi.object({
      topicId: Joi.string().pattern(/^T\d{2}\.\d{2}$/).required(),
    }),
    'params'
  ),
  progressController.getTopicProgress
);

// POST /progress/export - Export progress as JSON
router.post(
  '/export',
  exportLimiter,
  progressController.exportProgress
);

// POST /progress/import - Import progress from JSON
router.post(
  '/import',
  exportLimiter,
  validate(schemas.importProgress),
  progressController.importProgress
);

// DELETE /progress - Reset all progress (requires confirmation)
router.delete(
  '/',
  validate(schemas.resetProgress),
  progressController.resetProgress
);

export default router;
