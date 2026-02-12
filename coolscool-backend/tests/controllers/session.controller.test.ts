import { Request, Response, NextFunction } from 'express';
import * as sessionController from '../../src/controllers/session.controller';
import * as sessionService from '../../src/services/session.service';

// Mock the session service
jest.mock('../../src/services/session.service');
const mockedSessionService = sessionService as jest.Mocked<typeof sessionService>;

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 'user-1', email: 'test@test.com', role: 'child' as const },
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusFn: jest.Mock; jsonFn: jest.Mock } {
  const jsonFn = jest.fn().mockReturnThis();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  return { res: { status: statusFn, json: jsonFn } as any, statusFn, jsonFn };
}

describe('Session Controller', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session and return 201', async () => {
      const mockSession = {
        session_id: 'session-1',
        user_id: 'user-1',
        topic_id: 'T01.01',
        status: 'created',
      };
      mockedSessionService.createSession.mockResolvedValue(mockSession as any);

      const req = createMockReq({
        body: {
          curriculumId: '550e8400-e29b-41d4-a716-446655440000',
          topicId: 'T01.01',
          timeMode: 'unlimited',
          questionCount: 10,
          strategy: 'adaptive',
        },
      });
      const { res, statusFn } = createMockRes();

      await sessionController.createSession(req as Request, res as Response, next);

      expect(mockedSessionService.createSession).toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(201);
    });

    it('should call next with error on failure', async () => {
      const error = new Error('DB error');
      mockedSessionService.createSession.mockRejectedValue(error);

      const req = createMockReq({ body: { curriculumId: 'id', topicId: 'T01.01' } });
      const { res } = createMockRes();

      await sessionController.createSession(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('listSessions', () => {
    it('should return list of sessions', async () => {
      const mockSessions = [
        { session_id: 's1', topic_id: 'T01.01', status: 'completed' },
        { session_id: 's2', topic_id: 'T02.01', status: 'completed' },
      ];
      mockedSessionService.listUserSessions.mockResolvedValue(mockSessions as any);

      const req = createMockReq({ query: { limit: 20, offset: 0 } as any });
      const { res, statusFn } = createMockRes();

      await sessionController.listSessions(req as Request, res as Response, next);

      expect(mockedSessionService.listUserSessions).toHaveBeenCalledWith('user-1', expect.any(Object));
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getSession', () => {
    it('should return session details', async () => {
      const mockSession = { session_id: 'session-1', user_id: 'user-1', status: 'active' };
      mockedSessionService.getSessionForUser.mockResolvedValue(mockSession as any);

      const req = createMockReq({ params: { sessionId: 'session-1' } });
      const { res, statusFn } = createMockRes();

      await sessionController.getSession(req as Request, res as Response, next);

      expect(mockedSessionService.getSessionForUser).toHaveBeenCalledWith('user-1', 'session-1');
      expect(statusFn).toHaveBeenCalledWith(200);
    });

    it('should call next with error when session not found', async () => {
      mockedSessionService.getSessionForUser.mockRejectedValue(new Error('not found'));

      const req = createMockReq({ params: { sessionId: 'nonexistent' } });
      const { res } = createMockRes();

      await sessionController.getSession(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('submitAnswer', () => {
    it('should submit answer and return result', async () => {
      const mockResult = {
        isCorrect: true,
        correctAnswer: 'A',
        xpEarned: 10,
        explanation: 'Correct!',
      };
      mockedSessionService.submitAnswer.mockResolvedValue(mockResult as any);

      const req = createMockReq({
        params: { sessionId: 'session-1' },
        body: { userAnswer: 'A', timeTakenMs: 5000 },
      });
      const { res, statusFn } = createMockRes();

      await sessionController.submitAnswer(req as Request, res as Response, next);

      expect(mockedSessionService.submitAnswer).toHaveBeenCalledWith('user-1', 'session-1', expect.any(Object));
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('endSession', () => {
    it('should end session and return summary', async () => {
      const mockSummary = {
        session_id: 'session-1',
        questions_answered: 10,
        questions_correct: 8,
        xp_earned: 80,
      };
      mockedSessionService.endSession.mockResolvedValue(mockSummary as any);

      const req = createMockReq({ params: { sessionId: 'session-1' } });
      const { res, statusFn } = createMockRes();

      await sessionController.endSession(req as Request, res as Response, next);

      expect(mockedSessionService.endSession).toHaveBeenCalledWith('user-1', 'session-1', undefined, undefined);
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('skipQuestion', () => {
    it('should skip question and return next question', async () => {
      const mockResult = { skipped: true, nextQuestion: { question_id: 'q2' } };
      mockedSessionService.skipQuestion.mockResolvedValue(mockResult as any);

      const req = createMockReq({ params: { sessionId: 'session-1' } });
      const { res, statusFn } = createMockRes();

      await sessionController.skipQuestion(req as Request, res as Response, next);

      expect(mockedSessionService.skipQuestion).toHaveBeenCalledWith('user-1', 'session-1');
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary', async () => {
      const mockSummary = { questions_answered: 10, questions_correct: 7 };
      mockedSessionService.getSessionSummary.mockResolvedValue(mockSummary as any);

      const req = createMockReq({ params: { sessionId: 'session-1' } });
      const { res, statusFn } = createMockRes();

      await sessionController.getSessionSummary(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });
});
