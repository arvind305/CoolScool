import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: 'child' | 'parent' | 'admin';
  sessionId?: string;
}

export interface DecodedToken extends Omit<JwtPayload, 'sub'>, TokenPayload {
  iat: number;
  exp: number;
  jti: string;
}

// Generate unique token ID
function generateJti(): string {
  return crypto.randomUUID();
}

// Generate access token (short-lived)
export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'],
    issuer: 'coolscool-api',
    audience: 'coolscool-app',
    jwtid: generateJti(),
  };

  return jwt.sign(payload, config.jwt.secret, options);
}

// Generate refresh token (long-lived)
export function generateRefreshToken(userId: string): { token: string; hash: string; expiresAt: Date } {
  const jti = generateJti();

  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry as jwt.SignOptions['expiresIn'],
    issuer: 'coolscool-api',
    jwtid: jti,
  };

  const token = jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.refreshSecret, options);

  // Hash the token for storage
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  // Calculate expiry date
  const expiresAt = new Date();
  const days = parseInt(config.jwt.refreshExpiry.replace('d', ''), 10) || 7;
  expiresAt.setDate(expiresAt.getDate() + days);

  return { token, hash, expiresAt };
}

// Verify access token
export function verifyAccessToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'coolscool-api',
      audience: 'coolscool-app',
    }) as DecodedToken;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError('Token has expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError('Invalid token', 'TOKEN_INVALID');
    }
    throw error;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'coolscool-api',
    }) as JwtPayload;

    if (!decoded.sub || !decoded.jti) {
      throw new TokenError('Invalid refresh token', 'TOKEN_INVALID');
    }

    return { sub: decoded.sub, jti: decoded.jti };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
    }
    throw error;
  }
}

// Hash a refresh token for comparison
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Custom token error
export class TokenError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TokenError';
    this.code = code;
  }
}
