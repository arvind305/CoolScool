/**
 * Flag Controller
 *
 * Handles question flag HTTP endpoints.
 * Submit flag is available to all authenticated users.
 * Admin routes handle flag review and statistics.
 */

import { Request, Response, NextFunction } from 'express';
import * as flagService from '../services/flag.service.js';

// POST /flags - Submit a flag (any authenticated user)
export async function submitFlag(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { questionId, curriculumId, flagReason, userComment } = req.body;

    const flag = await flagService.createFlag(userId, {
      questionId,
      curriculumId,
      flagReason,
      userComment,
    });

    res.status(201).json({
      success: true,
      data: { flag },
    });
  } catch (error) {
    next(error);
  }
}

// GET /flags - List flags (admin only)
export async function getFlags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status, reason, limit, offset } = req.query;

    const result = await flagService.getFlags({
      status: status as string | undefined,
      reason: reason as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        flags: result.flags,
        total: result.total,
        limit: limit ? Number(limit) : 20,
        offset: offset ? Number(offset) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /flags/:flagId - Update a flag (admin only)
export async function updateFlag(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminUserId = req.user!.id;
    const flagId = req.params.flagId as string;
    const { status, adminNotes } = req.body;

    const flag = await flagService.updateFlag(flagId, adminUserId, {
      status,
      adminNotes,
    });

    res.status(200).json({
      success: true,
      data: { flag },
    });
  } catch (error) {
    next(error);
  }
}

// GET /flags/stats - Get flag statistics (admin only)
export async function getFlagStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await flagService.getFlagStats();

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
}
