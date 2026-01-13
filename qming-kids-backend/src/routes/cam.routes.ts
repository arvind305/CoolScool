/**
 * CAM Routes
 *
 * Curriculum Authority Model read-only endpoints.
 * Authentication is optional to allow browsing.
 */

import { Router } from 'express';
import * as camController from '../controllers/cam.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = Router();

// Optional auth for all CAM routes (allows both authenticated and unauthenticated access)
router.use(optionalAuth);

// GET /cam - Get full curriculum structure
router.get(
  '/',
  camController.getFullCurriculum
);

// GET /cam/themes - List all themes
router.get(
  '/themes',
  camController.getThemes
);

// GET /cam/themes/:themeId - Get single theme with topics
router.get(
  '/themes/:themeId',
  validate(
    Joi.object({
      themeId: Joi.string().pattern(/^T\d{2}$/).required(),
    }),
    'params'
  ),
  camController.getTheme
);

// GET /cam/topics/:topicId - Get single topic with concepts
router.get(
  '/topics/:topicId',
  validate(
    Joi.object({
      topicId: Joi.string().pattern(/^T\d{2}\.\d{2}$/).required(),
    }),
    'params'
  ),
  camController.getTopic
);

export default router;
