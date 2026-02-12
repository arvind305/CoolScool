import { Request, Response, NextFunction } from 'express';
import * as authController from '../../src/controllers/auth.controller';
import * as authService from '../../src/services/auth.service';

// Mock the auth service
jest.mock('../../src/services/auth.service');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    cookies: {},
    headers: {},
    user: undefined,
    ip: '127.0.0.1',
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusFn: jest.Mock; jsonFn: jest.Mock; cookieFn: jest.Mock; clearCookieFn: jest.Mock } {
  const jsonFn = jest.fn().mockReturnThis();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  const cookieFn = jest.fn();
  const clearCookieFn = jest.fn();
  return {
    res: { status: statusFn, json: jsonFn, cookie: cookieFn, clearCookie: clearCookieFn } as any,
    statusFn,
    jsonFn,
    cookieFn,
    clearCookieFn,
  };
}

describe('Auth Controller', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('googleAuth', () => {
    it('should return 200 with user and tokens on success', async () => {
      const mockResult = {
        user: { id: 'user-1', email: 'test@test.com', displayName: 'Test', role: 'child' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token', expiresIn: 900 },
      };
      mockedAuthService.authenticateWithGoogle.mockResolvedValue(mockResult as any);

      const req = createMockReq({ body: { idToken: 'valid-token' } });
      const { res, statusFn, cookieFn } = createMockRes();

      await authController.googleAuth(req as Request, res as Response, next);

      expect(mockedAuthService.authenticateWithGoogle).toHaveBeenCalledWith('valid-token', undefined);
      expect(statusFn).toHaveBeenCalledWith(200);
      expect(cookieFn).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.any(Object));
    });

    it('should call next with error on service failure', async () => {
      const error = new Error('Invalid token');
      mockedAuthService.authenticateWithGoogle.mockRejectedValue(error);

      const req = createMockReq({ body: { idToken: 'invalid-token' } });
      const { res } = createMockRes();

      await authController.googleAuth(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshToken', () => {
    it('should return 401 when no refresh token provided', async () => {
      const req = createMockReq({ body: {}, cookies: {} });
      const { res, statusFn } = createMockRes();

      await authController.refreshToken(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(401);
    });

    it('should return 200 with new tokens from cookie', async () => {
      const mockTokens = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      };
      mockedAuthService.refreshAccessToken.mockResolvedValue(mockTokens as any);

      const req = createMockReq({ cookies: { refreshToken: 'old-refresh' } });
      const { res, statusFn, cookieFn } = createMockRes();

      await authController.refreshToken(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(cookieFn).toHaveBeenCalledWith('refreshToken', 'new-refresh', expect.any(Object));
    });

    it('should return 200 with new tokens from body', async () => {
      const mockTokens = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      };
      mockedAuthService.refreshAccessToken.mockResolvedValue(mockTokens as any);

      const req = createMockReq({ body: { refreshToken: 'body-refresh' } });
      const { res, statusFn } = createMockRes();

      await authController.refreshToken(req as Request, res as Response, next);

      expect(mockedAuthService.refreshAccessToken).toHaveBeenCalledWith('body-refresh', expect.any(Object));
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('logout', () => {
    it('should return 200 and clear cookie', async () => {
      mockedAuthService.logout.mockResolvedValue(undefined as any);

      const req = createMockReq({
        cookies: { refreshToken: 'token-to-revoke' },
        user: { id: 'user-1', email: 'test@test.com', role: 'child' as const },
      });
      const { res, statusFn, clearCookieFn } = createMockRes();

      await authController.logout(req as Request, res as Response, next);

      expect(mockedAuthService.logout).toHaveBeenCalledWith('token-to-revoke', 'user-1');
      expect(clearCookieFn).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(statusFn).toHaveBeenCalledWith(200);
    });

    it('should return 200 even without token (graceful)', async () => {
      const req = createMockReq({ cookies: {}, user: undefined });
      const { res, statusFn } = createMockRes();

      await authController.logout(req as Request, res as Response, next);

      expect(mockedAuthService.logout).not.toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('logoutAll', () => {
    it('should revoke all tokens and return 200', async () => {
      mockedAuthService.logoutAll.mockResolvedValue(undefined as any);

      const req = createMockReq({
        user: { id: 'user-1', email: 'test@test.com', role: 'child' as const },
      });
      const { res, statusFn, clearCookieFn } = createMockRes();

      await authController.logoutAll(req as Request, res as Response, next);

      expect(mockedAuthService.logoutAll).toHaveBeenCalledWith('user-1');
      expect(clearCookieFn).toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(200);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data on success', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        display_name: 'Test User',
        avatar_url: null,
        role: 'child',
        parental_consent_given: false,
        created_at: '2024-01-01T00:00:00Z',
      };
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser as any);

      const req = createMockReq({
        user: { id: 'user-1', email: 'test@test.com', role: 'child' as const },
      });
      const { res, statusFn } = createMockRes();

      await authController.getCurrentUser(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(200);
    });

    it('should return 404 when user not found', async () => {
      mockedAuthService.getCurrentUser.mockResolvedValue(null as any);

      const req = createMockReq({
        user: { id: 'nonexistent', email: 'test@test.com', role: 'child' as const },
      });
      const { res, statusFn } = createMockRes();

      await authController.getCurrentUser(req as Request, res as Response, next);

      expect(statusFn).toHaveBeenCalledWith(404);
    });
  });
});
