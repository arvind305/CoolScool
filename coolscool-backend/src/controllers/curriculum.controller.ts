/**
 * Curriculum Controller
 *
 * Handles curriculum-related HTTP endpoints.
 * Authentication is optional for curriculum browsing.
 */

import { Request, Response, NextFunction } from 'express';
import * as CurriculumModel from '../models/curriculum.model.js';

/**
 * GET /curricula - List all active curricula
 */
export async function listCurricula(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const curricula = await CurriculumModel.findAll(!includeInactive);

    res.status(200).json({
      success: true,
      data: {
        curricula: curricula.map(c => ({
          id: c.id,
          board: c.board,
          classLevel: c.class_level,
          subject: c.subject,
          displayName: c.display_name,
          academicYear: c.academic_year,
          camVersion: c.cam_version,
          isActive: c.is_active,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /curricula/:curriculumId - Get single curriculum
 */
export async function getCurriculum(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const curriculumId = req.params.curriculumId as string;

    const curriculum = await CurriculumModel.findById(curriculumId);

    if (!curriculum) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CURRICULUM_NOT_FOUND',
          message: 'Curriculum not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        curriculum: {
          id: curriculum.id,
          board: curriculum.board,
          classLevel: curriculum.class_level,
          subject: curriculum.subject,
          displayName: curriculum.display_name,
          description: curriculum.description,
          academicYear: curriculum.academic_year,
          camVersion: curriculum.cam_version,
          isActive: curriculum.is_active,
          createdAt: curriculum.created_at,
          updatedAt: curriculum.updated_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /curricula/:curriculumId/overview - Get curriculum with content counts
 */
export async function getCurriculumOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const curriculumId = req.params.curriculumId as string;

    const overview = await CurriculumModel.getOverviewById(curriculumId);

    if (!overview) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CURRICULUM_NOT_FOUND',
          message: 'Curriculum not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        curriculum: {
          id: overview.id,
          board: overview.board,
          classLevel: overview.class_level,
          subject: overview.subject,
          displayName: overview.display_name,
          isActive: overview.is_active,
          counts: {
            themes: overview.theme_count,
            topics: overview.topic_count,
            concepts: overview.concept_count,
            questions: overview.question_count,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /curricula/overview - Get all curricula with counts
 */
export async function getAllCurriculaOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const overviews = await CurriculumModel.getOverview(!includeInactive);

    res.status(200).json({
      success: true,
      data: {
        curricula: overviews.map(o => ({
          id: o.id,
          board: o.board,
          classLevel: o.class_level,
          subject: o.subject,
          displayName: o.display_name,
          isActive: o.is_active,
          counts: {
            themes: o.theme_count,
            topics: o.topic_count,
            concepts: o.concept_count,
            questions: o.question_count,
          },
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
