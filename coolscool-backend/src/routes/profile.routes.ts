import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as profileController from '../controllers/profile.controller.js';

const router = Router();

// GET /profile - Get authenticated user's profile
router.get('/', authenticate, profileController.getProfile);

// PUT /profile - Update authenticated user's profile
router.put('/', authenticate, profileController.updateProfile);

export default router;
