import jwt, { Secret, SignOptions } from 'jsonwebtoken';

const JWT_SECRET: Secret = 'test-jwt-secret-at-least-32-characters-long';

export interface TestUser {
  id: string;
  email: string;
  role: 'child' | 'parent' | 'admin';
}

export const testChild: TestUser = { id: 'user-child-001', email: 'child@test.com', role: 'child' };
export const testParent: TestUser = { id: 'user-parent-001', email: 'parent@test.com', role: 'parent' };
export const testAdmin: TestUser = { id: 'user-admin-001', email: 'admin@test.com', role: 'admin' };

/**
 * Generate a valid JWT access token for testing.
 */
export function generateTestToken(user: TestUser, expiresIn: string = '15m'): string {
  const options: SignOptions = {
    expiresIn: expiresIn as any,
    issuer: 'coolscool-api',
    audience: 'coolscool-app',
    jwtid: `test-jti-${Date.now()}`,
  };
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    options
  );
}

/**
 * Generate an expired JWT token for testing.
 */
export function generateExpiredToken(user: TestUser): string {
  const options: SignOptions = {
    expiresIn: '0s' as any,
    issuer: 'coolscool-api',
    audience: 'coolscool-app',
    jwtid: `test-expired-${Date.now()}`,
  };
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    options
  );
}

/**
 * Generate an authorization header value.
 */
export function authHeader(user: TestUser): string {
  return `Bearer ${generateTestToken(user)}`;
}
