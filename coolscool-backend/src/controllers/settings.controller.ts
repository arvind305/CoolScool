/**
 * Settings Controller
 *
 * Handles user settings HTTP endpoints.
 * All endpoints require authentication.
 */

import { Request, Response, NextFunction } from 'express';
import * as settingsService from '../services/settings.service.js';

// GET /settings - Get user settings
export async function getSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const settings = await settingsService.getUserSettings(userId);

    res.status(200).json({
      success: true,
      data: {
        settings: {
          theme: settings.theme,
          soundEnabled: settings.sound_enabled,
          preferredTimeMode: settings.preferred_time_mode,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// PUT /settings - Update user settings
export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { theme, soundEnabled, preferredTimeMode } = req.body;

    const settings = await settingsService.updateUserSettings(userId, {
      theme,
      sound_enabled: soundEnabled,
      preferred_time_mode: preferredTimeMode,
    });

    res.status(200).json({
      success: true,
      data: {
        settings: {
          theme: settings.theme,
          soundEnabled: settings.sound_enabled,
          preferredTimeMode: settings.preferred_time_mode,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
