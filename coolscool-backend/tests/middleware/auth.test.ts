import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, requireRole } from '../../src/middleware/auth';
import { generateTestToken, generateExpiredToken, testChild, testParent, testAdmin } from '../helpers';

// Mock the user model
jest.mock('../../src/models/user.model', () => ({
  findById: jest.fn(),
}));

function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
  return {
    headers: headers as any,
    user: undefined,
    token: undefined,
  };
}

function createMockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;
}

describe('authenticate middleware', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  it('should reject request without Authorization header', () => {
    const req = createMockReq();
    const res = createMockRes();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      message: 'No authentication token provided',
    }));
  });

  it('should reject request with invalid token format', () => {
    const req = createMockReq({ authorization: 'InvalidToken' });
    const res = createMockRes();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
    }));
  });

  it('should reject request with malformed Bearer token', () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token.here' });
    const res = createMockRes();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
    }));
  });

  it('should reject expired token', async () => {
    const token = generateExpiredToken(testChild);
    // Wait a moment for the token to expire
    await new Promise(resolve => setTimeout(resolve, 100));

    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
    }));
  });

  it('should accept valid child token and attach user to request', () => {
    const token = generateTestToken(testChild);
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: testChild.id,
      email: testChild.email,
      role: 'child',
    });
  });

  it('should accept valid admin token', () => {
    const token = generateTestToken(testAdmin);
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.role).toBe('admin');
  });

  it('should accept valid parent token', () => {
    const token = generateTestToken(testParent);
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.role).toBe('parent');
  });
});

describe('optionalAuth middleware', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  it('should continue without error when no token is provided', () => {
    const req = createMockReq();
    const res = createMockRes();

    optionalAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
  });

  it('should attach user when valid token is provided', () => {
    const token = generateTestToken(testChild);
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    optionalAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe(testChild.id);
  });

  it('should continue without error when invalid token is provided', () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token' });
    const res = createMockRes();

    optionalAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
  });
});

describe('requireRole middleware', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  it('should reject unauthenticated request', () => {
    const middleware = requireRole('admin');
    const req = createMockReq();
    const res = createMockRes();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
    }));
  });

  it('should reject user with wrong role', () => {
    const middleware = requireRole('admin');
    const token = generateTestToken(testChild);
    const req = createMockReq({ authorization: `Bearer ${token}` }) as any;
    req.user = { id: testChild.id, email: testChild.email, role: 'child' };
    const res = createMockRes();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
    }));
  });

  it('should allow user with correct role', () => {
    const middleware = requireRole('admin');
    const req = createMockReq() as any;
    req.user = { id: testAdmin.id, email: testAdmin.email, role: 'admin' };
    const res = createMockRes();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should allow user with one of multiple allowed roles', () => {
    const middleware = requireRole('child', 'parent');
    const req = createMockReq() as any;
    req.user = { id: testParent.id, email: testParent.email, role: 'parent' };
    const res = createMockRes();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
