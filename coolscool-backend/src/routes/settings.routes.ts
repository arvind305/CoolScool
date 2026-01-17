/**
 * Settings Routes
 *
 * User settings management endpoints.
 * All routes require authentication.
 */

import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Validation schema for settings update
const updateSettingsSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'system').optional(),
  soundEnabled: Joi.boolean().optional(),
  preferredTimeMode: Joi.string().valid('unlimited', '10min', '5min', '3min').optional(),
});

// GET /settings - Get user settings
router.get('/', settingsController.getSettings);

// PUT /settings - Update user settings
router.put(
  '/',
  validate(updateSettingsSchema),
  settingsController.updateSettings
);

export default router;
