import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenError, DecodedToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from './error.js';
import * as userModel from '../models/user.model.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'child' | 'parent' | 'admin';
      };
      token?: DecodedToken;
    }
  }
}

// Extract token from Authorization header
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) return null;

  return token;
}

// Authentication middleware - requires valid JWT
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const decoded = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    req.token = decoded;

    next();
  } catch (error) {
    if (error instanceof TokenError) {
      next(new UnauthorizedError(error.message));
    } else {
      next(error);
    }
  }
}

// Optional authentication - doesn't fail if no token
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
      req.token = decoded;
    }

    next();
  } catch {
    // Token invalid or expired - continue without auth
    next();
  }
}

// Role-based authorization
export function requireRole(...allowedRoles: Array<'child' | 'parent' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

// Require parental consent for child users
export async function requireParentalConsent(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Skip check for parents and admins
    if (req.user.role !== 'child') {
      return next();
    }

    // Check if child has parental consent
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return next(new UnauthorizedError('User not found'));
    }

    if (!user.parental_consent_given) {
      return next(new ForbiddenError('Parental consent required'));
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Resource ownership check helper
export function requireOwnership(
  getResourceUserId: (req: Request) => string | Promise<string>
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      // Admins can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);

      // Parents can access their children's resources
      if (req.user.role === 'parent') {
        const user = await userModel.findById(resourceUserId);
        if (user && user.parent_id === req.user.id) {
          return next();
        }
      }

      // Check if user owns the resource
      if (resourceUserId !== req.user.id) {
        return next(new ForbiddenError('Access denied'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
