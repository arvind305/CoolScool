import { Request, Response, NextFunction } from 'express';
import * as camController from '../../src/controllers/cam.controller';

// Mock database queries (CAM controller uses db directly)
jest.mock('../../src/db/index', () => ({
  query: jest.fn(),
}));

// Mock curriculum model
jest.mock('../../src/models/curriculum.model', () => ({
  findById: jest.fn(),
  findByBoardClassSubject: jest.fn(),
  getDefault: jest.fn(),
}));

// Mock question model
jest.mock('../../src/models/question.model', () => ({
  getQuestionsByTopicId: jest.fn(),
}));

import { query } from '../../src/db/index';
import * as curriculumModel from '../../src/models/curriculum.model';
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedCurriculumModel = curriculumModel as jest.Mocked<typeof curriculumModel>;

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    user: undefined,
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusFn: jest.Mock; jsonFn: jest.Mock } {
  const jsonFn = jest.fn().mockReturnThis();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  return { res: { status: statusFn, json: jsonFn } as any, statusFn, jsonFn };
}

describe('CAM Controller', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getThemes', () => {
    it('should return themes from the curriculum', async () => {
      mockedCurriculumModel.getDefault.mockResolvedValue({
        id: 'cur-1',
        board: 'icse',
        class_level: 5,
        subject: 'mathematics',
      } as any);

      mockedQuery.mockResolvedValue({
        rows: [
          { theme_id: 'T01', theme_name: 'Numbers', theme_order: 1 },
          { theme_id: 'T02', theme_name: 'Geometry', theme_order: 2 },
        ],
      } as any);

      const req = createMockReq();
      const { res, statusFn, jsonFn } = createMockRes();

      await camController.getThemes(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });

    it('should call next with error on failure', async () => {
      mockedCurriculumModel.getDefault.mockRejectedValue(new Error('DB error'));

      const req = createMockReq();
      const { res } = createMockRes();

      await camController.getThemes(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getTheme', () => {
    it('should return a single theme with topics', async () => {
      mockedCurriculumModel.getDefault.mockResolvedValue({ id: 'cur-1' } as any);

      mockedQuery
        .mockResolvedValueOnce({
          rows: [{ theme_id: 'T01', theme_name: 'Numbers', theme_order: 1, curriculum_id: 'cur-1' }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { topic_id: 'T01.01', topic_name: 'Counting', topic_order: 1 },
            { topic_id: 'T01.02', topic_name: 'Addition', topic_order: 2 },
          ],
        } as any);

      const req = createMockReq({ params: { themeId: 'T01' } });
      const { res, statusFn } = createMockRes();

      await camController.getTheme(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getTopic', () => {
    it('should return a single topic with concepts', async () => {
      mockedCurriculumModel.getDefault.mockResolvedValue({ id: 'cur-1' } as any);

      mockedQuery
        .mockResolvedValueOnce({
          rows: [{
            topic_id: 'T01.01',
            topic_name: 'Counting',
            theme_id: 'T01',
            curriculum_id: 'cur-1',
          }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { concept_id: 'C01', concept_name: 'Count to 10', difficulty: 1 },
          ],
        } as any);

      const req = createMockReq({ params: { topicId: 'T01.01' } });
      const { res, statusFn } = createMockRes();

      await camController.getTopic(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });
});
