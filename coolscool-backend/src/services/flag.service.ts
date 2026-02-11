/**
 * Flag Service
 *
 * Handles question flagging operations: creating flags,
 * listing/filtering flags for admin review, updating flag status,
 * and aggregating flag statistics.
 */

import { query } from '../db/index.js';
import { ConflictError, NotFoundError } from '../middleware/error.js';

// ============================================
// INTERFACES
// ============================================

export interface CreateFlagData {
  questionId: string;
  curriculumId?: string;
  flagReason: string;
  userComment?: string;
}

export interface FlagFilters {
  status?: string;
  reason?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateFlagData {
  status?: string;
  adminNotes?: string;
}

export interface FlagRecord {
  id: string;
  userId: string;
  questionId: string;
  curriculumId: string | null;
  flagReason: string;
  userComment: string | null;
  status: string;
  adminNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlagWithUser extends FlagRecord {
  displayName: string;
  email: string;
}

export interface FlagStats {
  total: number;
  byReason: Record<string, number>;
  byStatus: Record<string, number>;
  resolutionRate: number;
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Create a new question flag.
 * Checks for duplicate active flags by the same user on the same question.
 */
export async function createFlag(
  userId: string,
  data: CreateFlagData
): Promise<FlagRecord> {
  // Check for existing active flag
  const existing = await getUserFlagForQuestion(userId, data.questionId);
  if (existing) {
    throw new ConflictError('You have already flagged this question');
  }

  const result = await query<{
    id: string;
    user_id: string;
    question_id: string;
    curriculum_id: string | null;
    flag_reason: string;
    user_comment: string | null;
    status: string;
    admin_notes: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `INSERT INTO question_flags (user_id, question_id, curriculum_id, flag_reason, user_comment)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [userId, data.questionId, data.curriculumId || null, data.flagReason, data.userComment || null]
  );

  const row = result.rows[0]!;
  return mapFlagRow(row);
}

/**
 * List flags with optional filters and pagination. For admin use.
 * Joins with users table to include display_name.
 */
export async function getFlags(filters: FlagFilters): Promise<{
  flags: FlagWithUser[];
  total: number;
}> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`qf.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.reason) {
    conditions.push(`qf.flag_reason = $${paramIndex++}`);
    params.push(filters.reason);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM question_flags qf ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0]!.count);

  // Get paginated results
  const dataResult = await query<{
    id: string;
    user_id: string;
    question_id: string;
    curriculum_id: string | null;
    flag_reason: string;
    user_comment: string | null;
    status: string;
    admin_notes: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
    updated_at: string;
    display_name: string;
    email: string;
  }>(
    `SELECT qf.*, u.display_name, u.email
    FROM question_flags qf
    JOIN users u ON qf.user_id = u.id
    ${whereClause}
    ORDER BY qf.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  const flags: FlagWithUser[] = dataResult.rows.map((row) => ({
    ...mapFlagRow(row),
    displayName: row.display_name,
    email: row.email,
  }));

  return { flags, total };
}

/**
 * Update a flag's status and/or admin notes.
 * Sets resolved_at and resolved_by when status changes to a closing status.
 */
export async function updateFlag(
  flagId: string,
  adminUserId: string,
  data: UpdateFlagData
): Promise<FlagRecord> {
  // Check flag exists
  const existingResult = await query<{ id: string }>(
    `SELECT id FROM question_flags WHERE id = $1`,
    [flagId]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Flag not found');
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.status) {
    setClauses.push(`status = $${paramIndex++}`);
    params.push(data.status);

    // Set resolved fields when closing a flag
    const closingStatuses = ['fixed', 'dismissed'];
    if (closingStatuses.includes(data.status)) {
      setClauses.push(`resolved_at = NOW()`);
      setClauses.push(`resolved_by = $${paramIndex++}`);
      params.push(adminUserId);
    }
  }

  if (data.adminNotes !== undefined) {
    setClauses.push(`admin_notes = $${paramIndex++}`);
    params.push(data.adminNotes);
  }

  if (setClauses.length === 0) {
    // Nothing to update, return current record
    const current = await query<{
      id: string;
      user_id: string;
      question_id: string;
      curriculum_id: string | null;
      flag_reason: string;
      user_comment: string | null;
      status: string;
      admin_notes: string | null;
      resolved_at: string | null;
      resolved_by: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM question_flags WHERE id = $1`,
      [flagId]
    );
    return mapFlagRow(current.rows[0]!);
  }

  params.push(flagId);

  const result = await query<{
    id: string;
    user_id: string;
    question_id: string;
    curriculum_id: string | null;
    flag_reason: string;
    user_comment: string | null;
    status: string;
    admin_notes: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `UPDATE question_flags
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *`,
    params
  );

  return mapFlagRow(result.rows[0]!);
}

/**
 * Get aggregated flag statistics for admin dashboard.
 */
export async function getFlagStats(): Promise<FlagStats> {
  // Total count
  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM question_flags`
  );
  const total = Number(totalResult.rows[0]!.count);

  // Counts by reason
  const reasonResult = await query<{ flag_reason: string; count: string }>(
    `SELECT flag_reason, COUNT(*) as count FROM question_flags GROUP BY flag_reason`
  );
  const byReason: Record<string, number> = {};
  for (const row of reasonResult.rows) {
    byReason[row.flag_reason] = Number(row.count);
  }

  // Counts by status
  const statusResult = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) as count FROM question_flags GROUP BY status`
  );
  const byStatus: Record<string, number> = {};
  for (const row of statusResult.rows) {
    byStatus[row.status] = Number(row.count);
  }

  // Resolution rate (fixed + dismissed) / total
  const resolvedCount = (byStatus['fixed'] || 0) + (byStatus['dismissed'] || 0);
  const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100 * 10) / 10 : 0;

  return {
    total,
    byReason,
    byStatus,
    resolutionRate,
  };
}

/**
 * Check if a user already has an active flag for a question.
 */
export async function getUserFlagForQuestion(
  userId: string,
  questionId: string
): Promise<FlagRecord | null> {
  const result = await query<{
    id: string;
    user_id: string;
    question_id: string;
    curriculum_id: string | null;
    flag_reason: string;
    user_comment: string | null;
    status: string;
    admin_notes: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM question_flags
    WHERE user_id = $1 AND question_id = $2 AND status != 'dismissed'
    LIMIT 1`,
    [userId, questionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapFlagRow(result.rows[0]!);
}

// ============================================
// HELPERS
// ============================================

function mapFlagRow(row: {
  id: string;
  user_id: string;
  question_id: string;
  curriculum_id: string | null;
  flag_reason: string;
  user_comment: string | null;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}): FlagRecord {
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    curriculumId: row.curriculum_id,
    flagReason: row.flag_reason,
    userComment: row.user_comment,
    status: row.status,
    adminNotes: row.admin_notes,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
