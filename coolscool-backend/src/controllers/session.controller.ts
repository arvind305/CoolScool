/**
 * Session Controller
 *
 * Handles quiz session HTTP endpoints.
 * All endpoints require authentication.
 */

import { Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/session.service.js';
import { TimeMode, SelectionStrategy } from '../services/session.service.js';

// POST /sessions - Create a new quiz session
export async function createSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { topicId, timeMode, questionCount, strategy } = req.body;

    const session = await sessionService.createSession(userId, {
      topicIdStr: topicId,
      timeMode: timeMode as TimeMode,
      questionCount: questionCount || null,
      strategy: strategy as SelectionStrategy,
    });

    // Get the first question
    const currentQuestion = await sessionService.getCurrentQuestion(userId, session.id);

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.session_status,
          timeMode: session.time_mode,
          timeLimitMs: session.time_limit_ms,
          topicId: session.topic_id_str,
          topicName: session.topic_name,
          totalQuestions: session.question_queue.length,
          currentQuestionIndex: session.current_question_index,
        },
        currentQuestion,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /sessions/:sessionId/start - Start a session
export async function startSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;

    const session = await sessionService.startSession(userId, sessionId);
    const currentQuestion = await sessionService.getCurrentQuestion(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.session_status,
          startedAt: session.started_at,
        },
        currentQuestion,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /sessions/:sessionId/question - Get current question (without answer)
export async function getCurrentQuestion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;

    const session = await sessionService.getSessionForUser(userId, sessionId);
    const currentQuestion = await sessionService.getCurrentQuestion(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        question: currentQuestion,
        questionIndex: session.current_question_index,
        totalQuestions: session.question_queue.length,
        remaining: session.question_queue.length - session.current_question_index - 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /sessions/:sessionId/answer - Submit answer for current question
export async function submitAnswer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;
    const { userAnswer, timeTakenMs } = req.body;

    const result = await sessionService.submitAnswer(userId, sessionId, {
      userAnswer,
      timeTakenMs,
    });

    res.status(200).json({
      success: true,
      data: {
        isCorrect: result.isCorrect,
        xpEarned: result.xpEarned,
        masteryAchieved: result.masteryAchieved,
        newDifficulty: result.newDifficulty,
        correctAnswer: result.correctAnswer,
        isSessionComplete: result.isSessionComplete,
        nextQuestion: result.nextQuestion,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /sessions/:sessionId/skip - Skip current question
export async function skipQuestion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;

    const result = await sessionService.skipQuestion(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        isSessionComplete: result.isSessionComplete,
        nextQuestion: result.nextQuestion,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /sessions/:sessionId/pause - Pause session
export async function pauseSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;
    const { elapsedMs } = req.body;

    const session = await sessionService.pauseSession(userId, sessionId, elapsedMs || 0);

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.session_status,
          timeElapsedMs: session.time_elapsed_ms,
          pausedAt: session.paused_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /sessions/:sessionId/resume - Resume paused session
export async function resumeSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;

    const session = await sessionService.resumeSession(userId, sessionId);
    const currentQuestion = await sessionService.getCurrentQuestion(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.session_status,
          timeElapsedMs: session.time_elapsed_ms,
        },
        currentQuestion,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /sessions/:sessionId/end - End session (complete or abandon)
export async function endSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;
    const { completed, elapsedMs } = req.body;

    const session = await sessionService.endSession(userId, sessionId, completed, elapsedMs);

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.session_status,
          questionsAnswered: session.questions_answered,
          questionsCorrect: session.questions_correct,
          questionsSkipped: session.questions_skipped,
          xpEarned: session.xp_earned,
          completedAt: session.completed_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /sessions/:sessionId/summary - Get session summary
export async function getSessionSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;

    const summary = await sessionService.getSessionSummary(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          sessionId: summary.session_id,
          topicId: summary.topic_id,
          topicName: summary.topic_name,
          timeMode: summary.time_mode,
          status: summary.status,
          totalQuestions: summary.total_questions,
          questionsAnswered: summary.questions_answered,
          questionsCorrect: summary.questions_correct,
          questionsSkipped: summary.questions_skipped,
          xpEarned: summary.xp_earned,
          timeElapsedMs: summary.time_elapsed_ms,
          byDifficulty: summary.by_difficulty,
          startedAt: summary.started_at,
          completedAt: summary.completed_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /sessions - List user's sessions
export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { limit, offset, status } = req.query;

    const result = await sessionService.listUserSessions(userId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      status: status as sessionService.SessionStatus | undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        sessions: result.sessions.map(session => ({
          id: session.id,
          status: session.session_status,
          timeMode: session.time_mode,
          topicId: session.topic_id_str,
          topicName: session.topic_name,
          questionsAnswered: session.questions_answered,
          questionsCorrect: session.questions_correct,
          xpEarned: session.xp_earned,
          createdAt: session.created_at,
          startedAt: session.started_at,
          completedAt: session.completed_at,
        })),
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string, 10) : 20,
          offset: offset ? parseInt(offset as string, 10) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /sessions/:sessionId - Get session details
export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId as string;

    const session = await sessionService.getSessionForUser(userId, sessionId);

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.session_status,
          timeMode: session.time_mode,
          timeLimitMs: session.time_limit_ms,
          topicId: session.topic_id_str,
          topicName: session.topic_name,
          totalQuestions: session.question_queue.length,
          questionsAnswered: session.questions_answered,
          questionsCorrect: session.questions_correct,
          questionsSkipped: session.questions_skipped,
          xpEarned: session.xp_earned,
          currentQuestionIndex: session.current_question_index,
          timeElapsedMs: session.time_elapsed_ms,
          createdAt: session.created_at,
          startedAt: session.started_at,
          pausedAt: session.paused_at,
          completedAt: session.completed_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
