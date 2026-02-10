import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { config } from '../config/index.js';

// POST /auth/google - Authenticate with Google OAuth
export async function googleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { idToken, deviceInfo } = req.body;

    const result = await authService.authenticateWithGoogle(idToken, deviceInfo);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /auth/refresh - Refresh access token
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get refresh token from cookie or body
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token not provided',
        },
      });
      return;
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    const tokens = await authService.refreshAccessToken(token, deviceInfo);

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /auth/logout - Logout (revoke refresh token)
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    const userId = req.user?.id;

    if (token && userId) {
      await authService.logout(token, userId);
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

// POST /auth/logout-all - Logout from all devices
export async function logoutAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    await authService.logoutAll(userId);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices',
    });
  } catch (error) {
    next(error);
  }
}

// GET /auth/me - Get current user
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const user = await authService.getCurrentUser(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          role: user.role,
          parentalConsentGiven: user.parental_consent_given,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
