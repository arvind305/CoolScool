import { Request, Response, NextFunction } from 'express';
import { validate, schemas } from '../../src/middleware/validate';

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

function createMockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;
}

describe('validate middleware', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  describe('body validation', () => {
    it('should pass valid googleAuth body', () => {
      const middleware = validate(schemas.googleAuth);
      const req = createMockReq({
        body: { idToken: 'valid-google-id-token' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject missing idToken', () => {
      const middleware = validate(schemas.googleAuth);
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      }));
    });

    it('should reject empty idToken', () => {
      const middleware = validate(schemas.googleAuth);
      const req = createMockReq({ body: { idToken: '' } });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });
  });

  describe('createSession validation', () => {
    const validSession = {
      curriculumId: '550e8400-e29b-41d4-a716-446655440000',
      topicId: 'T01.01',
      timeMode: 'unlimited',
    };

    it('should pass valid session creation body', () => {
      const middleware = validate(schemas.createSession);
      const req = createMockReq({ body: validSession });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid curriculumId format', () => {
      const middleware = validate(schemas.createSession);
      const req = createMockReq({
        body: { ...validSession, curriculumId: 'not-a-uuid' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });

    it('should reject invalid topicId format', () => {
      const middleware = validate(schemas.createSession);
      const req = createMockReq({
        body: { ...validSession, topicId: 'invalid' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });

    it('should reject invalid timeMode', () => {
      const middleware = validate(schemas.createSession);
      const req = createMockReq({
        body: { ...validSession, timeMode: '99min' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });

    it('should apply defaults for optional fields', () => {
      const middleware = validate(schemas.createSession);
      const req = createMockReq({
        body: {
          curriculumId: validSession.curriculumId,
          topicId: validSession.topicId,
        },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.timeMode).toBe('unlimited');
      expect(req.body.questionCount).toBe(10);
      expect(req.body.strategy).toBe('adaptive');
    });
  });

  describe('submitAnswer validation', () => {
    it('should accept string answer', () => {
      const middleware = validate(schemas.submitAnswer);
      const req = createMockReq({
        body: { userAnswer: 'A', timeTakenMs: 5000 },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should accept boolean answer (true/false)', () => {
      const middleware = validate(schemas.submitAnswer);
      const req = createMockReq({
        body: { userAnswer: true, timeTakenMs: 3000 },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should accept array answer (ordering)', () => {
      const middleware = validate(schemas.submitAnswer);
      const req = createMockReq({
        body: { userAnswer: ['item1', 'item2', 'item3'], timeTakenMs: 8000 },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject missing answer', () => {
      const middleware = validate(schemas.submitAnswer);
      const req = createMockReq({ body: { timeTakenMs: 5000 } });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });
  });

  describe('params validation', () => {
    it('should pass valid UUID param', () => {
      const middleware = validate(schemas.uuidParam, 'params');
      const req = createMockReq({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid UUID param', () => {
      const middleware = validate(schemas.uuidParam, 'params');
      const req = createMockReq({
        params: { id: 'not-a-uuid' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });

    it('should pass valid session ID param', () => {
      const middleware = validate(schemas.sessionIdParam, 'params');
      const req = createMockReq({
        params: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('resetProgress validation', () => {
    it('should pass with correct confirmation', () => {
      const middleware = validate(schemas.resetProgress);
      const req = createMockReq({
        body: { confirm: 'RESET_ALL_PROGRESS' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject incorrect confirmation', () => {
      const middleware = validate(schemas.resetProgress);
      const req = createMockReq({
        body: { confirm: 'wrong' },
      });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });
  });

  describe('pagination validation', () => {
    it('should apply defaults', () => {
      const middleware = validate(schemas.pagination, 'query');
      const req = createMockReq({ query: {} });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query).toEqual({ limit: 20, offset: 0 });
    });

    it('should reject limit over 100', () => {
      const middleware = validate(schemas.pagination, 'query');
      const req = createMockReq({ query: { limit: '200' } as any });
      const res = createMockRes();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });
  });
});
