import { Request, Response, NextFunction } from 'express';
import * as progressController from '../../src/controllers/progress.controller';
import * as progressService from '../../src/services/progress.service';
import * as analyticsService from '../../src/services/analytics.service';

// Mock services
jest.mock('../../src/services/progress.service');
jest.mock('../../src/services/analytics.service');
const mockedProgressService = progressService as jest.Mocked<typeof progressService>;
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

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

describe('Progress Controller', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getUserProgress', () => {
    it('should return user progress data', async () => {
      const mockProgress = {
        totalXP: 500,
        sessionsCompleted: 10,
        topicsStarted: 5,
        topicsMastered: 2,
        averageAccuracy: 75,
      };
      mockedProgressService.getUserProgress.mockResolvedValue(mockProgress as any);

      const req = createMockReq();
      const { res, statusFn } = createMockRes();

      await progressController.getUserProgress(req as Request, res as Response, next);

      expect(mockedProgressService.getUserProgress).toHaveBeenCalledWith('user-1');
      expect(statusFn).toHaveBeenCalledWith(200);
    });

    it('should call next with error on failure', async () => {
      const error = new Error('DB error');
      mockedProgressService.getUserProgress.mockRejectedValue(error);

      const req = createMockReq();
      const { res } = createMockRes();

      await progressController.getUserProgress(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProgressSummary', () => {
    it('should return progress summary', async () => {
      mockedProgressService.getProgressSummary.mockResolvedValue({ summary: 'data' } as any);

      const req = createMockReq();
      const { res, statusFn } = createMockRes();

      await progressController.getProgressSummary(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getTopicProgress', () => {
    it('should return single topic progress', async () => {
      mockedProgressService.getTopicProgress.mockResolvedValue({
        topic_id: 'T01.01',
        proficiency: 'growing',
        xp: 100,
      } as any);

      const req = createMockReq({ params: { topicId: 'T01.01' } });
      const { res, statusFn } = createMockRes();

      await progressController.getTopicProgress(req as Request, res as Response, next);

      expect(mockedProgressService.getTopicProgress).toHaveBeenCalledWith('user-1', 'T01.01');
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getTrends', () => {
    it('should return daily activity trends', async () => {
      const mockTrends = [
        { date: '2024-01-01', xp: 50, questions: 10, accuracy: 80 },
        { date: '2024-01-02', xp: 30, questions: 6, accuracy: 67 },
      ];
      mockedAnalyticsService.getDailyTrends.mockResolvedValue(mockTrends as any);

      const req = createMockReq();
      const { res, statusFn } = createMockRes();

      await progressController.getTrends(req as Request, res as Response, next);

      expect(mockedAnalyticsService.getDailyTrends).toHaveBeenCalledWith('user-1', undefined);
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getStreak', () => {
    it('should return streak info', async () => {
      mockedAnalyticsService.getStreak.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 12,
        lastActiveDate: '2024-01-15',
      } as any);

      const req = createMockReq();
      const { res, statusFn } = createMockRes();

      await progressController.getStreak(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getWeakAreas', () => {
    it('should return weak areas', async () => {
      mockedAnalyticsService.getWeakAreas.mockResolvedValue([
        { topicId: 'T01.03', topicName: 'Fractions', accuracy: 40 },
      ] as any);

      const req = createMockReq();
      const { res, statusFn } = createMockRes();

      await progressController.getWeakAreas(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('exportProgress', () => {
    it('should export progress data', async () => {
      mockedProgressService.exportProgress.mockResolvedValue({ exportData: {} } as any);

      const req = createMockReq();
      const { res, statusFn } = createMockRes();

      await progressController.exportProgress(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('resetProgress', () => {
    it('should reset progress with confirmation', async () => {
      mockedProgressService.resetProgress.mockResolvedValue(undefined as any);

      const req = createMockReq({ body: { confirm: 'RESET_ALL_PROGRESS' } });
      const { res, statusFn } = createMockRes();

      await progressController.resetProgress(req as Request, res as Response, next);

      expect(mockedProgressService.resetProgress).toHaveBeenCalledWith('user-1');
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });
});
