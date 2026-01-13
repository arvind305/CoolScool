/**
 * Progress Service
 *
 * Aggregates mastery and proficiency data for progress endpoints.
 * Handles export, import, and reset functionality.
 *
 * Note: Mastery and proficiency services handle the core tracking logic.
 * This service provides the user-facing aggregated view.
 */

import { query, withTransaction } from '../db/index.js';
import { ConceptProgress, MasteryData } from './mastery.service.js';
import {
  BAND_LABELS,
  ProficiencyBand,
  TopicProgress,
  getBandMessage,
  updateTopicProgress,
} from './proficiency.service.js';

// ============================================
// INTERFACES
// ============================================

export interface TopicProgressSummary {
  topic_id: string;
  topic_name: string;
  proficiency_band: ProficiencyBand;
  band_label: string;
  band_message: string;
  concepts_started: number;
  concepts_total: number;
  xp_earned: number;
  last_attempted_at: string | null;
}

export interface UserProgressSummary {
  user_id: string;
  total_xp: number;
  sessions_completed: number;
  topics_started: number;
  topics_total: number;
  topics: TopicProgressSummary[];
}

export interface ProgressExport {
  version: string;
  exported_at: string;
  user_id: string;
  cam_reference: {
    board: string;
    class_level: number;
    subject: string;
  };
  concept_progress: ConceptProgressExport[];
  topic_progress: TopicProgressExport[];
  session_stats: {
    total_sessions: number;
    completed_sessions: number;
    total_xp: number;
  };
}

interface ConceptProgressExport {
  concept_id_str: string;
  current_difficulty: string;
  total_attempts: number;
  total_correct: number;
  xp_earned: number;
  mastery_data: MasteryData;
  last_attempted_at: string | null;
}

interface TopicProgressExport {
  topic_id_str: string;
  proficiency_band: string;
  concepts_count: number;
  concepts_started: number;
  concepts_mastered: number;
  total_attempts: number;
  total_correct: number;
  xp_earned: number;
  last_attempted_at: string | null;
}

// ============================================
// PROGRESS QUERIES
// ============================================

/**
 * Gets full user progress across all topics
 */
export async function getUserProgress(userId: string): Promise<UserProgressSummary> {
  // Get all topics
  const topicsResult = await query<{ topic_id: string; topic_name: string }>(
    'SELECT topic_id, topic_name FROM topics ORDER BY topic_order'
  );

  // Get user's topic progress
  const topicProgressResult = await query<TopicProgress & { topic_name: string; topic_id_str: string }>(
    `SELECT tp.topic_id_str, tp.proficiency_band, tp.concepts_count, tp.concepts_started,
            tp.concepts_mastered, tp.total_attempts, tp.total_correct, tp.xp_earned,
            tp.last_attempted_at, t.topic_name,
            tp.topic_id_str as topic_id
     FROM topic_progress tp
     JOIN topics t ON tp.topic_id_str = t.topic_id
     WHERE tp.user_id = $1`,
    [userId]
  );

  const topicProgressMap = new Map<string, TopicProgress & { topic_name: string; topic_id_str: string }>();
  for (const tp of topicProgressResult.rows) {
    topicProgressMap.set(tp.topic_id_str, tp);
  }

  // Get concept counts per topic
  const conceptCountResult = await query<{ topic_id: string; count: string }>(
    `SELECT t.topic_id, COUNT(c.id) as count
     FROM topics t
     LEFT JOIN concepts c ON c.topic_id = t.id
     GROUP BY t.topic_id`
  );

  const conceptCountMap = new Map<string, number>();
  for (const row of conceptCountResult.rows) {
    conceptCountMap.set(row.topic_id, parseInt(row.count, 10));
  }

  // Get session stats
  const sessionStatsResult = await query<{ count: string; xp: string }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(xp_earned), 0) as xp
     FROM quiz_sessions
     WHERE user_id = $1 AND session_status = 'completed'`,
    [userId]
  );

  const sessionsCompleted = parseInt(sessionStatsResult.rows[0]?.count || '0', 10);

  // Build topic summaries
  const topics: TopicProgressSummary[] = topicsResult.rows.map(topic => {
    const progress = topicProgressMap.get(topic.topic_id);
    const conceptsTotal = conceptCountMap.get(topic.topic_id) || 0;

    if (progress) {
      return {
        topic_id: topic.topic_id,
        topic_name: topic.topic_name,
        proficiency_band: progress.proficiency_band as ProficiencyBand,
        band_label: BAND_LABELS[progress.proficiency_band as ProficiencyBand] || 'Not Started',
        band_message: getBandMessage(progress.proficiency_band as ProficiencyBand),
        concepts_started: progress.concepts_started,
        concepts_total: conceptsTotal,
        xp_earned: progress.xp_earned,
        last_attempted_at: progress.last_attempted_at,
      };
    }

    return {
      topic_id: topic.topic_id,
      topic_name: topic.topic_name,
      proficiency_band: 'not_started' as ProficiencyBand,
      band_label: BAND_LABELS['not_started'],
      band_message: getBandMessage('not_started'),
      concepts_started: 0,
      concepts_total: conceptsTotal,
      xp_earned: 0,
      last_attempted_at: null,
    };
  });

  // Calculate totals
  const totalXp = topics.reduce((sum, t) => sum + t.xp_earned, 0);
  const topicsStarted = topics.filter(t => t.proficiency_band !== 'not_started').length;

  return {
    user_id: userId,
    total_xp: totalXp,
    sessions_completed: sessionsCompleted,
    topics_started: topicsStarted,
    topics_total: topics.length,
    topics,
  };
}

/**
 * Gets dashboard summary (lightweight version)
 */
export async function getProgressSummary(userId: string): Promise<{
  total_xp: number;
  sessions_completed: number;
  topics_started: number;
  topics_total: number;
  proficiency_breakdown: Record<string, number>;
}> {
  // Get session stats
  const sessionStatsResult = await query<{ count: string; xp: string }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(xp_earned), 0) as xp
     FROM quiz_sessions
     WHERE user_id = $1 AND session_status = 'completed'`,
    [userId]
  );

  // Get topic counts
  const topicCountResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM topics'
  );

  // Get proficiency breakdown
  const proficiencyResult = await query<{ proficiency_band: string; count: string }>(
    `SELECT proficiency_band, COUNT(*) as count
     FROM topic_progress
     WHERE user_id = $1
     GROUP BY proficiency_band`,
    [userId]
  );

  // Get total XP from concept progress (more accurate)
  const xpResult = await query<{ total: string }>(
    'SELECT COALESCE(SUM(xp_earned), 0) as total FROM concept_progress WHERE user_id = $1',
    [userId]
  );

  const proficiencyBreakdown: Record<string, number> = {
    not_started: 0,
    building_familiarity: 0,
    growing_confidence: 0,
    consistent_understanding: 0,
    exam_ready: 0,
  };

  let topicsStarted = 0;
  for (const row of proficiencyResult.rows) {
    proficiencyBreakdown[row.proficiency_band] = parseInt(row.count, 10);
    topicsStarted += parseInt(row.count, 10);
  }

  const topicsTotal = parseInt(topicCountResult.rows[0]?.count || '0', 10);
  proficiencyBreakdown['not_started'] = topicsTotal - topicsStarted;

  return {
    total_xp: parseInt(xpResult.rows[0]?.total || '0', 10),
    sessions_completed: parseInt(sessionStatsResult.rows[0]?.count || '0', 10),
    topics_started: topicsStarted,
    topics_total: topicsTotal,
    proficiency_breakdown: proficiencyBreakdown,
  };
}

/**
 * Gets progress for a single topic
 */
export async function getTopicProgress(
  userId: string,
  topicIdStr: string
): Promise<TopicProgressSummary | null> {
  // Get topic info
  const topicResult = await query<{ topic_id: string; topic_name: string }>(
    'SELECT topic_id, topic_name FROM topics WHERE topic_id = $1',
    [topicIdStr]
  );

  if (!topicResult.rows[0]) {
    return null;
  }

  const topic = topicResult.rows[0];

  // Update topic progress (recalculate from concept progress)
  const progress = await updateTopicProgress(userId, topicIdStr);

  // Get concept count
  const conceptCountResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM concepts c
     JOIN topics t ON c.topic_id = t.id
     WHERE t.topic_id = $1`,
    [topicIdStr]
  );

  return {
    topic_id: topic.topic_id,
    topic_name: topic.topic_name,
    proficiency_band: progress.proficiency_band as ProficiencyBand,
    band_label: progress.proficiency_label,
    band_message: getBandMessage(progress.proficiency_band as ProficiencyBand),
    concepts_started: progress.concepts_started,
    concepts_total: parseInt(conceptCountResult.rows[0]?.count || '0', 10),
    xp_earned: progress.xp_earned,
    last_attempted_at: progress.last_attempted_at,
  };
}

// ============================================
// EXPORT / IMPORT
// ============================================

/**
 * Exports user progress as JSON
 */
export async function exportProgress(userId: string): Promise<ProgressExport> {
  // Get concept progress
  const conceptProgressResult = await query<ConceptProgress>(
    'SELECT * FROM concept_progress WHERE user_id = $1',
    [userId]
  );

  // Get topic progress
  const topicProgressResult = await query<{
    topic_id_str: string;
    proficiency_band: string;
    concepts_count: number;
    concepts_started: number;
    concepts_mastered: number;
    total_attempts: number;
    total_correct: number;
    xp_earned: number;
    last_attempted_at: string | null;
  }>(
    'SELECT topic_id_str, proficiency_band, concepts_count, concepts_started, concepts_mastered, total_attempts, total_correct, xp_earned, last_attempted_at FROM topic_progress WHERE user_id = $1',
    [userId]
  );

  // Get session stats
  const sessionStatsResult = await query<{ total: string; completed: string; xp: string }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE session_status = 'completed') as completed,
       COALESCE(SUM(xp_earned), 0) as xp
     FROM quiz_sessions
     WHERE user_id = $1`,
    [userId]
  );

  const stats = sessionStatsResult.rows[0] || { total: '0', completed: '0', xp: '0' };

  return {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    user_id: userId,
    cam_reference: {
      board: 'ICSE',
      class_level: 5,
      subject: 'Mathematics',
    },
    concept_progress: conceptProgressResult.rows.map(cp => ({
      concept_id_str: cp.concept_id_str,
      current_difficulty: cp.current_difficulty,
      total_attempts: cp.total_attempts,
      total_correct: cp.total_correct,
      xp_earned: cp.xp_earned,
      mastery_data: typeof cp.mastery_data === 'string'
        ? JSON.parse(cp.mastery_data)
        : cp.mastery_data,
      last_attempted_at: cp.last_attempted_at,
    })),
    topic_progress: topicProgressResult.rows,
    session_stats: {
      total_sessions: parseInt(stats.total, 10),
      completed_sessions: parseInt(stats.completed, 10),
      total_xp: parseInt(stats.xp, 10),
    },
  };
}

/**
 * Imports user progress from JSON
 */
export async function importProgress(
  userId: string,
  data: ProgressExport,
  merge: boolean = false
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  await withTransaction(async (client) => {
    // Clear existing progress if not merging
    if (!merge) {
      await client.query('DELETE FROM concept_progress WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM topic_progress WHERE user_id = $1', [userId]);
    }

    // Import concept progress
    for (const cp of data.concept_progress) {
      // Validate concept exists
      const conceptResult = await client.query(
        'SELECT id FROM concepts WHERE concept_id = $1',
        [cp.concept_id_str]
      );

      if (!conceptResult.rows[0]) {
        skipped++;
        continue;
      }

      const conceptId = conceptResult.rows[0].id;

      if (merge) {
        // Merge: update if exists, insert if not
        await client.query(
          `INSERT INTO concept_progress
           (user_id, concept_id, concept_id_str, current_difficulty, total_attempts, total_correct, xp_earned, mastery_data, last_attempted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (user_id, concept_id) DO UPDATE SET
             current_difficulty = CASE WHEN concept_progress.total_attempts < EXCLUDED.total_attempts THEN EXCLUDED.current_difficulty ELSE concept_progress.current_difficulty END,
             total_attempts = GREATEST(concept_progress.total_attempts, EXCLUDED.total_attempts),
             total_correct = GREATEST(concept_progress.total_correct, EXCLUDED.total_correct),
             xp_earned = GREATEST(concept_progress.xp_earned, EXCLUDED.xp_earned),
             mastery_data = CASE WHEN concept_progress.total_attempts < EXCLUDED.total_attempts THEN EXCLUDED.mastery_data ELSE concept_progress.mastery_data END,
             last_attempted_at = GREATEST(concept_progress.last_attempted_at, EXCLUDED.last_attempted_at)`,
          [
            userId,
            conceptId,
            cp.concept_id_str,
            cp.current_difficulty,
            cp.total_attempts,
            cp.total_correct,
            cp.xp_earned,
            JSON.stringify(cp.mastery_data),
            cp.last_attempted_at,
          ]
        );
      } else {
        // Replace: just insert
        await client.query(
          `INSERT INTO concept_progress
           (user_id, concept_id, concept_id_str, current_difficulty, total_attempts, total_correct, xp_earned, mastery_data, last_attempted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId,
            conceptId,
            cp.concept_id_str,
            cp.current_difficulty,
            cp.total_attempts,
            cp.total_correct,
            cp.xp_earned,
            JSON.stringify(cp.mastery_data),
            cp.last_attempted_at,
          ]
        );
      }

      imported++;
    }

    // Recalculate topic progress (don't import directly - recalculate from concepts)
    const uniqueTopics = new Set(
      data.concept_progress.map(cp => cp.concept_id_str.substring(0, 6))
    );

    for (const topicIdStr of uniqueTopics) {
      // Get topic progress data
      const progressResult = await client.query(
        `SELECT cp.concept_id_str as concept_id, cp.total_attempts, cp.mastery_data
         FROM concept_progress cp
         JOIN concepts c ON cp.concept_id = c.id
         JOIN topics t ON c.topic_id = t.id
         WHERE cp.user_id = $1 AND t.topic_id = $2`,
        [userId, topicIdStr]
      );

      // Get CAM concepts
      const camResult = await client.query(
        `SELECT c.concept_id, c.difficulty_levels
         FROM concepts c
         JOIN topics t ON c.topic_id = t.id
         WHERE t.topic_id = $1`,
        [topicIdStr]
      );

      // Simplified proficiency calculation for import
      // The full calculation happens in updateTopicProgress
    }
  });

  // Recalculate all topic progress after import
  const uniqueTopics = new Set(
    data.concept_progress.map(cp => cp.concept_id_str.substring(0, 6))
  );

  for (const topicIdStr of uniqueTopics) {
    await updateTopicProgress(userId, topicIdStr);
  }

  return { imported, skipped };
}

// ============================================
// RESET
// ============================================

/**
 * Resets all user progress
 */
export async function resetProgress(userId: string): Promise<void> {
  await withTransaction(async (client) => {
    // Delete concept progress
    await client.query('DELETE FROM concept_progress WHERE user_id = $1', [userId]);

    // Delete topic progress
    await client.query('DELETE FROM topic_progress WHERE user_id = $1', [userId]);

    // Optionally delete session history (keeping for audit)
    // await client.query('DELETE FROM session_answers WHERE session_id IN (SELECT id FROM quiz_sessions WHERE user_id = $1)', [userId]);
    // await client.query('DELETE FROM quiz_sessions WHERE user_id = $1', [userId]);
  });
}
