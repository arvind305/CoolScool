/**
 * Session Routes
 *
 * Quiz session management endpoints.
 * All routes require authentication.
 */

import { Router } from 'express';
import * as sessionController from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.js';
import { quizLimiter } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();

// All session routes require authentication
router.use(authenticate);

// Apply quiz rate limiter to all session routes
router.use(quizLimiter);

// POST /sessions - Create a new quiz session
router.post(
  '/',
  validate(schemas.createSession),
  sessionController.createSession
);

// GET /sessions - List user's sessions
router.get(
  '/',
  validate(schemas.pagination, 'query'),
  sessionController.listSessions
);

// GET /sessions/:sessionId - Get session details
router.get(
  '/:sessionId',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.getSession
);

// POST /sessions/:sessionId/start - Start a session
router.post(
  '/:sessionId/start',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.startSession
);

// GET /sessions/:sessionId/question - Get current question
router.get(
  '/:sessionId/question',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.getCurrentQuestion
);

// POST /sessions/:sessionId/answer - Submit answer
router.post(
  '/:sessionId/answer',
  validate(schemas.sessionIdParam, 'params'),
  validate(schemas.submitAnswer),
  sessionController.submitAnswer
);

// POST /sessions/:sessionId/skip - Skip current question
router.post(
  '/:sessionId/skip',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.skipQuestion
);

// POST /sessions/:sessionId/pause - Pause session
router.post(
  '/:sessionId/pause',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.pauseSession
);

// POST /sessions/:sessionId/resume - Resume session
router.post(
  '/:sessionId/resume',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.resumeSession
);

// POST /sessions/:sessionId/end - End session
router.post(
  '/:sessionId/end',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.endSession
);

// GET /sessions/:sessionId/summary - Get session summary
router.get(
  '/:sessionId/summary',
  validate(schemas.sessionIdParam, 'params'),
  sessionController.getSessionSummary
);

export default router;
