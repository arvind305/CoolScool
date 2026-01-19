/**
 * Parent Service
 *
 * Manages parent-child relationships and parent access to child data.
 */

import { query, withTransaction } from '../db/index.js';
import { User } from '../models/user.model.js';
import { NotFoundError, BadRequestError, ConflictError } from '../middleware/error.js';

// ============================================
// INTERFACES
// ============================================

export interface LinkedChild {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  linkedAt: string;
  parentalConsentGiven: boolean;
}

export interface ChildProgressSummary {
  childId: string;
  totalXp: number;
  sessionsCompleted: number;
  topicsStarted: number;
  topicsTotal: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  childId: string;
  childName: string;
  type: 'session_completed' | 'topic_started' | 'milestone_reached';
  description: string;
  timestamp: string;
  metadata: {
    topicId?: string;
    topicName?: string;
    xpEarned?: number;
    questionsCorrect?: number;
    questionsTotal?: number;
    proficiencyBand?: string;
  };
}

export interface ChildFullProgress {
  child: LinkedChild;
  summary: {
    totalXp: number;
    sessionsCompleted: number;
    topicsStarted: number;
    topicsTotal: number;
    averageAccuracy: number;
  };
  topics: {
    topicId: string;
    topicName: string;
    proficiencyBand: string;
    conceptsStarted: number;
    conceptsTotal: number;
    xpEarned: number;
    lastAttemptedAt: string | null;
  }[];
  recentSessions: {
    id: string;
    topicId: string;
    topicName: string;
    questionsAnswered: number;
    questionsCorrect: number;
    xpEarned: number;
    completedAt: string;
  }[];
}

// ============================================
// CHILD MANAGEMENT
// ============================================

/**
 * Gets all children linked to a parent
 */
export async function getLinkedChildren(parentId: string): Promise<LinkedChild[]> {
  const result = await query<User & { linked_at: string }>(
    `SELECT id, email, display_name, avatar_url, parental_consent_given,
            updated_at as linked_at
     FROM users
     WHERE parent_id = $1 AND is_active = true
     ORDER BY display_name, email`,
    [parentId]
  );

  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    linkedAt: row.linked_at,
    parentalConsentGiven: row.parental_consent_given,
  }));
}

/**
 * Links a child to a parent by email
 */
export async function linkChild(
  parentId: string,
  childEmail: string
): Promise<LinkedChild> {
  return withTransaction(async (client) => {
    // Find the child by email
    const childResult = await client.query<User>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [childEmail.toLowerCase()]
    );

    if (!childResult.rows[0]) {
      throw new NotFoundError('No account found with that email');
    }

    const child = childResult.rows[0];

    // Check if child is actually a child role
    if (child.role !== 'child') {
      throw new BadRequestError('Can only link child accounts');
    }

    // Check if already linked to another parent
    if (child.parent_id && child.parent_id !== parentId) {
      throw new ConflictError('This child is already linked to another parent');
    }

    // Check if already linked to this parent
    if (child.parent_id === parentId) {
      throw new ConflictError('This child is already linked to your account');
    }

    // Link the child
    const updateResult = await client.query<User>(
      `UPDATE users
       SET parent_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [parentId, child.id]
    );

    const updated = updateResult.rows[0]!;

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.display_name,
      avatarUrl: updated.avatar_url,
      linkedAt: updated.updated_at.toISOString(),
      parentalConsentGiven: updated.parental_consent_given,
    };
  });
}

/**
 * Unlinks a child from a parent
 */
export async function unlinkChild(
  parentId: string,
  childId: string
): Promise<void> {
  const result = await query(
    `UPDATE users
     SET parent_id = NULL, parental_consent_given = FALSE, parental_consent_date = NULL
     WHERE id = $1 AND parent_id = $2`,
    [childId, parentId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Child not found or not linked to your account');
  }
}

/**
 * Grants parental consent for a child
 */
export async function grantConsent(
  parentId: string,
  childId: string
): Promise<void> {
  const result = await query(
    `UPDATE users
     SET parental_consent_given = TRUE, parental_consent_date = NOW()
     WHERE id = $1 AND parent_id = $2`,
    [childId, parentId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Child not found or not linked to your account');
  }
}

/**
 * Revokes parental consent for a child
 */
export async function revokeConsent(
  parentId: string,
  childId: string
): Promise<void> {
  const result = await query(
    `UPDATE users
     SET parental_consent_given = FALSE, parental_consent_date = NULL
     WHERE id = $1 AND parent_id = $2`,
    [childId, parentId]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Child not found or not linked to your account');
  }
}

// ============================================
// CHILD PROGRESS
// ============================================

/**
 * Gets progress summary for a child
 */
export async function getChildProgressSummary(
  parentId: string,
  childId: string
): Promise<ChildProgressSummary> {
  // Verify parent-child relationship
  const childResult = await query<User>(
    'SELECT * FROM users WHERE id = $1 AND parent_id = $2',
    [childId, parentId]
  );

  if (!childResult.rows[0]) {
    throw new NotFoundError('Child not found or not linked to your account');
  }

  // Get session stats
  const sessionStats = await query<{ count: string; xp: string }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(xp_earned), 0) as xp
     FROM quiz_sessions
     WHERE user_id = $1 AND session_status = 'completed'`,
    [childId]
  );

  // Get topic stats
  const topicStats = await query<{ started: string; total: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE tp.id IS NOT NULL) as started,
       COUNT(DISTINCT t.id) as total
     FROM topics t
     LEFT JOIN topic_progress tp ON t.topic_id = tp.topic_id_str AND tp.user_id = $1`,
    [childId]
  );

  // Get recent activity
  const recentActivity = await getChildActivity(parentId, childId, 5);

  return {
    childId,
    totalXp: parseInt(sessionStats.rows[0]?.xp || '0', 10),
    sessionsCompleted: parseInt(sessionStats.rows[0]?.count || '0', 10),
    topicsStarted: parseInt(topicStats.rows[0]?.started || '0', 10),
    topicsTotal: parseInt(topicStats.rows[0]?.total || '0', 10),
    recentActivity,
  };
}

/**
 * Gets full progress for a child
 */
export async function getChildFullProgress(
  parentId: string,
  childId: string
): Promise<ChildFullProgress> {
  // Verify parent-child relationship
  const childResult = await query<User>(
    'SELECT * FROM users WHERE id = $1 AND parent_id = $2',
    [childId, parentId]
  );

  if (!childResult.rows[0]) {
    throw new NotFoundError('Child not found or not linked to your account');
  }

  const child = childResult.rows[0];

  // Get session stats
  const sessionStats = await query<{ count: string; xp: string; correct: string; answered: string }>(
    `SELECT
       COUNT(*) as count,
       COALESCE(SUM(xp_earned), 0) as xp,
       COALESCE(SUM(questions_correct), 0) as correct,
       COALESCE(SUM(questions_answered), 0) as answered
     FROM quiz_sessions
     WHERE user_id = $1 AND session_status = 'completed'`,
    [childId]
  );

  const stats = sessionStats.rows[0]!;
  const answered = parseInt(stats.answered, 10);
  const correct = parseInt(stats.correct, 10);
  const averageAccuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  // Get topic progress
  const topicProgress = await query<{
    topic_id: string;
    topic_name: string;
    proficiency_band: string;
    concepts_started: number;
    concepts_total: number;
    xp_earned: number;
    last_attempted_at: string | null;
  }>(
    `SELECT
       t.topic_id, t.topic_name,
       COALESCE(tp.proficiency_band, 'not_started') as proficiency_band,
       COALESCE(tp.concepts_started, 0) as concepts_started,
       (SELECT COUNT(*) FROM concepts c WHERE c.topic_id = t.id) as concepts_total,
       COALESCE(tp.xp_earned, 0) as xp_earned,
       tp.last_attempted_at
     FROM topics t
     LEFT JOIN topic_progress tp ON t.topic_id = tp.topic_id_str AND tp.user_id = $1
     ORDER BY t.topic_order`,
    [childId]
  );

  // Get recent sessions
  const recentSessions = await query<{
    id: string;
    topic_id_str: string;
    topic_name: string;
    questions_answered: number;
    questions_correct: number;
    xp_earned: number;
    completed_at: string;
  }>(
    `SELECT id, topic_id_str, topic_name, questions_answered, questions_correct, xp_earned, completed_at
     FROM quiz_sessions
     WHERE user_id = $1 AND session_status = 'completed'
     ORDER BY completed_at DESC
     LIMIT 10`,
    [childId]
  );

  // Count topics
  const topicCount = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM topics'
  );

  return {
    child: {
      id: child.id,
      email: child.email,
      displayName: child.display_name,
      avatarUrl: child.avatar_url,
      linkedAt: child.updated_at.toISOString(),
      parentalConsentGiven: child.parental_consent_given,
    },
    summary: {
      totalXp: parseInt(stats.xp, 10),
      sessionsCompleted: parseInt(stats.count, 10),
      topicsStarted: topicProgress.rows.filter(t => t.proficiency_band !== 'not_started').length,
      topicsTotal: parseInt(topicCount.rows[0]?.count || '0', 10),
      averageAccuracy,
    },
    topics: topicProgress.rows.map(t => ({
      topicId: t.topic_id,
      topicName: t.topic_name,
      proficiencyBand: t.proficiency_band,
      conceptsStarted: t.concepts_started,
      conceptsTotal: t.concepts_total,
      xpEarned: t.xp_earned,
      lastAttemptedAt: t.last_attempted_at,
    })),
    recentSessions: recentSessions.rows.map(s => ({
      id: s.id,
      topicId: s.topic_id_str,
      topicName: s.topic_name,
      questionsAnswered: s.questions_answered,
      questionsCorrect: s.questions_correct,
      xpEarned: s.xp_earned,
      completedAt: s.completed_at,
    })),
  };
}

/**
 * Gets session history for a child
 */
export async function getChildSessions(
  parentId: string,
  childId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ sessions: any[]; total: number }> {
  // Verify parent-child relationship
  const childResult = await query<User>(
    'SELECT id FROM users WHERE id = $1 AND parent_id = $2',
    [childId, parentId]
  );

  if (!childResult.rows[0]) {
    throw new NotFoundError('Child not found or not linked to your account');
  }

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM quiz_sessions WHERE user_id = $1`,
    [childId]
  );

  // Get sessions
  const sessionsResult = await query<{
    id: string;
    topic_id_str: string;
    topic_name: string;
    session_status: string;
    time_mode: string;
    questions_answered: number;
    questions_correct: number;
    questions_skipped: number;
    xp_earned: number;
    time_elapsed_ms: number;
    created_at: string;
    completed_at: string | null;
  }>(
    `SELECT id, topic_id_str, topic_name, session_status, time_mode,
            questions_answered, questions_correct, questions_skipped,
            xp_earned, time_elapsed_ms, created_at, completed_at
     FROM quiz_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [childId, limit, offset]
  );

  return {
    sessions: sessionsResult.rows.map(s => ({
      id: s.id,
      topicId: s.topic_id_str,
      topicName: s.topic_name,
      status: s.session_status,
      timeMode: s.time_mode,
      questionsAnswered: s.questions_answered,
      questionsCorrect: s.questions_correct,
      questionsSkipped: s.questions_skipped,
      xpEarned: s.xp_earned,
      timeElapsedMs: s.time_elapsed_ms,
      createdAt: s.created_at,
      completedAt: s.completed_at,
    })),
    total: parseInt(countResult.rows[0]?.count || '0', 10),
  };
}

// ============================================
// ACTIVITY FEED
// ============================================

/**
 * Gets activity feed for a specific child
 */
export async function getChildActivity(
  parentId: string,
  childId: string,
  limit: number = 10
): Promise<ActivityItem[]> {
  // Verify parent-child relationship
  const childResult = await query<User>(
    'SELECT id, display_name, email FROM users WHERE id = $1 AND parent_id = $2',
    [childId, parentId]
  );

  if (!childResult.rows[0]) {
    throw new NotFoundError('Child not found or not linked to your account');
  }

  const child = childResult.rows[0];
  const childName = child.display_name ?? child.email.split('@')[0] ?? 'Child';

  // Get completed sessions as activity
  const sessions = await query<{
    id: string;
    topic_id_str: string;
    topic_name: string;
    questions_correct: number;
    questions_answered: number;
    xp_earned: number;
    completed_at: string;
  }>(
    `SELECT id, topic_id_str, topic_name, questions_correct, questions_answered, xp_earned, completed_at
     FROM quiz_sessions
     WHERE user_id = $1 AND session_status = 'completed'
     ORDER BY completed_at DESC
     LIMIT $2`,
    [childId, limit]
  );

  return sessions.rows.map(s => ({
    id: s.id,
    childId,
    childName,
    type: 'session_completed' as const,
    description: `Completed a quiz on ${s.topic_name}`,
    timestamp: s.completed_at,
    metadata: {
      topicId: s.topic_id_str,
      topicName: s.topic_name,
      xpEarned: s.xp_earned,
      questionsCorrect: s.questions_correct,
      questionsTotal: s.questions_answered,
    },
  }));
}

/**
 * Gets activity feed for all children
 */
export async function getAllChildrenActivity(
  parentId: string,
  limit: number = 20
): Promise<ActivityItem[]> {
  // Get all children
  const children = await query<{ id: string; display_name: string | null; email: string }>(
    'SELECT id, display_name, email FROM users WHERE parent_id = $1 AND is_active = true',
    [parentId]
  );

  if (children.rows.length === 0) {
    return [];
  }

  const childIds = children.rows.map(c => c.id);
  const childMap = new Map(children.rows.map(c => [
    c.id,
    c.display_name || c.email.split('@')[0]
  ]));

  // Get recent sessions from all children
  const sessions = await query<{
    id: string;
    user_id: string;
    topic_id_str: string;
    topic_name: string;
    questions_correct: number;
    questions_answered: number;
    xp_earned: number;
    completed_at: string;
  }>(
    `SELECT id, user_id, topic_id_str, topic_name, questions_correct, questions_answered, xp_earned, completed_at
     FROM quiz_sessions
     WHERE user_id = ANY($1) AND session_status = 'completed'
     ORDER BY completed_at DESC
     LIMIT $2`,
    [childIds, limit]
  );

  return sessions.rows.map(s => ({
    id: s.id,
    childId: s.user_id,
    childName: childMap.get(s.user_id) || 'Unknown',
    type: 'session_completed' as const,
    description: `Completed a quiz on ${s.topic_name}`,
    timestamp: s.completed_at,
    metadata: {
      topicId: s.topic_id_str,
      topicName: s.topic_name,
      xpEarned: s.xp_earned,
      questionsCorrect: s.questions_correct,
      questionsTotal: s.questions_answered,
    },
  }));
}
