/**
 * Analytics Service
 *
 * Provides analytics data for user progress: daily trends,
 * subject breakdowns, streaks, and weak area identification.
 */

import { query } from '../db/index.js';

// ============================================
// INTERFACES
// ============================================

export interface DailyTrend {
  date: string;
  sessions: number;
  questions: number;
  xp: number;
  accuracy: number;
}

export interface SubjectBreakdown {
  subject: string;
  sessions: number;
  questions: number;
  correct: number;
  accuracy: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface WeakArea {
  topicId: string;
  topicName: string;
  subject: string;
  totalAttempts: number;
  totalCorrect: number;
  accuracy: number;
  proficiencyBand: string;
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Get daily activity trends for a user over the specified number of days.
 * Missing days are filled in with zeros.
 */
export async function getDailyTrends(
  userId: string,
  days: number = 30
): Promise<DailyTrend[]> {
  const result = await query<{
    date: string;
    sessions: string;
    questions: string;
    xp: string;
    accuracy: string;
  }>(
    `SELECT
      DATE(qs.completed_at) as date,
      COUNT(DISTINCT qs.id) as sessions,
      COALESCE(SUM(qs.questions_answered), 0) as questions,
      COALESCE(SUM(qs.xp_earned), 0) as xp,
      CASE WHEN SUM(qs.questions_answered) > 0
        THEN ROUND(SUM(qs.questions_correct)::numeric / SUM(qs.questions_answered) * 100, 1)
        ELSE 0
      END as accuracy
    FROM quiz_sessions qs
    WHERE qs.user_id = $1
      AND qs.session_status = 'completed'
      AND qs.completed_at >= NOW() - make_interval(days => $2)
    GROUP BY DATE(qs.completed_at)
    ORDER BY date ASC`,
    [userId, days]
  );

  // Build a map of existing data
  const dataMap = new Map<string, DailyTrend>();
  for (const row of result.rows) {
    const dateStr = new Date(row.date).toISOString().split('T')[0]!;
    dataMap.set(dateStr, {
      date: dateStr,
      sessions: Number(row.sessions),
      questions: Number(row.questions),
      xp: Number(row.xp),
      accuracy: Number(row.accuracy),
    });
  }

  // Fill in missing days with zeros
  const trends: DailyTrend[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]!;
    const existing = dataMap.get(dateStr);

    trends.push(
      existing ?? {
        date: dateStr,
        sessions: 0,
        questions: 0,
        xp: 0,
        accuracy: 0,
      }
    );
  }

  return trends;
}

/**
 * Get subject-level breakdown of user activity.
 */
export async function getSubjectBreakdown(
  userId: string
): Promise<SubjectBreakdown[]> {
  const result = await query<{
    subject: string;
    sessions: string;
    questions: string;
    correct: string;
    accuracy: string;
  }>(
    `SELECT
      th.subject,
      COUNT(DISTINCT qs.id) as sessions,
      COALESCE(SUM(qs.questions_answered), 0) as questions,
      COALESCE(SUM(qs.questions_correct), 0) as correct,
      CASE WHEN SUM(qs.questions_answered) > 0
        THEN ROUND(SUM(qs.questions_correct)::numeric / SUM(qs.questions_answered) * 100, 1)
        ELSE 0
      END as accuracy
    FROM quiz_sessions qs
    JOIN topics t ON qs.topic_id_str = t.topic_id
    JOIN themes th ON t.theme_id = th.id
    WHERE qs.user_id = $1 AND qs.session_status = 'completed'
    GROUP BY th.subject`,
    [userId]
  );

  return result.rows.map((row) => ({
    subject: row.subject,
    sessions: Number(row.sessions),
    questions: Number(row.questions),
    correct: Number(row.correct),
    accuracy: Number(row.accuracy),
  }));
}

/**
 * Calculate current streak and longest streak from session timestamps.
 * Current streak: consecutive days with at least one completed session, going backwards from today.
 * Longest streak: maximum consecutive days ever.
 */
export async function getStreak(userId: string): Promise<StreakData> {
  const result = await query<{ date: string }>(
    `SELECT DISTINCT DATE(qs.completed_at) as date
    FROM quiz_sessions qs
    WHERE qs.user_id = $1 AND qs.session_status = 'completed'
    ORDER BY date DESC`,
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    };
  }

  const activeDates: Date[] = result.rows.map((row) => {
    const d = new Date(row.date);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const firstDate = activeDates[0]!;
  const lastActiveDate = firstDate.toISOString().split('T')[0]!;

  // Calculate current streak (going backwards from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  const diffFromToday = Math.floor(
    (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Current streak only counts if the user was active today or yesterday
  if (diffFromToday <= 1) {
    currentStreak = 1;
    for (let i = 1; i < activeDates.length; i++) {
      const prev = activeDates[i - 1]!;
      const curr = activeDates[i]!;
      const diffDays = Math.floor(
        (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let runningStreak = 1;

  for (let i = 1; i < activeDates.length; i++) {
    const prev = activeDates[i - 1]!;
    const curr = activeDates[i]!;
    const diffDays = Math.floor(
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      runningStreak++;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else {
      runningStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
  };
}

/**
 * Find topics with lowest accuracy (minimum 3 attempts).
 */
export async function getWeakAreas(
  userId: string,
  limit: number = 5
): Promise<WeakArea[]> {
  const result = await query<{
    topic_id: string;
    topic_name: string;
    subject: string;
    total_attempts: string;
    total_correct: string;
    accuracy: string;
    proficiency_band: string;
  }>(
    `SELECT
      tp.topic_id_str as topic_id,
      t.topic_name,
      th.subject,
      tp.total_attempts,
      tp.total_correct,
      CASE WHEN tp.total_attempts > 0
        THEN ROUND(tp.total_correct::numeric / tp.total_attempts * 100, 1)
        ELSE 0
      END as accuracy,
      tp.proficiency_band
    FROM topic_progress tp
    JOIN topics t ON tp.topic_id_str = t.topic_id
    JOIN themes th ON t.theme_id = th.id
    WHERE tp.user_id = $1 AND tp.total_attempts >= 3
    ORDER BY accuracy ASC
    LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    topicId: row.topic_id,
    topicName: row.topic_name,
    subject: row.subject,
    totalAttempts: Number(row.total_attempts),
    totalCorrect: Number(row.total_correct),
    accuracy: Number(row.accuracy),
    proficiencyBand: row.proficiency_band,
  }));
}
