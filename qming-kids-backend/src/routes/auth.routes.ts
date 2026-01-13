import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();

// POST /auth/google - Authenticate with Google OAuth
router.post(
  '/google',
  authLimiter,
  validate(schemas.googleAuth),
  authController.googleAuth
);

// POST /auth/refresh - Refresh access token
router.post(
  '/refresh',
  authLimiter,
  authController.refreshToken
);

// POST /auth/logout - Logout current device
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// POST /auth/logout-all - Logout all devices
router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll
);

// GET /auth/me - Get current user
router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

export default router;
