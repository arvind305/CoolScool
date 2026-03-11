/**
 * Daily Challenge Controller
 *
 * Handles daily challenge HTTP endpoints.
 * All endpoints require authentication.
 */

import { Request, Response, NextFunction } from 'express';
import * as dailyChallengeService from '../services/daily-challenge.service.js';

// GET /daily-challenge - Get today's challenge with user status
export async function getTodayChallenge(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const status = await dailyChallengeService.getUserDailyChallengeStatus(userId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

// POST /daily-challenge - Submit answer for today's challenge
export async function submitAnswer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { answer } = req.body;

    if (!answer) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ANSWER_REQUIRED',
          message: 'Answer is required',
        },
      });
      return;
    }

    const result = await dailyChallengeService.submitDailyChallengeAnswer(userId, answer);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Already attempted')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_ATTEMPTED',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
}
