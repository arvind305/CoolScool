/**
 * Achievement Service
 *
 * Checks and awards achievements after quiz session completion.
 * Also provides XP level calculation (derived from total XP, no new table).
 */

import { query } from '../db/index.js';
import * as analyticsService from './analytics.service.js';

// ============================================
// INTERFACES
// ============================================

export interface AchievementDefinition {
  id: string;
  achievement_id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  xp_reward: number;
  criteria: { type: string; value: number };
  sort_order: number;
}

export interface AwardedAchievement {
  achievementId: string;
  name: string;
  description: string | null;
  icon: string;
  xpReward: number;
}

export interface UserAchievementView {
  achievementId: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  xpReward: number;
  sortOrder: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface AchievementStats {
  earned: number;
  total: number;
  recentAchievements: UserAchievementView[];
}

export interface LevelInfo {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  progress: number;
  totalXp: number;
}

// ============================================
// LEVEL CALCULATION
// ============================================

/**
 * Calculate level from total XP.
 * Each level requires level * 100 XP (Level 1 = 100, Level 2 = 200, etc.)
 */
export function calculateLevel(totalXp: number): { level: number; currentXp: number; xpForNextLevel: number; progress: number } {
  let level = 1;
  let xpRemaining = totalXp;
  while (xpRemaining >= level * 100 && level < 50) {
    xpRemaining -= level * 100;
    level++;
  }
  const xpForNext = level * 100;
  return {
    level,
    currentXp: xpRemaining,
    xpForNextLevel: xpForNext,
    progress: Math.round((xpRemaining / xpForNext) * 100),
  };
}

/**
 * Get level info for a user by querying their total XP.
 */
export async function getLevelInfo(userId: string): Promise<LevelInfo> {
  const result = await query<{ total_xp: string }>(
    `SELECT COALESCE(SUM(xp_earned), 0) as total_xp
     FROM quiz_sessions
     WHERE user_id = $1 AND session_status = 'completed'`,
    [userId]
  );
  const totalXp = parseInt(result.rows[0]?.total_xp || '0', 10);
  const levelData = calculateLevel(totalXp);
  return { ...levelData, totalXp };
}

// ============================================
// ACHIEVEMENT CHECKING
// ============================================

/**
 * Check and award achievements after session completion.
 * Returns array of newly earned achievements.
 */
export async function checkAndAwardAchievements(userId: string): Promise<AwardedAchievement[]> {
  // Get all achievement definitions
  const allAchievements = await query<AchievementDefinition>(
    'SELECT * FROM achievements ORDER BY sort_order'
  );

  // Get user's already-earned achievements
  const earnedResult = await query<{ achievement_id: string }>(
    'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
    [userId]
  );
  const earnedSet = new Set(earnedResult.rows.map(r => r.achievement_id));

  // Filter to unearned achievements
  const unearned = allAchievements.rows.filter(a => !earnedSet.has(a.achievement_id));
  if (unearned.length === 0) return [];

  // Gather user stats (only fetch what we need)
  const criteriaTypes = new Set(unearned.map(a => a.criteria.type));
  const stats = await gatherStats(userId, criteriaTypes);

  // Check each unearned achievement
  const newlyEarned: AwardedAchievement[] = [];

  for (const achievement of unearned) {
    const { type, value } = achievement.criteria;
    let met = false;

    switch (type) {
      case 'sessions':
        met = (stats.sessionsCompleted ?? 0) >= value;
        break;
      case 'streak':
        met = (stats.currentStreak ?? 0) >= value;
        break;
      case 'perfect_session':
        met = (stats.perfectSessions ?? 0) >= value;
        break;
      case 'perfect_sessions':
        met = (stats.perfectSessions ?? 0) >= value;
        break;
      case 'xp':
        met = (stats.totalXp ?? 0) >= value;
        break;
      case 'topics_mastered':
        met = (stats.topicsMastered ?? 0) >= value;
        break;
      case 'daily_challenges':
        met = (stats.dailyChallengesCorrect ?? 0) >= value;
        break;
    }

    if (met) {
      // Award the achievement
      await query(
        `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, achievement.achievement_id]
      );

      newlyEarned.push({
        achievementId: achievement.achievement_id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xp_reward,
      });
    }
  }

  // Add bonus XP from newly earned achievements to the user's latest session
  if (newlyEarned.length > 0) {
    const bonusXp = newlyEarned.reduce((sum, a) => sum + a.xpReward, 0);
    if (bonusXp > 0) {
      await query(
        `UPDATE quiz_sessions
         SET xp_earned = xp_earned + $1
         WHERE id = (
           SELECT id FROM quiz_sessions
           WHERE user_id = $2 AND session_status = 'completed'
           ORDER BY completed_at DESC LIMIT 1
         )`,
        [bonusXp, userId]
      );
    }
  }

  return newlyEarned;
}

// ============================================
// QUERIES
// ============================================

/**
 * Get all achievements with earned status for a user.
 */
export async function getUserAchievements(userId: string): Promise<UserAchievementView[]> {
  const result = await query<{
    achievement_id: string;
    name: string;
    description: string | null;
    category: string;
    icon: string;
    xp_reward: number;
    sort_order: number;
    earned_at: string | null;
  }>(
    `SELECT a.achievement_id, a.name, a.description, a.category, a.icon,
            a.xp_reward, a.sort_order, ua.earned_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON a.achievement_id = ua.achievement_id AND ua.user_id = $1
     ORDER BY a.sort_order`,
    [userId]
  );

  return result.rows.map(row => ({
    achievementId: row.achievement_id,
    name: row.name,
    description: row.description,
    category: row.category,
    icon: row.icon,
    xpReward: row.xp_reward,
    sortOrder: row.sort_order,
    earned: row.earned_at !== null,
    earnedAt: row.earned_at,
  }));
}

/**
 * Get achievement stats summary for dashboard card.
 */
export async function getAchievementStats(userId: string): Promise<AchievementStats> {
  const achievements = await getUserAchievements(userId);
  const earned = achievements.filter(a => a.earned);

  return {
    earned: earned.length,
    total: achievements.length,
    recentAchievements: earned
      .sort((a, b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''))
      .slice(0, 3),
  };
}

// ============================================
// HELPERS
// ============================================

interface UserStats {
  sessionsCompleted?: number;
  currentStreak?: number;
  perfectSessions?: number;
  totalXp?: number;
  topicsMastered?: number;
  dailyChallengesCorrect?: number;
}

/**
 * Gather user stats for the given criteria types. Only queries what's needed.
 */
async function gatherStats(userId: string, types: Set<string>): Promise<UserStats> {
  const stats: UserStats = {};

  // Sessions completed
  if (types.has('sessions')) {
    const r = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM quiz_sessions WHERE user_id = $1 AND session_status = 'completed'`,
      [userId]
    );
    stats.sessionsCompleted = parseInt(r.rows[0]?.count || '0', 10);
  }

  // Current streak
  if (types.has('streak')) {
    const streakData = await analyticsService.getStreak(userId);
    stats.currentStreak = streakData.currentStreak;
  }

  // Perfect sessions (100% accuracy)
  if (types.has('perfect_session') || types.has('perfect_sessions')) {
    const r = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM quiz_sessions
       WHERE user_id = $1 AND session_status = 'completed'
         AND questions_answered > 0 AND questions_correct = questions_answered`,
      [userId]
    );
    stats.perfectSessions = parseInt(r.rows[0]?.count || '0', 10);
  }

  // Total XP
  if (types.has('xp')) {
    const r = await query<{ total: string }>(
      `SELECT COALESCE(SUM(xp_earned), 0) as total FROM quiz_sessions
       WHERE user_id = $1 AND session_status = 'completed'`,
      [userId]
    );
    stats.totalXp = parseInt(r.rows[0]?.total || '0', 10);
  }

  // Topics mastered (exam_ready band)
  if (types.has('topics_mastered')) {
    const r = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM topic_progress
       WHERE user_id = $1 AND proficiency_band = 'exam_ready'`,
      [userId]
    );
    stats.topicsMastered = parseInt(r.rows[0]?.count || '0', 10);
  }

  // Daily challenges completed correctly
  if (types.has('daily_challenges')) {
    const r = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM daily_challenge_attempts
       WHERE user_id = $1 AND is_correct = true`,
      [userId]
    );
    stats.dailyChallengesCorrect = parseInt(r.rows[0]?.count || '0', 10);
  }

  return stats;
}
