import { query, pool } from '../db/index.js';

export interface User {
  id: string;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'child' | 'parent' | 'admin';
  parent_id: string | null;
  parental_consent_given: boolean;
  parental_consent_date: Date | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  is_active: boolean;
}

export interface CreateUserInput {
  google_id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role?: 'child' | 'parent' | 'admin';
  parent_id?: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
  device_info: Record<string, unknown> | null;
}

// Find user by ID
export async function findById(id: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE id = $1 AND is_active = true',
    [id]
  );
  return result.rows[0] || null;
}

// Find user by Google ID
export async function findByGoogleId(googleId: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE google_id = $1',
    [googleId]
  );
  return result.rows[0] || null;
}

// Find user by email
export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

// Create or update user from Google OAuth
export async function findOrCreateByGoogle(input: CreateUserInput): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (google_id, email, display_name, avatar_url, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (google_id) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = COALESCE(EXCLUDED.display_name, users.display_name),
       avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
       last_login_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [
      input.google_id,
      input.email,
      input.display_name || null,
      input.avatar_url || null,
      input.role || 'child',
    ]
  );
  return result.rows[0]!;
}

// Update last login
export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [userId]
  );
}

// Update user
export async function updateUser(
  userId: string,
  updates: Partial<Pick<User, 'display_name' | 'avatar_url' | 'role' | 'parental_consent_given'>>
): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.display_name !== undefined) {
    fields.push(`display_name = $${paramIndex++}`);
    values.push(updates.display_name);
  }
  if (updates.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatar_url);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  if (updates.parental_consent_given !== undefined) {
    fields.push(`parental_consent_given = $${paramIndex++}`);
    values.push(updates.parental_consent_given);
    if (updates.parental_consent_given) {
      fields.push(`parental_consent_date = NOW()`);
    }
  }

  if (fields.length === 0) return findById(userId);

  values.push(userId);
  const result = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

// Deactivate user (soft delete)
export async function deactivateUser(userId: string): Promise<void> {
  await query(
    'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
    [userId]
  );
}

// ============================================
// REFRESH TOKEN OPERATIONS
// ============================================

// Store refresh token
export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  deviceInfo?: Record<string, unknown>
): Promise<RefreshToken> {
  const result = await query<RefreshToken>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, tokenHash, expiresAt, deviceInfo ? JSON.stringify(deviceInfo) : null]
  );
  return result.rows[0]!;
}

// Find refresh token by hash
export async function findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
  const result = await query<RefreshToken>(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

// Revoke refresh token
export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
    [tokenHash]
  );
}

// Revoke all user refresh tokens
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

// Clean up expired tokens (for scheduled job)
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await query(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
  );
  return result.rowCount || 0;
}

// ============================================
// AUDIT LOG
// ============================================

export async function logAudit(
  action: string,
  options: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    success?: boolean;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  await query(
    `INSERT INTO audit_logs
     (user_id, action, resource_type, resource_id, ip_address, user_agent, request_id, success, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      options.userId || null,
      action,
      options.resourceType || null,
      options.resourceId || null,
      options.ipAddress || null,
      options.userAgent || null,
      options.requestId || null,
      options.success ?? true,
      options.details ? JSON.stringify(options.details) : null,
    ]
  );
}
