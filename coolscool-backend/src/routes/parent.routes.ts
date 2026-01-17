/**
 * Parent Routes
 *
 * Parent-child management and monitoring endpoints.
 * All routes require authentication and parent role.
 */

import { Router } from 'express';
import * as parentController from '../controllers/parent.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import Joi from 'joi';

const router = Router();

// All parent routes require authentication and parent role
router.use(authenticate);
router.use(requireRole('parent', 'admin'));

// Validation schemas
const linkChildSchema = Joi.object({
  childEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Child email is required',
  }),
});

const childIdParam = Joi.object({
  childId: Joi.string().uuid().required(),
});

const paginationQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const activityQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  childId: Joi.string().uuid().optional(),
});

// GET /parent/children - List linked children
router.get('/children', parentController.getChildren);

// POST /parent/children - Link a child by email
router.post(
  '/children',
  validate(linkChildSchema),
  parentController.linkChild
);

// DELETE /parent/children/:childId - Unlink a child
router.delete(
  '/children/:childId',
  validate(childIdParam, 'params'),
  parentController.unlinkChild
);

// POST /parent/children/:childId/consent - Grant parental consent
router.post(
  '/children/:childId/consent',
  validate(childIdParam, 'params'),
  parentController.grantConsent
);

// DELETE /parent/children/:childId/consent - Revoke parental consent
router.delete(
  '/children/:childId/consent',
  validate(childIdParam, 'params'),
  parentController.revokeConsent
);

// GET /parent/children/:childId/progress - Get child's full progress
router.get(
  '/children/:childId/progress',
  validate(childIdParam, 'params'),
  parentController.getChildProgress
);

// GET /parent/children/:childId/sessions - Get child's session history
router.get(
  '/children/:childId/sessions',
  validate(childIdParam, 'params'),
  validate(paginationQuery, 'query'),
  parentController.getChildSessions
);

// GET /parent/activity - Get activity feed
router.get(
  '/activity',
  validate(activityQuery, 'query'),
  parentController.getActivity
);

export default router;
