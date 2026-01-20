/**
 * Curriculum Routes
 *
 * Endpoints for browsing available curricula.
 * Authentication is optional to allow browsing.
 *
 * Also mounts curriculum-scoped CAM routes under /curricula/:curriculumId/*
 */

import { Router } from 'express';
import * as curriculumController from '../controllers/curriculum.controller.js';
import { curriculumScopedCamRouter } from './cam.routes.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = Router();

// Optional auth for all curriculum routes (allows both authenticated and unauthenticated access)
router.use(optionalAuth);

// UUID validation schema
const uuidSchema = Joi.object({
  curriculumId: Joi.string().uuid().required(),
});

// GET /curricula/overview - Get all curricula with content counts
// Note: This route must be before /:curriculumId to avoid conflicts
router.get(
  '/overview',
  curriculumController.getAllCurriculaOverview
);

// GET /curricula - List all active curricula
router.get(
  '/',
  curriculumController.listCurricula
);

// GET /curricula/:curriculumId - Get single curriculum details
router.get(
  '/:curriculumId',
  validate(uuidSchema, 'params'),
  curriculumController.getCurriculum
);

// GET /curricula/:curriculumId/overview - Get curriculum with content counts
router.get(
  '/:curriculumId/overview',
  validate(uuidSchema, 'params'),
  curriculumController.getCurriculumOverview
);

// Mount curriculum-scoped CAM routes
// These provide routes like:
// - GET /curricula/:curriculumId/cam
// - GET /curricula/:curriculumId/themes
// - GET /curricula/:curriculumId/themes/:themeId
// - GET /curricula/:curriculumId/topics/:topicId
router.use('/:curriculumId', curriculumScopedCamRouter);

export default router;
