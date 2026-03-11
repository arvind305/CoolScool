/**
 * Achievement Controller
 *
 * Handles achievement and level HTTP endpoints.
 * All endpoints require authentication.
 */

import { Request, Response, NextFunction } from 'express';
import * as achievementService from '../services/achievement.service.js';

// GET /achievements - Get all achievements with earned status
export async function getMyAchievements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const achievements = await achievementService.getUserAchievements(userId);

    res.status(200).json({
      success: true,
      data: { achievements },
    });
  } catch (error) {
    next(error);
  }
}

// GET /achievements/stats - Get achievement summary for dashboard
export async function getMyAchievementStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const stats = await achievementService.getAchievementStats(userId);

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
}

// GET /achievements/level - Get current level info
export async function getLevelInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const levelInfo = await achievementService.getLevelInfo(userId);

    res.status(200).json({
      success: true,
      data: { levelInfo },
    });
  } catch (error) {
    next(error);
  }
}
