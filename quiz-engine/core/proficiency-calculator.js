/**
 * Proficiency Calculator Module
 *
 * Calculates proficiency bands per topic following North Star §9:
 * - No percentages, scores, or ranks
 * - Proficiency bands: "Building familiarity", "Growing confidence",
 *   "Consistent understanding", "Exam-ready"
 * - Bands computed per topic over repeated attempts
 *
 * @module quiz-engine/core/proficiency-calculator
 */

'use strict';

/**
 * Proficiency bands as defined in North Star §9
 * These are the ONLY allowed progress indicators
 */
const PROFICIENCY_BANDS = {
  NOT_STARTED: 'not_started',
  BUILDING_FAMILIARITY: 'building_familiarity',
  GROWING_CONFIDENCE: 'growing_confidence',
  CONSISTENT_UNDERSTANDING: 'consistent_understanding',
  EXAM_READY: 'exam_ready'
};

/**
 * Display labels for proficiency bands (child-friendly, pressure-free)
 */
const BAND_LABELS = {
  [PROFICIENCY_BANDS.NOT_STARTED]: 'Not Started',
  [PROFICIENCY_BANDS.BUILDING_FAMILIARITY]: 'Building Familiarity',
  [PROFICIENCY_BANDS.GROWING_CONFIDENCE]: 'Growing Confidence',
  [PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING]: 'Consistent Understanding',
  [PROFICIENCY_BANDS.EXAM_READY]: 'Exam Ready'
};

/**
 * Band order for progression (index represents level)
 */
const BAND_ORDER = [
  PROFICIENCY_BANDS.NOT_STARTED,
  PROFICIENCY_BANDS.BUILDING_FAMILIARITY,
  PROFICIENCY_BANDS.GROWING_CONFIDENCE,
  PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING,
  PROFICIENCY_BANDS.EXAM_READY
];

/**
 * Thresholds for proficiency band calculation
 * Based on concept mastery across the topic
 */
const BAND_THRESHOLDS = {
  // Building Familiarity: At least one concept attempted with familiarity level
  BUILDING_FAMILIARITY: {
    min_concepts_started: 1,
    min_familiarity_mastered_pct: 0
  },
  // Growing Confidence: 50%+ concepts have familiarity mastered
  GROWING_CONFIDENCE: {
    min_familiarity_mastered_pct: 50,
    min_application_started_pct: 25
  },
  // Consistent Understanding: 75%+ concepts have application mastered
  CONSISTENT_UNDERSTANDING: {
    min_familiarity_mastered_pct: 100,
    min_application_mastered_pct: 75,
    min_exam_style_started_pct: 25
  },
  // Exam Ready: All concepts have exam_style mastered (where available)
  EXAM_READY: {
    min_familiarity_mastered_pct: 100,
    min_application_mastered_pct: 100,
    min_exam_style_mastered_pct: 100
  }
};

/**
 * Calculates proficiency band for a topic based on concept progress
 *
 * @param {Object[]} conceptProgresses - Array of concept progress objects for the topic
 * @param {Object[]} camConcepts - CAM concept definitions (to know allowed difficulties)
 * @returns {Object} Proficiency band result
 */
function calculateTopicProficiency(conceptProgresses, camConcepts) {
  const totalConcepts = camConcepts.length;

  if (totalConcepts === 0) {
    return {
      band: PROFICIENCY_BANDS.NOT_STARTED,
      label: BAND_LABELS[PROFICIENCY_BANDS.NOT_STARTED],
      level: 0,
      stats: null
    };
  }

  // Calculate statistics
  const stats = calculateMasteryStats(conceptProgresses, camConcepts);

  // Determine band based on thresholds
  let band = PROFICIENCY_BANDS.NOT_STARTED;

  // Check Exam Ready first (highest)
  if (stats.familiarityMasteredPct >= BAND_THRESHOLDS.EXAM_READY.min_familiarity_mastered_pct &&
      stats.applicationMasteredPct >= BAND_THRESHOLDS.EXAM_READY.min_application_mastered_pct &&
      stats.examStyleMasteredPct >= BAND_THRESHOLDS.EXAM_READY.min_exam_style_mastered_pct) {
    band = PROFICIENCY_BANDS.EXAM_READY;
  }
  // Check Consistent Understanding
  else if (stats.familiarityMasteredPct >= BAND_THRESHOLDS.CONSISTENT_UNDERSTANDING.min_familiarity_mastered_pct &&
           stats.applicationMasteredPct >= BAND_THRESHOLDS.CONSISTENT_UNDERSTANDING.min_application_mastered_pct &&
           stats.examStyleStartedPct >= BAND_THRESHOLDS.CONSISTENT_UNDERSTANDING.min_exam_style_started_pct) {
    band = PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING;
  }
  // Check Growing Confidence
  else if (stats.familiarityMasteredPct >= BAND_THRESHOLDS.GROWING_CONFIDENCE.min_familiarity_mastered_pct &&
           stats.applicationStartedPct >= BAND_THRESHOLDS.GROWING_CONFIDENCE.min_application_started_pct) {
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
      exam_style_mastered: stats.examStyleMastered
    }
  };
}

/**
 * Calculates mastery statistics for proficiency calculation
 *
 * @param {Object[]} conceptProgresses - Concept progress objects
 * @param {Object[]} camConcepts - CAM concept definitions
 * @returns {Object} Mastery statistics
 */
function calculateMasteryStats(conceptProgresses, camConcepts) {
  let conceptsStarted = 0;
  let familiarityMastered = 0;
  let familiarityTotal = 0;
  let applicationMastered = 0;
  let applicationTotal = 0;
  let applicationStarted = 0;
  let examStyleMastered = 0;
  let examStyleTotal = 0;
  let examStyleStarted = 0;

  // Build a map of progress by concept ID
  const progressMap = new Map();
  for (const progress of conceptProgresses) {
    progressMap.set(progress.concept_id, progress);
  }

  // Analyze each CAM concept
  for (const concept of camConcepts) {
    const progress = progressMap.get(concept.concept_id);
    const allowedDifficulties = concept.difficulty_levels || [];

    // Count difficulty availability
    if (allowedDifficulties.includes('familiarity')) {
      familiarityTotal++;
    }
    if (allowedDifficulties.includes('application')) {
      applicationTotal++;
    }
    if (allowedDifficulties.includes('exam_style')) {
      examStyleTotal++;
    }

    // Skip if no progress exists
    if (!progress || progress.total_attempts === 0) {
      continue;
    }

    conceptsStarted++;

    // Check mastery per difficulty
    const masteryData = progress.mastery_by_difficulty || {};

    if (masteryData.familiarity) {
      if (masteryData.familiarity.mastered) {
        familiarityMastered++;
      }
    }

    if (masteryData.application) {
      if (masteryData.application.attempts > 0) {
        applicationStarted++;
      }
      if (masteryData.application.mastered) {
        applicationMastered++;
      }
    }

    if (masteryData.exam_style) {
      if (masteryData.exam_style.attempts > 0) {
        examStyleStarted++;
      }
      if (masteryData.exam_style.mastered) {
        examStyleMastered++;
      }
    }
  }

  // Calculate percentages (handle division by zero)
  const safePct = (num, denom) => denom > 0 ? Math.round((num / denom) * 100) : 0;

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
    examStyleStartedPct: safePct(examStyleStarted, examStyleTotal)
  };
}

/**
 * Creates a topic progress summary object
 *
 * @param {string} topicId - Topic ID
 * @param {Object[]} conceptProgresses - Concept progress objects for this topic
 * @param {Object[]} camConcepts - CAM concept definitions
 * @returns {Object} Topic progress summary
 */
function createTopicProgress(topicId, conceptProgresses, camConcepts) {
  const proficiency = calculateTopicProficiency(conceptProgresses, camConcepts);

  // Calculate aggregates
  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalXp = 0;
  let lastAttemptedAt = null;

  for (const progress of conceptProgresses) {
    totalAttempts += progress.total_attempts || 0;
    totalCorrect += progress.total_correct || 0;
    totalXp += progress.xp_earned || 0;

    if (progress.last_attempted_at) {
      if (!lastAttemptedAt || progress.last_attempted_at > lastAttemptedAt) {
        lastAttemptedAt = progress.last_attempted_at;
      }
    }
  }

  return {
    topic_id: topicId,
    proficiency_band: proficiency.band,
    proficiency_label: proficiency.label,
    proficiency_level: proficiency.level,
    concepts_count: camConcepts.length,
    concepts_started: proficiency.stats?.concepts_started || 0,
    concepts_mastered: proficiency.stats?.exam_style_mastered || 0,
    total_attempts: totalAttempts,
    total_correct: totalCorrect,
    xp_earned: totalXp,
    last_attempted_at: lastAttemptedAt
  };
}

/**
 * Gets a child-friendly message for a proficiency band
 *
 * @param {string} band - Proficiency band value
 * @returns {string} Encouraging message
 */
function getBandMessage(band) {
  const messages = {
    [PROFICIENCY_BANDS.NOT_STARTED]: 'Ready to start exploring this topic!',
    [PROFICIENCY_BANDS.BUILDING_FAMILIARITY]: 'You\'re getting to know these concepts!',
    [PROFICIENCY_BANDS.GROWING_CONFIDENCE]: 'Your understanding is growing stronger!',
    [PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING]: 'You\'re showing consistent understanding!',
    [PROFICIENCY_BANDS.EXAM_READY]: 'You\'re well prepared for this topic!'
  };

  return messages[band] || messages[PROFICIENCY_BANDS.NOT_STARTED];
}

/**
 * Compares two proficiency bands
 *
 * @param {string} band1 - First band
 * @param {string} band2 - Second band
 * @returns {number} -1 if band1 < band2, 0 if equal, 1 if band1 > band2
 */
function compareBands(band1, band2) {
  const level1 = BAND_ORDER.indexOf(band1);
  const level2 = BAND_ORDER.indexOf(band2);

  if (level1 < level2) return -1;
  if (level1 > level2) return 1;
  return 0;
}

// Export module
module.exports = {
  PROFICIENCY_BANDS,
  BAND_LABELS,
  BAND_ORDER,
  BAND_THRESHOLDS,
  calculateTopicProficiency,
  calculateMasteryStats,
  createTopicProgress,
  getBandMessage,
  compareBands
};
