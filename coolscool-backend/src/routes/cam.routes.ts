/**
 * CAM Routes
 *
 * Curriculum Authority Model read-only endpoints.
 * Authentication is optional to allow browsing.
 *
 * Routes are available in two forms:
 * 1. /curricula/:curriculumId/cam/* - Explicit curriculum (recommended)
 * 2. /cam/* - Uses default curriculum (backwards compatibility)
 */

import { Router } from 'express';
import * as camController from '../controllers/cam.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = Router();

// Optional auth for all CAM routes
router.use(optionalAuth);

// Validation schemas
const themeIdSchema = Joi.object({
  themeId: Joi.string().pattern(/^T\d{2}$/).required(),
});

const topicIdSchema = Joi.object({
  topicId: Joi.string().pattern(/^T\d{2}\.\d{2}$/).required(),
});

// ============================================
// BACKWARDS COMPATIBLE ROUTES (use default curriculum)
// These routes are deprecated but maintained for compatibility
// ============================================

// GET /cam - Get full curriculum structure (default curriculum)
router.get(
  '/',
  camController.getFullCurriculum
);

// GET /cam/themes - List all themes (default curriculum)
router.get(
  '/themes',
  camController.getThemes
);

// GET /cam/themes/:themeId - Get single theme with topics (default curriculum)
router.get(
  '/themes/:themeId',
  validate(themeIdSchema, 'params'),
  camController.getTheme
);

// GET /cam/topics/:topicId - Get single topic with concepts (default curriculum)
router.get(
  '/topics/:topicId',
  validate(topicIdSchema, 'params'),
  camController.getTopic
);

export default router;

// ============================================
// CURRICULUM-SCOPED ROUTES (exported for use in curriculum routes)
// These are mounted under /curricula/:curriculumId
// ============================================

export const curriculumScopedCamRouter = Router({ mergeParams: true });

// GET /curricula/:curriculumId/cam - Get full curriculum structure
curriculumScopedCamRouter.get(
  '/cam',
  optionalAuth,
  camController.getFullCurriculum
);

// GET /curricula/:curriculumId/themes - List all themes
curriculumScopedCamRouter.get(
  '/themes',
  optionalAuth,
  camController.getThemes
);

// GET /curricula/:curriculumId/themes/:themeId - Get single theme with topics
curriculumScopedCamRouter.get(
  '/themes/:themeId',
  optionalAuth,
  validate(themeIdSchema, 'params'),
  camController.getTheme
);

// GET /curricula/:curriculumId/topics/:topicId - Get single topic with concepts
curriculumScopedCamRouter.get(
  '/topics/:topicId',
  optionalAuth,
  validate(topicIdSchema, 'params'),
  camController.getTopic
);
