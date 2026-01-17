/**
 * Proficiency Calculator Module
 *
 * Calculates topic-level proficiency based on concept mastery.
 * Uses proficiency bands to represent learning progress.
 */

import type {
  ProficiencyBand,
  ProficiencyStats,
  TopicProficiency,
  TopicProgress,
  ConceptProgress,
  CAMConcept,
} from './types';

// ============================================================
// Constants
// ============================================================

export const PROFICIENCY_BANDS: Record<string, ProficiencyBand> = {
  NOT_STARTED: 'not_started',
  BUILDING_FAMILIARITY: 'building_familiarity',
  GROWING_CONFIDENCE: 'growing_confidence',
  CONSISTENT_UNDERSTANDING: 'consistent_understanding',
  EXAM_READY: 'exam_ready',
};

export const BAND_LABELS: Record<ProficiencyBand, string> = {
  not_started: 'Not Started',
  building_familiarity: 'Building Familiarity',
  growing_confidence: 'Growing Confidence',
  consistent_understanding: 'Consistent Understanding',
  exam_ready: 'Exam Ready',
};

export const BAND_ORDER: ProficiencyBand[] = [
  'not_started',
  'building_familiarity',
  'growing_confidence',
  'consistent_understanding',
  'exam_ready',
];

// Thresholds for band advancement
export const BAND_THRESHOLDS = {
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

// ============================================================
// Helper Functions
// ============================================================

/**
 * Safely calculates a percentage, returning 0 if denominator is 0
 */
function safePct(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

// ============================================================
// Main Functions
// ============================================================

/**
 * Calculates mastery statistics across all concepts for a topic
 *
 * @param conceptProgresses - Array of concept progress objects
 * @param camConcepts - CAM concept definitions
 * @returns Mastery statistics
 */
export function calculateMasteryStats(
  conceptProgresses: ConceptProgress[],
  camConcepts: CAMConcept[]
): ProficiencyStats {
  let conceptsStarted = 0;
  let familiarityMastered = 0;
  let familiarityTotal = 0;
  let applicationMastered = 0;
  let applicationTotal = 0;
  let applicationStarted = 0;
  let examStyleMastered = 0;
  let examStyleTotal = 0;
  let examStyleStarted = 0;

  // Build progress map for quick lookup
  const progressMap = new Map<string, ConceptProgress>();
  for (const progress of conceptProgresses) {
    progressMap.set(progress.concept_id, progress);
  }

  // Count totals and mastery for each concept
  for (const concept of camConcepts) {
    const progress = progressMap.get(concept.concept_id);
    const allowedDifficulties = concept.difficulty_levels || [];

    // Count total available for each difficulty
    if (allowedDifficulties.includes('familiarity')) familiarityTotal++;
    if (allowedDifficulties.includes('application')) applicationTotal++;
    if (allowedDifficulties.includes('exam_style')) examStyleTotal++;

    // Skip if no progress or not attempted
    if (!progress || progress.total_attempts === 0) continue;

    conceptsStarted++;
    const masteryData = progress.mastery_by_difficulty || {};

    // Check mastery status for each difficulty
    if (masteryData.familiarity?.mastered) familiarityMastered++;
    if (masteryData.application?.attempts > 0) applicationStarted++;
    if (masteryData.application?.mastered) applicationMastered++;
    if (masteryData.exam_style?.attempts > 0) examStyleStarted++;
    if (masteryData.exam_style?.mastered) examStyleMastered++;
  }

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

/**
 * Calculates the proficiency band for a topic
 *
 * @param conceptProgresses - Array of concept progress objects
 * @param camConcepts - CAM concept definitions
 * @returns Topic proficiency information
 */
export function calculateTopicProficiency(
  conceptProgresses: ConceptProgress[],
  camConcepts: CAMConcept[]
): TopicProficiency {
  const totalConcepts = camConcepts.length;

  if (totalConcepts === 0) {
    return {
      band: 'not_started',
      label: BAND_LABELS['not_started'],
      level: 0,
      stats: null,
    };
  }

  const stats = calculateMasteryStats(conceptProgresses, camConcepts);
  let band: ProficiencyBand = 'not_started';

  // Check bands from highest to lowest
  if (
    stats.familiarityMasteredPct >= 100 &&
    stats.applicationMasteredPct >= 100 &&
    stats.examStyleMasteredPct >= 100
  ) {
    band = 'exam_ready';
  } else if (
    stats.familiarityMasteredPct >= 100 &&
    stats.applicationMasteredPct >= 75 &&
    stats.examStyleStartedPct >= 25
  ) {
    band = 'consistent_understanding';
  } else if (
    stats.familiarityMasteredPct >= 50 &&
    stats.applicationStartedPct >= 25
  ) {
    band = 'growing_confidence';
  } else if (stats.conceptsStarted >= 1) {
    band = 'building_familiarity';
  }

  return {
    band,
    label: BAND_LABELS[band],
    level: BAND_ORDER.indexOf(band),
    stats: {
      concepts_total: totalConcepts,
      concepts_started: stats.conceptsStarted,
    },
  };
}

/**
 * Creates a complete topic progress object
 *
 * @param topicId - The topic identifier
 * @param conceptProgresses - Array of concept progress objects for this topic
 * @param camConcepts - CAM concept definitions for this topic
 * @returns Topic progress object
 */
export function createTopicProgress(
  topicId: string,
  conceptProgresses: ConceptProgress[],
  camConcepts: CAMConcept[]
): TopicProgress {
  const proficiency = calculateTopicProficiency(conceptProgresses, camConcepts);

  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalXp = 0;
  let lastAttemptedAt: string | null = null;

  for (const progress of conceptProgresses) {
    totalAttempts += progress.total_attempts || 0;
    totalCorrect += progress.total_correct || 0;
    totalXp += progress.xp_earned || 0;
    if (
      progress.last_attempted_at &&
      (!lastAttemptedAt || progress.last_attempted_at > lastAttemptedAt)
    ) {
      lastAttemptedAt = progress.last_attempted_at;
    }
  }

  return {
    topic_id: topicId,
    proficiency_band: proficiency.band,
    proficiency_label: proficiency.label,
    proficiency_level: proficiency.level,
    concepts_count: camConcepts.length,
    concepts_started: proficiency.stats?.concepts_started || 0,
    total_attempts: totalAttempts,
    total_correct: totalCorrect,
    xp_earned: totalXp,
    last_attempted_at: lastAttemptedAt,
  };
}

/**
 * Gets a friendly message for a proficiency band
 *
 * @param band - The proficiency band
 * @returns A user-friendly message
 */
export function getBandMessage(band: ProficiencyBand): string {
  const messages: Record<ProficiencyBand, string> = {
    not_started: 'Ready to start exploring this topic!',
    building_familiarity: "You're getting to know these concepts!",
    growing_confidence: 'Your understanding is growing stronger!',
    consistent_understanding: "You're showing consistent understanding!",
    exam_ready: "You're well prepared for this topic!",
  };
  return messages[band] || messages['not_started'];
}

/**
 * Gets the next band the student should aim for
 *
 * @param currentBand - The current proficiency band
 * @returns The next band, or null if already at the highest
 */
export function getNextBand(currentBand: ProficiencyBand): ProficiencyBand | null {
  const currentIndex = BAND_ORDER.indexOf(currentBand);
  if (currentIndex < 0 || currentIndex >= BAND_ORDER.length - 1) {
    return null;
  }
  return BAND_ORDER[currentIndex + 1];
}

/**
 * Gets the requirements to reach the next band
 *
 * @param currentBand - The current proficiency band
 * @param stats - Current mastery statistics
 * @returns Description of what's needed to advance
 */
export function getAdvancementRequirements(
  currentBand: ProficiencyBand,
  stats: ProficiencyStats
): string {
  const nextBand = getNextBand(currentBand);
  if (!nextBand) return 'Congratulations! You have mastered this topic!';

  switch (nextBand) {
    case 'building_familiarity':
      return 'Start practicing to build familiarity with the concepts.';
    case 'growing_confidence':
      return `Master ${Math.max(0, 50 - stats.familiarityMasteredPct)}% more familiarity questions and start application questions.`;
    case 'consistent_understanding':
      return `Master all familiarity questions and ${Math.max(0, 75 - stats.applicationMasteredPct)}% more application questions.`;
    case 'exam_ready':
      return `Master all application questions and all exam-style questions.`;
    default:
      return 'Keep practicing to improve!';
  }
}
