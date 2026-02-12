import { Request, Response, NextFunction } from 'express';
import * as flagController from '../../src/controllers/flag.controller';
import * as flagService from '../../src/services/flag.service';

// Mock the flag service
jest.mock('../../src/services/flag.service');
const mockedFlagService = flagService as jest.Mocked<typeof flagService>;

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

describe('Flag Controller', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('submitFlag', () => {
    it('should submit a flag and return 201', async () => {
      const mockFlag = {
        id: 'flag-1',
        question_id: 'T01.01.Q001',
        flag_reason: 'incorrect_answer',
        status: 'open',
      };
      mockedFlagService.createFlag.mockResolvedValue(mockFlag as any);

      const req = createMockReq({
        body: {
          questionId: 'T01.01.Q001',
          flagReason: 'incorrect_answer',
          userComment: 'Answer seems wrong',
        },
      });
      const { res, statusFn } = createMockRes();

      await flagController.submitFlag(req as Request, res as Response, next);

      expect(mockedFlagService.createFlag).toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(201);
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Duplicate flag');
      mockedFlagService.createFlag.mockRejectedValue(error);

      const req = createMockReq({
        body: { questionId: 'T01.01.Q001', flagReason: 'typo' },
      });
      const { res } = createMockRes();

      await flagController.submitFlag(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getFlags (admin)', () => {
    it('should return list of flags for admin', async () => {
      const mockFlags = {
        flags: [{ id: 'flag-1', status: 'open' }],
        total: 1,
      };
      mockedFlagService.getFlags.mockResolvedValue(mockFlags as any);

      const req = createMockReq({
        query: {} as any,
        user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' as const },
      });
      const { res, statusFn } = createMockRes();

      await flagController.getFlags(req as Request, res as Response, next);

      expect(mockedFlagService.getFlags).toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('updateFlag (admin)', () => {
    it('should update flag status', async () => {
      const mockFlag = { id: 'flag-1', status: 'reviewed' };
      mockedFlagService.updateFlag.mockResolvedValue(mockFlag as any);

      const req = createMockReq({
        params: { flagId: 'flag-1' },
        body: { status: 'reviewed', adminNotes: 'Checked and correct' },
        user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' as const },
      });
      const { res, statusFn } = createMockRes();

      await flagController.updateFlag(req as Request, res as Response, next);

      expect(mockedFlagService.updateFlag).toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getFlagStats (admin)', () => {
    it('should return flag statistics', async () => {
      const mockStats = {
        total: 25,
        byReason: { incorrect_answer: 10, typo: 8, unclear_question: 7 },
        byStatus: { open: 15, reviewed: 5, fixed: 3, dismissed: 2 },
      };
      mockedFlagService.getFlagStats.mockResolvedValue(mockStats as any);

      const req = createMockReq({
        user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' as const },
      });
      const { res, statusFn } = createMockRes();

      await flagController.getFlagStats(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });
});
