/**
 * Flag Routes
 *
 * Question flagging endpoints.
 * Submit flag is available to all authenticated users.
 * Admin routes handle flag review and statistics.
 */

import { Router } from 'express';
import * as flagController from '../controllers/flag.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { flagLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = Router();

// All flag routes require authentication
router.use(authenticate);

// Validation schemas
const submitFlagSchema = Joi.object({
  questionId: Joi.string().max(30).required().messages({
    'string.empty': 'Question ID is required',
    'any.required': 'Question ID is required',
  }),
  curriculumId: Joi.string().uuid().optional().messages({
    'string.guid': 'Curriculum ID must be a valid UUID',
  }),
  flagReason: Joi.string()
    .valid('incorrect_answer', 'unclear_question', 'wrong_grade', 'wrong_subject', 'typo', 'other')
    .required()
    .messages({
      'any.only': 'Flag reason must be one of: incorrect_answer, unclear_question, wrong_grade, wrong_subject, typo, other',
      'any.required': 'Flag reason is required',
    }),
  userComment: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Comment must be 1000 characters or fewer',
  }),
});

const updateFlagSchema = Joi.object({
  status: Joi.string()
    .valid('open', 'reviewed', 'fixed', 'dismissed')
    .optional()
    .messages({
      'any.only': 'Status must be one of: open, reviewed, fixed, dismissed',
    }),
  adminNotes: Joi.string().max(2000).optional().allow('').messages({
    'string.max': 'Admin notes must be 2000 characters or fewer',
  }),
});

// POST /flags - Submit a flag (any authenticated user)
router.post(
  '/',
  flagLimiter,
  validate(submitFlagSchema),
  flagController.submitFlag
);

// GET /flags/stats - Get flag statistics (admin only) - must be before /:flagId
router.get(
  '/stats',
  requireRole('admin'),
  flagController.getFlagStats
);

// GET /flags - List flags (admin only)
router.get(
  '/',
  requireRole('admin'),
  flagController.getFlags
);

// PATCH /flags/:flagId - Update a flag (admin only)
router.patch(
  '/:flagId',
  requireRole('admin'),
  validate(updateFlagSchema),
  flagController.updateFlag
);

export default router;
