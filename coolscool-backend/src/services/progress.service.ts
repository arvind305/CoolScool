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
import * as CurriculumModel from '../models/curriculum.model.js';

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
// HELPER FUNCTIONS
// ============================================

/**
 * Gets the curriculum ID for progress operations.
 * Uses provided curriculum ID or falls back to user's default or system default.
 */
async function resolveCurriculumId(curriculumId?: string): Promise<string> {
  if (curriculumId) {
    return curriculumId;
  }

  // Fall back to default curriculum
  const defaultCurriculum = await CurriculumModel.getDefault();
  if (!defaultCurriculum) {
    throw new Error('No curriculum available');
  }
  return defaultCurriculum.id;
}

// ============================================
// PROGRESS QUERIES
// ============================================

/**
 * Gets full user progress across all topics in a curriculum
 */
export async function getUserProgress(userId: string, curriculumId?: string): Promise<UserProgressSummary> {
  const resolvedCurriculumId = await resolveCurriculumId(curriculumId);

  // Get all topics for this curriculum
  const topicsResult = await query<{ topic_id: string; topic_name: string }>(
    'SELECT topic_id, topic_name FROM topics WHERE curriculum_id = $1 ORDER BY topic_order',
    [resolvedCurriculumId]
  );

  // Get user's topic progress for this curriculum
  const topicProgressResult = await query<TopicProgress & { topic_name: string; topic_id_str: string }>(
    `SELECT tp.topic_id_str, tp.proficiency_band, tp.concepts_count, tp.concepts_started,
            tp.concepts_mastered, tp.total_attempts, tp.total_correct, tp.xp_earned,
            tp.last_attempted_at, t.topic_name,
            tp.topic_id_str as topic_id
     FROM topic_progress tp
     JOIN topics t ON tp.topic_id_str = t.topic_id
     WHERE tp.user_id = $1 AND tp.curriculum_id = $2`,
    [userId, resolvedCurriculumId]
  );

  const topicProgressMap = new Map<string, TopicProgress & { topic_name: string; topic_id_str: string }>();
  for (const tp of topicProgressResult.rows) {
    topicProgressMap.set(tp.topic_id_str, tp);
  }

  // Get concept counts per topic for this curriculum
  const conceptCountResult = await query<{ topic_id: string; count: string }>(
    `SELECT t.topic_id, COUNT(c.id) as count
     FROM topics t
     LEFT JOIN concepts c ON c.topic_id = t.id
     WHERE t.curriculum_id = $1
     GROUP BY t.topic_id`,
    [resolvedCurriculumId]
  );

  const conceptCountMap = new Map<string, number>();
  for (const row of conceptCountResult.rows) {
    conceptCountMap.set(row.topic_id, parseInt(row.count, 10));
  }

  // Get session stats for this curriculum
  const sessionStatsResult = await query<{ count: string; xp: string }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(xp_earned), 0) as xp
     FROM quiz_sessions
     WHERE user_id = $1 AND curriculum_id = $2 AND session_status = 'completed'`,
    [userId, resolvedCurriculumId]
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
 * Gets dashboard summary (lightweight version) for a curriculum
 */
export async function getProgressSummary(userId: string, curriculumId?: string): Promise<{
  total_xp: number;
  sessions_completed: number;
  topics_started: number;
  topics_total: number;
  proficiency_breakdown: Record<string, number>;
}> {
  const resolvedCurriculumId = await resolveCurriculumId(curriculumId);

  // Get session stats for this curriculum
  const sessionStatsResult = await query<{ count: string; xp: string }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(xp_earned), 0) as xp
     FROM quiz_sessions
     WHERE user_id = $1 AND curriculum_id = $2 AND session_status = 'completed'`,
    [userId, resolvedCurriculumId]
  );

  // Get topic counts for this curriculum
  const topicCountResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM topics WHERE curriculum_id = $1',
    [resolvedCurriculumId]
  );

  // Get proficiency breakdown for this curriculum
  const proficiencyResult = await query<{ proficiency_band: string; count: string }>(
    `SELECT proficiency_band, COUNT(*) as count
     FROM topic_progress
     WHERE user_id = $1 AND curriculum_id = $2
     GROUP BY proficiency_band`,
    [userId, resolvedCurriculumId]
  );

  // Get total XP from concept progress for this curriculum (more accurate)
  const xpResult = await query<{ total: string }>(
    'SELECT COALESCE(SUM(xp_earned), 0) as total FROM concept_progress WHERE user_id = $1 AND curriculum_id = $2',
    [userId, resolvedCurriculumId]
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
 * Gets progress for a single topic in a curriculum
 */
export async function getTopicProgress(
  userId: string,
  topicIdStr: string,
  curriculumId?: string
): Promise<TopicProgressSummary | null> {
  const resolvedCurriculumId = await resolveCurriculumId(curriculumId);

  // Get topic info for this curriculum
  const topicResult = await query<{ topic_id: string; topic_name: string }>(
    'SELECT topic_id, topic_name FROM topics WHERE curriculum_id = $1 AND topic_id = $2',
    [resolvedCurriculumId, topicIdStr]
  );

  if (!topicResult.rows[0]) {
    return null;
  }

  const topic = topicResult.rows[0];

  // Update topic progress (recalculate from concept progress)
  const progress = await updateTopicProgress(userId, resolvedCurriculumId, topicIdStr);

  // Get concept count for this curriculum
  const conceptCountResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM concepts c
     JOIN topics t ON c.topic_id = t.id
     WHERE c.curriculum_id = $1 AND t.topic_id = $2`,
    [resolvedCurriculumId, topicIdStr]
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
 * Exports user progress as JSON for a curriculum
 */
export async function exportProgress(userId: string, curriculumId?: string): Promise<ProgressExport> {
  const resolvedCurriculumId = await resolveCurriculumId(curriculumId);

  // Get curriculum info
  const curriculum = await CurriculumModel.findById(resolvedCurriculumId);
  if (!curriculum) {
    throw new Error('Curriculum not found');
  }

  // Get concept progress for this curriculum
  const conceptProgressResult = await query<ConceptProgress>(
    'SELECT * FROM concept_progress WHERE user_id = $1 AND curriculum_id = $2',
    [userId, resolvedCurriculumId]
  );

  // Get topic progress for this curriculum
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
    'SELECT topic_id_str, proficiency_band, concepts_count, concepts_started, concepts_mastered, total_attempts, total_correct, xp_earned, last_attempted_at FROM topic_progress WHERE user_id = $1 AND curriculum_id = $2',
    [userId, resolvedCurriculumId]
  );

  // Get session stats for this curriculum
  const sessionStatsResult = await query<{ total: string; completed: string; xp: string }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE session_status = 'completed') as completed,
       COALESCE(SUM(xp_earned), 0) as xp
     FROM quiz_sessions
     WHERE user_id = $1 AND curriculum_id = $2`,
    [userId, resolvedCurriculumId]
  );

  const stats = sessionStatsResult.rows[0] || { total: '0', completed: '0', xp: '0' };

  return {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    user_id: userId,
    cam_reference: {
      board: curriculum.board,
      class_level: curriculum.class_level,
      subject: curriculum.subject,
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
 * Imports user progress from JSON for a curriculum
 */
export async function importProgress(
  userId: string,
  data: ProgressExport,
  merge: boolean = false,
  curriculumId?: string
): Promise<{ imported: number; skipped: number }> {
  const resolvedCurriculumId = await resolveCurriculumId(curriculumId);
  let imported = 0;
  let skipped = 0;

  await withTransaction(async (client) => {
    // Clear existing progress for this curriculum if not merging
    if (!merge) {
      await client.query('DELETE FROM concept_progress WHERE user_id = $1 AND curriculum_id = $2', [userId, resolvedCurriculumId]);
      await client.query('DELETE FROM topic_progress WHERE user_id = $1 AND curriculum_id = $2', [userId, resolvedCurriculumId]);
    }

    // Import concept progress
    for (const cp of data.concept_progress) {
      // Validate concept exists in this curriculum
      const conceptResult = await client.query(
        'SELECT id FROM concepts WHERE curriculum_id = $1 AND concept_id = $2',
        [resolvedCurriculumId, cp.concept_id_str]
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
           (user_id, curriculum_id, concept_id, concept_id_str, current_difficulty, total_attempts, total_correct, xp_earned, mastery_data, last_attempted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (user_id, curriculum_id, concept_id) DO UPDATE SET
             current_difficulty = CASE WHEN concept_progress.total_attempts < EXCLUDED.total_attempts THEN EXCLUDED.current_difficulty ELSE concept_progress.current_difficulty END,
             total_attempts = GREATEST(concept_progress.total_attempts, EXCLUDED.total_attempts),
             total_correct = GREATEST(concept_progress.total_correct, EXCLUDED.total_correct),
             xp_earned = GREATEST(concept_progress.xp_earned, EXCLUDED.xp_earned),
             mastery_data = CASE WHEN concept_progress.total_attempts < EXCLUDED.total_attempts THEN EXCLUDED.mastery_data ELSE concept_progress.mastery_data END,
             last_attempted_at = GREATEST(concept_progress.last_attempted_at, EXCLUDED.last_attempted_at)`,
          [
            userId,
            resolvedCurriculumId,
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
           (user_id, curriculum_id, concept_id, concept_id_str, current_difficulty, total_attempts, total_correct, xp_earned, mastery_data, last_attempted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            userId,
            resolvedCurriculumId,
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
  });

  // Recalculate all topic progress after import
  const uniqueTopics = new Set(
    data.concept_progress.map(cp => cp.concept_id_str.substring(0, 6))
  );

  for (const topicIdStr of uniqueTopics) {
    await updateTopicProgress(userId, resolvedCurriculumId, topicIdStr);
  }

  return { imported, skipped };
}

// ============================================
// RESET
// ============================================

/**
 * Resets user progress for a curriculum (or all curricula if not specified)
 */
export async function resetProgress(userId: string, curriculumId?: string): Promise<void> {
  await withTransaction(async (client) => {
    if (curriculumId) {
      // Reset progress for specific curriculum
      await client.query('DELETE FROM concept_progress WHERE user_id = $1 AND curriculum_id = $2', [userId, curriculumId]);
      await client.query('DELETE FROM topic_progress WHERE user_id = $1 AND curriculum_id = $2', [userId, curriculumId]);
    } else {
      // Reset progress for all curricula
      await client.query('DELETE FROM concept_progress WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM topic_progress WHERE user_id = $1', [userId]);
    }

    // Optionally delete session history (keeping for audit)
    // await client.query('DELETE FROM session_answers WHERE session_id IN (SELECT id FROM quiz_sessions WHERE user_id = $1)', [userId]);
    // await client.query('DELETE FROM quiz_sessions WHERE user_id = $1', [userId]);
  });
}
