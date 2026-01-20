/**
 * Proficiency Service
 *
 * Server-side implementation of proficiency bands from North Star §9:
 * - No percentages, scores, or ranks
 * - Proficiency bands: "Building familiarity", "Growing confidence",
 *   "Consistent understanding", "Exam-ready"
 * - Bands computed per topic over repeated attempts
 */

import { query } from '../db/index.js';
import { MasteryData } from './mastery.service.js';

// Proficiency bands as defined in North Star §9
export const PROFICIENCY_BANDS = {
  NOT_STARTED: 'not_started',
  BUILDING_FAMILIARITY: 'building_familiarity',
  GROWING_CONFIDENCE: 'growing_confidence',
  CONSISTENT_UNDERSTANDING: 'consistent_understanding',
  EXAM_READY: 'exam_ready',
} as const;

export type ProficiencyBand = typeof PROFICIENCY_BANDS[keyof typeof PROFICIENCY_BANDS];

// Display labels for proficiency bands (child-friendly, pressure-free)
export const BAND_LABELS: Record<ProficiencyBand, string> = {
  [PROFICIENCY_BANDS.NOT_STARTED]: 'Not Started',
  [PROFICIENCY_BANDS.BUILDING_FAMILIARITY]: 'Building Familiarity',
  [PROFICIENCY_BANDS.GROWING_CONFIDENCE]: 'Growing Confidence',
  [PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING]: 'Consistent Understanding',
  [PROFICIENCY_BANDS.EXAM_READY]: 'Exam Ready',
};

// Band order for progression
export const BAND_ORDER: ProficiencyBand[] = [
  PROFICIENCY_BANDS.NOT_STARTED,
  PROFICIENCY_BANDS.BUILDING_FAMILIARITY,
  PROFICIENCY_BANDS.GROWING_CONFIDENCE,
  PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING,
  PROFICIENCY_BANDS.EXAM_READY,
];

// Thresholds for proficiency band calculation
const BAND_THRESHOLDS = {
  BUILDING_FAMILIARITY: {
    min_concepts_started: 1,
    min_familiarity_mastered_pct: 0,
  },
  GROWING_CONFIDENCE: {
    min_familiarity_mastered_pct: 50,
    min_application_started_pct: 25,
  },
  CONSISTENT_UNDERSTANDING: {
    min_familiarity_mastered_pct: 100,
    min_application_mastered_pct: 75,
    min_exam_style_started_pct: 25,
  },
  EXAM_READY: {
    min_familiarity_mastered_pct: 100,
    min_application_mastered_pct: 100,
    min_exam_style_mastered_pct: 100,
  },
};

interface ConceptProgressRow {
  concept_id: string;
  total_attempts: number;
  mastery_data: MasteryData | string;
}

interface CAMConcept {
  concept_id: string;
  difficulty_levels: string[];
}

interface MasteryStats {
  conceptsStarted: number;
  familiarityMastered: number;
  familiarityMasteredPct: number;
  applicationMastered: number;
  applicationMasteredPct: number;
  applicationStarted: number;
  applicationStartedPct: number;
  examStyleMastered: number;
  examStyleMasteredPct: number;
  examStyleStarted: number;
  examStyleStartedPct: number;
}

export interface TopicProficiency {
  band: ProficiencyBand;
  label: string;
  level: number;
  stats: {
    concepts_total: number;
    concepts_started: number;
    familiarity_mastered: number;
    application_mastered: number;
    exam_style_mastered: number;
  } | null;
}

export interface TopicProgress {
  topic_id: string;
  proficiency_band: ProficiencyBand;
  proficiency_label: string;
  proficiency_level: number;
  concepts_count: number;
  concepts_started: number;
  concepts_mastered: number;
  total_attempts: number;
  total_correct: number;
  xp_earned: number;
  last_attempted_at: string | null;
}

// Calculate proficiency band for a topic
export function calculateTopicProficiency(
  conceptProgresses: ConceptProgressRow[],
  camConcepts: CAMConcept[]
): TopicProficiency {
  const totalConcepts = camConcepts.length;

  if (totalConcepts === 0) {
    return {
      band: PROFICIENCY_BANDS.NOT_STARTED,
      label: BAND_LABELS[PROFICIENCY_BANDS.NOT_STARTED],
      level: 0,
      stats: null,
    };
  }

  const stats = calculateMasteryStats(conceptProgresses, camConcepts);
  let band: ProficiencyBand = PROFICIENCY_BANDS.NOT_STARTED;

  // Check Exam Ready first (highest)
  if (
    stats.familiarityMasteredPct >= BAND_THRESHOLDS.EXAM_READY.min_familiarity_mastered_pct &&
    stats.applicationMasteredPct >= BAND_THRESHOLDS.EXAM_READY.min_application_mastered_pct &&
    stats.examStyleMasteredPct >= BAND_THRESHOLDS.EXAM_READY.min_exam_style_mastered_pct
  ) {
    band = PROFICIENCY_BANDS.EXAM_READY;
  }
  // Check Consistent Understanding
  else if (
    stats.familiarityMasteredPct >= BAND_THRESHOLDS.CONSISTENT_UNDERSTANDING.min_familiarity_mastered_pct &&
    stats.applicationMasteredPct >= BAND_THRESHOLDS.CONSISTENT_UNDERSTANDING.min_application_mastered_pct &&
    stats.examStyleStartedPct >= BAND_THRESHOLDS.CONSISTENT_UNDERSTANDING.min_exam_style_started_pct
  ) {
    band = PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING;
  }
  // Check Growing Confidence
  else if (
    stats.familiarityMasteredPct >= BAND_THRESHOLDS.GROWING_CONFIDENCE.min_familiarity_mastered_pct &&
    stats.applicationStartedPct >= BAND_THRESHOLDS.GROWING_CONFIDENCE.min_application_started_pct
  ) {
    band = PROFICIENCY_BANDS.GROWING_CONFIDENCE;
  }
  // Check Building Familiarity
  else if (stats.conceptsStarted >= BAND_THRESHOLDS.BUILDING_FAMILIARITY.min_concepts_started) {
    band = PROFICIENCY_BANDS.BUILDING_FAMILIARITY;
  }

  return {
    band,
    label: BAND_LABELS[band],
    level: BAND_ORDER.indexOf(band),
    stats: {
      concepts_total: totalConcepts,
      concepts_started: stats.conceptsStarted,
      familiarity_mastered: stats.familiarityMastered,
      application_mastered: stats.applicationMastered,
      exam_style_mastered: stats.examStyleMastered,
    },
  };
}

// Calculate mastery statistics
function calculateMasteryStats(
  conceptProgresses: ConceptProgressRow[],
  camConcepts: CAMConcept[]
): MasteryStats {
  let conceptsStarted = 0;
  let familiarityMastered = 0;
  let familiarityTotal = 0;
  let applicationMastered = 0;
  let applicationTotal = 0;
  let applicationStarted = 0;
  let examStyleMastered = 0;
  let examStyleTotal = 0;
  let examStyleStarted = 0;

  const progressMap = new Map<string, ConceptProgressRow>();
  for (const progress of conceptProgresses) {
    progressMap.set(progress.concept_id, progress);
  }

  for (const concept of camConcepts) {
    const progress = progressMap.get(concept.concept_id);
    const allowedDifficulties = concept.difficulty_levels || [];

    if (allowedDifficulties.includes('familiarity')) familiarityTotal++;
    if (allowedDifficulties.includes('application')) applicationTotal++;
    if (allowedDifficulties.includes('exam_style')) examStyleTotal++;

    if (!progress || progress.total_attempts === 0) continue;

    conceptsStarted++;

    const masteryData: MasteryData =
      typeof progress.mastery_data === 'string'
        ? JSON.parse(progress.mastery_data)
        : progress.mastery_data;

    if (masteryData.familiarity?.mastered) familiarityMastered++;
    if (masteryData.application) {
      if (masteryData.application.attempts > 0) applicationStarted++;
      if (masteryData.application.mastered) applicationMastered++;
    }
    if (masteryData.exam_style) {
      if (masteryData.exam_style.attempts > 0) examStyleStarted++;
      if (masteryData.exam_style.mastered) examStyleMastered++;
    }
  }

  const safePct = (num: number, denom: number): number =>
    denom > 0 ? Math.round((num / denom) * 100) : 0;

  return {
    conceptsStarted,
    familiarityMastered,
    familiarityMasteredPct: safePct(familiarityMastered, familiarityTotal),
    applicationMastered,
    applicationMasteredPct: safePct(applicationMastered, applicationTotal),
    applicationStarted,
    applicationStartedPct: safePct(applicationStarted, applicationTotal),
    examStyleMastered,
    examStyleMasteredPct: safePct(examStyleMastered, examStyleTotal),
    examStyleStarted,
    examStyleStartedPct: safePct(examStyleStarted, examStyleTotal),
  };
}

// Update topic progress in database (curriculum-scoped)
export async function updateTopicProgress(
  userId: string,
  curriculumId: string,
  topicIdStr: string
): Promise<TopicProgress> {
  // Get all concept progress for this topic in this curriculum
  const progressResult = await query<ConceptProgressRow>(
    `SELECT cp.concept_id_str as concept_id, cp.total_attempts, cp.mastery_data
     FROM concept_progress cp
     JOIN concepts c ON cp.concept_id = c.id
     JOIN topics t ON c.topic_id = t.id
     WHERE cp.user_id = $1 AND cp.curriculum_id = $2 AND t.topic_id = $3`,
    [userId, curriculumId, topicIdStr]
  );

  // Get CAM concepts for this topic in this curriculum
  const camResult = await query<CAMConcept>(
    `SELECT c.concept_id, c.difficulty_levels
     FROM concepts c
     JOIN topics t ON c.topic_id = t.id
     WHERE c.curriculum_id = $1 AND t.topic_id = $2`,
    [curriculumId, topicIdStr]
  );

  const proficiency = calculateTopicProficiency(progressResult.rows, camResult.rows);

  // Calculate aggregates
  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalXp = 0;
  let lastAttemptedAt: string | null = null;

  const fullProgressResult = await query<{
    total_attempts: number;
    total_correct: number;
    xp_earned: number;
    last_attempted_at: string | null;
  }>(
    `SELECT SUM(total_attempts) as total_attempts,
            SUM(total_correct) as total_correct,
            SUM(xp_earned) as xp_earned,
            MAX(last_attempted_at) as last_attempted_at
     FROM concept_progress cp
     JOIN concepts c ON cp.concept_id = c.id
     JOIN topics t ON c.topic_id = t.id
     WHERE cp.user_id = $1 AND cp.curriculum_id = $2 AND t.topic_id = $3`,
    [userId, curriculumId, topicIdStr]
  );

  if (fullProgressResult.rows[0]) {
    totalAttempts = fullProgressResult.rows[0].total_attempts || 0;
    totalCorrect = fullProgressResult.rows[0].total_correct || 0;
    totalXp = fullProgressResult.rows[0].xp_earned || 0;
    lastAttemptedAt = fullProgressResult.rows[0].last_attempted_at;
  }

  const topicProgress: TopicProgress = {
    topic_id: topicIdStr,
    proficiency_band: proficiency.band,
    proficiency_label: proficiency.label,
    proficiency_level: proficiency.level,
    concepts_count: camResult.rows.length,
    concepts_started: proficiency.stats?.concepts_started || 0,
    concepts_mastered: proficiency.stats?.exam_style_mastered || 0,
    total_attempts: totalAttempts,
    total_correct: totalCorrect,
    xp_earned: totalXp,
    last_attempted_at: lastAttemptedAt,
  };

  // Upsert topic progress with curriculum_id
  await query(
    `INSERT INTO topic_progress (user_id, curriculum_id, topic_id_str, proficiency_band, concepts_count,
       concepts_started, concepts_mastered, total_attempts, total_correct, xp_earned, last_attempted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_id, curriculum_id, topic_id_str) DO UPDATE SET
       proficiency_band = EXCLUDED.proficiency_band,
       concepts_count = EXCLUDED.concepts_count,
       concepts_started = EXCLUDED.concepts_started,
       concepts_mastered = EXCLUDED.concepts_mastered,
       total_attempts = EXCLUDED.total_attempts,
       total_correct = EXCLUDED.total_correct,
       xp_earned = EXCLUDED.xp_earned,
       last_attempted_at = EXCLUDED.last_attempted_at,
       updated_at = NOW()`,
    [
      userId,
      curriculumId,
      topicIdStr,
      topicProgress.proficiency_band,
      topicProgress.concepts_count,
      topicProgress.concepts_started,
      topicProgress.concepts_mastered,
      topicProgress.total_attempts,
      topicProgress.total_correct,
      topicProgress.xp_earned,
      topicProgress.last_attempted_at,
    ]
  );

  return topicProgress;
}

// Get child-friendly message for a proficiency band
export function getBandMessage(band: ProficiencyBand): string {
  const messages: Record<ProficiencyBand, string> = {
    [PROFICIENCY_BANDS.NOT_STARTED]: "Ready to start exploring this topic!",
    [PROFICIENCY_BANDS.BUILDING_FAMILIARITY]: "You're getting to know these concepts!",
    [PROFICIENCY_BANDS.GROWING_CONFIDENCE]: "Your understanding is growing stronger!",
    [PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING]: "You're showing consistent understanding!",
    [PROFICIENCY_BANDS.EXAM_READY]: "You're well prepared for this topic!",
  };

  return messages[band] || messages[PROFICIENCY_BANDS.NOT_STARTED];
}
