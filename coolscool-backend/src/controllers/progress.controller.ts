/**
 * Progress Controller
 *
 * Handles user progress HTTP endpoints.
 * All endpoints require authentication.
 */

import { Request, Response, NextFunction } from 'express';
import * as progressService from '../services/progress.service.js';

// GET /progress - Get full user progress
export async function getUserProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const progress = await progressService.getUserProgress(userId);

    res.status(200).json({
      success: true,
      data: {
        progress: {
          userId: progress.user_id,
          totalXp: progress.total_xp,
          sessionsCompleted: progress.sessions_completed,
          topicsStarted: progress.topics_started,
          topicsTotal: progress.topics_total,
          topics: progress.topics.map(topic => ({
            topicId: topic.topic_id,
            topicName: topic.topic_name,
            proficiencyBand: topic.proficiency_band,
            bandLabel: topic.band_label,
            bandMessage: topic.band_message,
            conceptsStarted: topic.concepts_started,
            conceptsTotal: topic.concepts_total,
            xpEarned: topic.xp_earned,
            lastAttemptedAt: topic.last_attempted_at,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /progress/summary - Get dashboard summary
export async function getProgressSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const summary = await progressService.getProgressSummary(userId);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalXp: summary.total_xp,
          sessionsCompleted: summary.sessions_completed,
          topicsStarted: summary.topics_started,
          topicsTotal: summary.topics_total,
          proficiencyBreakdown: summary.proficiency_breakdown,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /progress/topics/:topicId - Get single topic progress
export async function getTopicProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const topicId = req.params.topicId as string;

    const progress = await progressService.getTopicProgress(userId, topicId);

    if (!progress) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        progress: {
          topicId: progress.topic_id,
          topicName: progress.topic_name,
          proficiencyBand: progress.proficiency_band,
          bandLabel: progress.band_label,
          bandMessage: progress.band_message,
          conceptsStarted: progress.concepts_started,
          conceptsTotal: progress.concepts_total,
          xpEarned: progress.xp_earned,
          lastAttemptedAt: progress.last_attempted_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /progress/export - Export progress as JSON
export async function exportProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const exportData = await progressService.exportProgress(userId);

    res.status(200).json({
      success: true,
      data: {
        export: exportData,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /progress/import - Import progress from JSON
export async function importProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { exportData, merge } = req.body;

    // Validate export data structure
    if (!exportData || !exportData.version || !exportData.concept_progress) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EXPORT_DATA',
          message: 'Invalid export data format',
        },
      });
      return;
    }

    const result = await progressService.importProgress(userId, exportData, merge);

    res.status(200).json({
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        message: `Imported ${result.imported} concept progress entries, skipped ${result.skipped}`,
      },
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /progress - Reset all progress
export async function resetProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { confirm } = req.body;

    // Require explicit confirmation
    if (confirm !== 'RESET_ALL_PROGRESS') {
      res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Must confirm with "RESET_ALL_PROGRESS" to reset all progress',
        },
      });
      return;
    }

    await progressService.resetProgress(userId);

    res.status(200).json({
      success: true,
      message: 'All progress has been reset',
    });
  } catch (error) {
    next(error);
  }
}
