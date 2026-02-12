/**
 * Mastery Tracker Module
 *
 * Tracks mastery per concept following North Star §10:
 * - Mastery threshold: 4/5 correct to advance difficulty
 * - XP awards: 10 (familiarity), 20 (application), 30 (exam_style)
 * - Tracks progress through difficulty levels
 *
 * @module quiz-engine/core/mastery-tracker
 */

'use strict';

// XP values per difficulty level (North Star §10)
const XP_VALUES = {
  familiarity: 10,
  application: 20,
  exam_style: 30
};

// Mastery threshold: 4 out of 5 correct (North Star §10)
const MASTERY_THRESHOLD = {
  required_correct: 4,
  window_size: 5
};

// Difficulty progression order
const DIFFICULTY_ORDER = ['familiarity', 'application', 'exam_style'];

/**
 * Creates a new empty concept progress object
 * @param {string} conceptId - The concept ID (e.g., T01.01.C01)
 * @param {string[]} allowedDifficulties - Difficulties allowed by CAM for this concept
 * @returns {Object} New concept progress object
 */
function createConceptProgress(conceptId, allowedDifficulties) {
  const masteryByDifficulty = {};

  for (const difficulty of DIFFICULTY_ORDER) {
    if (allowedDifficulties.includes(difficulty)) {
      masteryByDifficulty[difficulty] = {
        attempts: 0,
        correct: 0,
        streak: 0,
        mastered: false,
        mastered_at: null,
        recent_attempts: [] // Rolling window for mastery calculation
      };
    }
  }

  // Determine starting difficulty (first available in order)
  const startingDifficulty = DIFFICULTY_ORDER.find(d => allowedDifficulties.includes(d)) || 'familiarity';

  return {
    concept_id: conceptId,
    current_difficulty: startingDifficulty,
    mastery_by_difficulty: masteryByDifficulty,
    total_attempts: 0,
    total_correct: 0,
    xp_earned: 0,
    last_attempted_at: null,
    question_history: []
  };
}

/**
 * Records a question attempt and updates mastery status
 * @param {Object} conceptProgress - Current concept progress object
 * @param {Object} attempt - Attempt details
 * @param {string} attempt.questionId - Question ID
 * @param {string} attempt.difficulty - Difficulty level of the question
 * @param {boolean} attempt.isCorrect - Whether the answer was correct
 * @param {number} attempt.timeTakenMs - Time taken in milliseconds
 * @returns {Object} Updated concept progress and XP earned
 */
function recordAttempt(conceptProgress, attempt) {
  const { questionId, difficulty, isCorrect, timeTakenMs } = attempt;
  const now = new Date().toISOString();

  // Calculate XP (only for correct answers)
  const xpEarned = isCorrect ? (XP_VALUES[difficulty] || 0) : 0;

  // Update overall stats
  conceptProgress.total_attempts++;
  if (isCorrect) {
    conceptProgress.total_correct++;
  }
  conceptProgress.xp_earned += xpEarned;
  conceptProgress.last_attempted_at = now;

  // Update difficulty-specific mastery
  const difficultyMastery = conceptProgress.mastery_by_difficulty[difficulty];
  if (difficultyMastery) {
    difficultyMastery.attempts++;
    if (isCorrect) {
      difficultyMastery.correct++;
      difficultyMastery.streak++;
    } else {
      difficultyMastery.streak = 0;
    }

    // Update rolling window for mastery calculation
    difficultyMastery.recent_attempts.push(isCorrect);
    if (difficultyMastery.recent_attempts.length > MASTERY_THRESHOLD.window_size) {
      difficultyMastery.recent_attempts.shift();
    }

    // Check for mastery (4/5 correct in rolling window)
    if (!difficultyMastery.mastered) {
      const recentCorrect = difficultyMastery.recent_attempts.filter(Boolean).length;
      if (difficultyMastery.recent_attempts.length >= MASTERY_THRESHOLD.window_size &&
          recentCorrect >= MASTERY_THRESHOLD.required_correct) {
        difficultyMastery.mastered = true;
        difficultyMastery.mastered_at = now;

        // Advance to next difficulty if available
        advanceDifficulty(conceptProgress);
      }
    }
  }

  // Record in question history
  conceptProgress.question_history.push({
    question_id: questionId,
    difficulty,
    is_correct: isCorrect,
    xp_earned: xpEarned,
    attempted_at: now,
    time_taken_ms: timeTakenMs
  });

  return {
    conceptProgress,
    xpEarned,
    masteryAchieved: difficultyMastery?.mastered &&
                     difficultyMastery?.mastered_at === now,
    newDifficulty: conceptProgress.current_difficulty
  };
}

/**
 * Advances the concept to the next difficulty level if mastered
 * @param {Object} conceptProgress - Concept progress object
 */
function advanceDifficulty(conceptProgress) {
  const currentIndex = DIFFICULTY_ORDER.indexOf(conceptProgress.current_difficulty);

  // Find next available difficulty
  for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
    const nextDifficulty = DIFFICULTY_ORDER[i];
    if (conceptProgress.mastery_by_difficulty[nextDifficulty]) {
      conceptProgress.current_difficulty = nextDifficulty;
      return;
    }
  }

  // Already at highest available difficulty - stay there
}

/**
 * Gets the current mastery status for a concept
 * @param {Object} conceptProgress - Concept progress object
 * @returns {Object} Mastery status summary
 */
function getMasteryStatus(conceptProgress) {
  const status = {
    concept_id: conceptProgress.concept_id,
    current_difficulty: conceptProgress.current_difficulty,
    total_xp: conceptProgress.xp_earned,
    difficulties: {}
  };

  for (const [difficulty, data] of Object.entries(conceptProgress.mastery_by_difficulty)) {
    const recentCorrect = data.recent_attempts.filter(Boolean).length;
    const recentTotal = data.recent_attempts.length;

    status.difficulties[difficulty] = {
      mastered: data.mastered,
      progress: `${recentCorrect}/${recentTotal}`,
      attempts: data.attempts,
      correct: data.correct,
      streak: data.streak
    };
  }

  return status;
}

/**
 * Checks if a concept is fully mastered (all difficulty levels)
 * @param {Object} conceptProgress - Concept progress object
 * @returns {boolean} True if all available difficulties are mastered
 */
function isFullyMastered(conceptProgress) {
  return Object.values(conceptProgress.mastery_by_difficulty)
    .every(d => d.mastered);
}

/**
 * Gets the next recommended difficulty for a concept
 * @param {Object} conceptProgress - Concept progress object
 * @returns {string} Recommended difficulty level
 */
function getRecommendedDifficulty(conceptProgress) {
  // If current difficulty is mastered, return next available
  const currentMastery = conceptProgress.mastery_by_difficulty[conceptProgress.current_difficulty];

  if (currentMastery && currentMastery.mastered) {
    const currentIndex = DIFFICULTY_ORDER.indexOf(conceptProgress.current_difficulty);
    for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
      if (conceptProgress.mastery_by_difficulty[DIFFICULTY_ORDER[i]]) {
        return DIFFICULTY_ORDER[i];
      }
    }
  }

  return conceptProgress.current_difficulty;
}

/**
 * Calculates mastery percentage for a difficulty level
 * @param {Object} difficultyMastery - Difficulty mastery data
 * @returns {number} Percentage (0-100)
 */
function calculateMasteryPercentage(difficultyMastery) {
  if (!difficultyMastery || difficultyMastery.attempts === 0) {
    return 0;
  }

  if (difficultyMastery.mastered) {
    return 100;
  }

  // Calculate based on recent attempts progress toward 4/5
  const recentCorrect = difficultyMastery.recent_attempts.filter(Boolean).length;
  const progress = (recentCorrect / MASTERY_THRESHOLD.required_correct) * 100;

  return Math.min(Math.round(progress), 99); // Cap at 99 until fully mastered
}

// Export module
module.exports = {
  XP_VALUES,
  MASTERY_THRESHOLD,
  DIFFICULTY_ORDER,
  createConceptProgress,
  recordAttempt,
  getMasteryStatus,
  isFullyMastered,
  getRecommendedDifficulty,
  calculateMasteryPercentage
};
