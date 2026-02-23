/**
 * Parent Service
 *
 * Manages parent-child relationships and parent access to child data.
 */

import { query, withTransaction } from '../db/index.js';
import { User } from '../models/user.model.js';
import { NotFoundError, BadRequestError, ConflictError } from '../middleware/error.js';
import * as analyticsService from './analytics.service.js';

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

// ============================================
// WEEKLY SUMMARY
// ============================================

export interface WeekStats {
  sessionsCompleted: number;
  questionsAnswered: number;
  questionsCorrect: number;
  accuracy: number;
  xpEarned: number;
  timeSpentMs: number;
}

export interface WeeklySummary {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  deltas: {
    sessions: number;
    questions: number;
    accuracy: number;
    xp: number;
  };
}

/**
 * Gets weekly summary comparing current week vs previous week
 */
export async function getChildWeeklySummary(
  parentId: string,
  childId: string
): Promise<WeeklySummary> {
  await verifyParentChild(parentId, childId);

  const result = await query<{
    week_label: string;
    sessions_completed: string;
    questions_answered: string;
    questions_correct: string;
    accuracy: string;
    xp_earned: string;
    time_spent_ms: string;
  }>(
    `WITH week_data AS (
      SELECT
        CASE
          WHEN qs.completed_at >= date_trunc('week', NOW()) THEN 'current'
          ELSE 'previous'
        END as week_label,
        COUNT(*) as sessions_completed,
        COALESCE(SUM(qs.questions_answered), 0) as questions_answered,
        COALESCE(SUM(qs.questions_correct), 0) as questions_correct,
        CASE WHEN SUM(qs.questions_answered) > 0
          THEN ROUND(SUM(qs.questions_correct)::numeric / SUM(qs.questions_answered) * 100, 1)
          ELSE 0
        END as accuracy,
        COALESCE(SUM(qs.xp_earned), 0) as xp_earned,
        COALESCE(SUM(qs.time_elapsed_ms), 0) as time_spent_ms
      FROM quiz_sessions qs
      WHERE qs.user_id = $1
        AND qs.session_status = 'completed'
        AND qs.completed_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
      GROUP BY week_label
    )
    SELECT * FROM week_data`,
    [childId]
  );

  const empty: WeekStats = {
    sessionsCompleted: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    accuracy: 0,
    xpEarned: 0,
    timeSpentMs: 0,
  };

  let currentWeek = { ...empty };
  let previousWeek = { ...empty };

  for (const row of result.rows) {
    const stats: WeekStats = {
      sessionsCompleted: Number(row.sessions_completed),
      questionsAnswered: Number(row.questions_answered),
      questionsCorrect: Number(row.questions_correct),
      accuracy: Number(row.accuracy),
      xpEarned: Number(row.xp_earned),
      timeSpentMs: Number(row.time_spent_ms),
    };
    if (row.week_label === 'current') {
      currentWeek = stats;
    } else {
      previousWeek = stats;
    }
  }

  return {
    currentWeek,
    previousWeek,
    deltas: {
      sessions: currentWeek.sessionsCompleted - previousWeek.sessionsCompleted,
      questions: currentWeek.questionsAnswered - previousWeek.questionsAnswered,
      accuracy: Math.round((currentWeek.accuracy - previousWeek.accuracy) * 10) / 10,
      xp: currentWeek.xpEarned - previousWeek.xpEarned,
    },
  };
}

// ============================================
// SUBJECT BREAKDOWN
// ============================================

/**
 * Gets subject breakdown for a child (parent-verified wrapper)
 */
export async function getChildSubjectBreakdown(
  parentId: string,
  childId: string
) {
  await verifyParentChild(parentId, childId);
  return analyticsService.getSubjectBreakdown(childId);
}

// ============================================
// AREAS OF CONCERN
// ============================================

export interface AreaOfConcern {
  topicId: string;
  topicName: string;
  subject: string;
  accuracy: number;
  trend: 'declining' | 'consistently_low';
  recentAccuracy: number;
  previousAccuracy: number;
  totalAttempts: number;
}

/**
 * Gets areas of concern combining weak areas + declining trends
 */
export async function getChildConcerns(
  parentId: string,
  childId: string
): Promise<AreaOfConcern[]> {
  await verifyParentChild(parentId, childId);

  // Get consistently low areas from analytics
  const weakAreas = await analyticsService.getWeakAreas(childId, 10);

  // Get declining trends: compare last 7 days vs previous 7 days
  const trendResult = await query<{
    topic_id: string;
    topic_name: string;
    subject: string;
    recent_correct: string;
    recent_total: string;
    recent_accuracy: string;
    previous_correct: string;
    previous_total: string;
    previous_accuracy: string;
  }>(
    `WITH recent AS (
      SELECT
        q.topic_id,
        t.topic_name,
        c.subject,
        COUNT(*) FILTER (WHERE sa.is_correct) as correct,
        COUNT(*) as total
      FROM session_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN topics t ON q.topic_id = t.id
      JOIN themes th ON t.theme_id = th.id
      JOIN curricula c ON th.curriculum_id = c.id
      JOIN quiz_sessions qs ON sa.session_id = qs.id
      WHERE qs.user_id = $1
        AND sa.answered_at >= NOW() - INTERVAL '7 days'
      GROUP BY q.topic_id, t.topic_name, c.subject
      HAVING COUNT(*) >= 3
    ),
    previous AS (
      SELECT
        q.topic_id,
        COUNT(*) FILTER (WHERE sa.is_correct) as correct,
        COUNT(*) as total
      FROM session_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN quiz_sessions qs ON sa.session_id = qs.id
      WHERE qs.user_id = $1
        AND sa.answered_at >= NOW() - INTERVAL '14 days'
        AND sa.answered_at < NOW() - INTERVAL '7 days'
      GROUP BY q.topic_id
      HAVING COUNT(*) >= 3
    )
    SELECT
      r.topic_id,
      r.topic_name,
      r.subject,
      r.correct as recent_correct,
      r.total as recent_total,
      ROUND(r.correct::numeric / r.total * 100, 1) as recent_accuracy,
      COALESCE(p.correct, 0) as previous_correct,
      COALESCE(p.total, 0) as previous_total,
      CASE WHEN COALESCE(p.total, 0) > 0
        THEN ROUND(p.correct::numeric / p.total * 100, 1)
        ELSE 0
      END as previous_accuracy
    FROM recent r
    LEFT JOIN previous p ON r.topic_id = p.topic_id
    WHERE COALESCE(p.total, 0) > 0
    ORDER BY (ROUND(r.correct::numeric / r.total * 100, 1) - ROUND(p.correct::numeric / p.total * 100, 1)) ASC`,
    [childId]
  );

  // Build combined concerns list
  const concerns = new Map<string, AreaOfConcern>();

  // Add consistently low from weak areas
  for (const wa of weakAreas) {
    if (wa.accuracy < 60) {
      concerns.set(wa.topicId, {
        topicId: wa.topicId,
        topicName: wa.topicName,
        subject: wa.subject,
        accuracy: wa.accuracy,
        trend: 'consistently_low',
        recentAccuracy: wa.accuracy,
        previousAccuracy: wa.accuracy,
        totalAttempts: wa.totalAttempts,
      });
    }
  }

  // Add declining trends (accuracy dropped by 10+ points)
  for (const row of trendResult.rows) {
    const recentAcc = Number(row.recent_accuracy);
    const prevAcc = Number(row.previous_accuracy);
    if (prevAcc - recentAcc >= 10) {
      const existing = concerns.get(row.topic_id);
      if (existing) {
        existing.trend = 'declining';
        existing.recentAccuracy = recentAcc;
        existing.previousAccuracy = prevAcc;
      } else {
        concerns.set(row.topic_id, {
          topicId: row.topic_id,
          topicName: row.topic_name,
          subject: row.subject,
          accuracy: recentAcc,
          trend: 'declining',
          recentAccuracy: recentAcc,
          previousAccuracy: prevAcc,
          totalAttempts: Number(row.recent_total) + Number(row.previous_total),
        });
      }
    }
  }

  return Array.from(concerns.values()).sort((a, b) => a.accuracy - b.accuracy);
}

// ============================================
// SESSION DETAIL
// ============================================

export interface SessionDetailAnswer {
  questionId: string;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation: string | null;
  answeredAt: string;
}

export interface SessionDetail {
  sessionId: string;
  topicId: string;
  topicName: string;
  questionsAnswered: number;
  questionsCorrect: number;
  xpEarned: number;
  timeElapsedMs: number;
  completedAt: string | null;
  answers: SessionDetailAnswer[];
}

/**
 * Gets detailed session data including individual answers
 */
export async function getChildSessionDetail(
  parentId: string,
  childId: string,
  sessionId: string
): Promise<SessionDetail> {
  await verifyParentChild(parentId, childId);

  // Verify session belongs to the child
  const sessionResult = await query<{
    id: string;
    topic_id_str: string;
    topic_name: string;
    questions_answered: number;
    questions_correct: number;
    xp_earned: number;
    time_elapsed_ms: number;
    completed_at: string | null;
  }>(
    `SELECT id, topic_id_str, topic_name, questions_answered, questions_correct,
            xp_earned, time_elapsed_ms, completed_at
     FROM quiz_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, childId]
  );

  if (!sessionResult.rows[0]) {
    throw new NotFoundError('Session not found');
  }

  const session = sessionResult.rows[0];

  // Get individual answers
  const answersResult = await query<{
    question_id: string;
    question_text: string;
    selected_option: string;
    correct_option: string;
    is_correct: boolean;
    explanation: string | null;
    answered_at: string;
  }>(
    `SELECT
      sa.question_id,
      q.question_text,
      sa.selected_option,
      q.correct_answer as correct_option,
      sa.is_correct,
      q.explanation,
      sa.answered_at
    FROM session_answers sa
    JOIN questions q ON sa.question_id = q.id
    WHERE sa.session_id = $1
    ORDER BY sa.answered_at ASC`,
    [sessionId]
  );

  return {
    sessionId: session.id,
    topicId: session.topic_id_str,
    topicName: session.topic_name,
    questionsAnswered: session.questions_answered,
    questionsCorrect: session.questions_correct,
    xpEarned: session.xp_earned,
    timeElapsedMs: session.time_elapsed_ms,
    completedAt: session.completed_at,
    answers: answersResult.rows.map(a => ({
      questionId: a.question_id,
      questionText: a.question_text,
      selectedOption: a.selected_option,
      correctOption: a.correct_option,
      isCorrect: a.is_correct,
      explanation: a.explanation,
      answeredAt: a.answered_at,
    })),
  };
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export interface NotificationPreferences {
  emailDigest: 'daily' | 'weekly' | 'off';
  lowAccuracyAlerts: boolean;
  inactivityAlerts: boolean;
  inactivityThresholdDays: number;
}

/**
 * Gets notification preferences for a parent (returns defaults if not set)
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const result = await query<{
    email_digest: string;
    low_accuracy_alerts: boolean;
    inactivity_alerts: boolean;
    inactivity_threshold_days: number;
  }>(
    `SELECT email_digest, low_accuracy_alerts, inactivity_alerts, inactivity_threshold_days
     FROM parent_notification_preferences
     WHERE user_id = $1`,
    [userId]
  );

  if (!result.rows[0]) {
    return {
      emailDigest: 'weekly',
      lowAccuracyAlerts: true,
      inactivityAlerts: true,
      inactivityThresholdDays: 3,
    };
  }

  const row = result.rows[0];
  return {
    emailDigest: row.email_digest as NotificationPreferences['emailDigest'],
    lowAccuracyAlerts: row.low_accuracy_alerts,
    inactivityAlerts: row.inactivity_alerts,
    inactivityThresholdDays: row.inactivity_threshold_days,
  };
}

/**
 * Updates notification preferences (upsert)
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const merged = { ...current, ...updates };

  await query(
    `INSERT INTO parent_notification_preferences
       (user_id, email_digest, low_accuracy_alerts, inactivity_alerts, inactivity_threshold_days)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET
       email_digest = EXCLUDED.email_digest,
       low_accuracy_alerts = EXCLUDED.low_accuracy_alerts,
       inactivity_alerts = EXCLUDED.inactivity_alerts,
       inactivity_threshold_days = EXCLUDED.inactivity_threshold_days,
       updated_at = NOW()`,
    [userId, merged.emailDigest, merged.lowAccuracyAlerts, merged.inactivityAlerts, merged.inactivityThresholdDays]
  );

  return merged;
}

// ============================================
// HELPERS
// ============================================

/**
 * Verifies parent-child relationship, throws NotFoundError if not linked
 */
async function verifyParentChild(parentId: string, childId: string): Promise<void> {
  const result = await query(
    'SELECT id FROM users WHERE id = $1 AND parent_id = $2',
    [childId, parentId]
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('Child not found or not linked to your account');
  }
}
