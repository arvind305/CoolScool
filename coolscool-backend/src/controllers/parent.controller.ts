/**
 * Parent Controller
 *
 * Handles parent-related HTTP endpoints.
 * All endpoints require authentication and parent role.
 */

import { Request, Response, NextFunction } from 'express';
import * as parentService from '../services/parent.service.js';

// GET /parent/children - List linked children
export async function getChildren(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;

    const children = await parentService.getLinkedChildren(parentId);

    res.status(200).json({
      success: true,
      data: {
        children,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /parent/children - Link a child by email
export async function linkChild(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;
    const { childEmail } = req.body;

    const child = await parentService.linkChild(parentId, childEmail);

    res.status(201).json({
      success: true,
      data: {
        child,
      },
      message: 'Child linked successfully',
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /parent/children/:childId - Unlink a child
export async function unlinkChild(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;
    const childId = req.params.childId!;

    await parentService.unlinkChild(parentId, childId);

    res.status(200).json({
      success: true,
      message: 'Child unlinked successfully',
    });
  } catch (error) {
    next(error);
  }
}

// POST /parent/children/:childId/consent - Grant parental consent
export async function grantConsent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;
    const childId = req.params.childId!;

    await parentService.grantConsent(parentId, childId);

    res.status(200).json({
      success: true,
      message: 'Parental consent granted',
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /parent/children/:childId/consent - Revoke parental consent
export async function revokeConsent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;
    const childId = req.params.childId!;

    await parentService.revokeConsent(parentId, childId);

    res.status(200).json({
      success: true,
      message: 'Parental consent revoked',
    });
  } catch (error) {
    next(error);
  }
}

// GET /parent/children/:childId/progress - Get child's full progress
export async function getChildProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;
    const childId = req.params.childId!;

    const progress = await parentService.getChildFullProgress(parentId, childId);

    res.status(200).json({
      success: true,
      data: {
        progress,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /parent/children/:childId/sessions - Get child's session history
export async function getChildSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;
    const childId = req.params.childId!;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await parentService.getChildSessions(parentId, childId, limit, offset);

    res.status(200).json({
      success: true,
      data: {
        sessions: result.sessions,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /parent/activity - Get activity feed for all children
export async function getActivity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parentId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const childId = req.query.childId as string | undefined;

    let activities;
    if (childId) {
      activities = await parentService.getChildActivity(parentId, childId, limit);
    } else {
      activities = await parentService.getAllChildrenActivity(parentId, limit);
    }

    res.status(200).json({
      success: true,
      data: {
        activities,
      },
    });
  } catch (error) {
    next(error);
  }
}
