/**
 * Mastery Tracker Module
 *
 * Tracks concept-level mastery progression through difficulty levels.
 * Uses a sliding window approach to determine mastery.
 */

import type {
  Difficulty,
  DifficultyMastery,
  ConceptProgress,
  AttemptInput,
  AttemptResult,
  MasteryStatus,
  DifficultyStatus,
  XPConfig,
  MasteryThreshold,
} from './types';

// ============================================================
// Constants
// ============================================================

export const XP_VALUES: XPConfig = {
  familiarity: 10,
  application: 20,
  exam_style: 30,
};

export const MASTERY_THRESHOLD: MasteryThreshold = {
  required_correct: 4,
  window_size: 5,
};

export const DIFFICULTY_ORDER: Difficulty[] = [
  'familiarity',
  'application',
  'exam_style',
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Creates an empty mastery state for a difficulty level
 */
function createDifficultyMastery(): DifficultyMastery {
  return {
    attempts: 0,
    correct: 0,
    streak: 0,
    mastered: false,
    mastered_at: null,
    recent_attempts: [],
  };
}

/**
 * Advances the current difficulty to the next available level
 */
function advanceDifficulty(conceptProgress: ConceptProgress): void {
  const currentIndex = DIFFICULTY_ORDER.indexOf(
    conceptProgress.current_difficulty
  );

  for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
    const nextDifficulty = DIFFICULTY_ORDER[i];
    if (conceptProgress.mastery_by_difficulty[nextDifficulty]) {
      conceptProgress.current_difficulty = nextDifficulty;
      return;
    }
  }
}

// ============================================================
// Main Functions
// ============================================================

/**
 * Creates a new concept progress object
 *
 * @param conceptId - The concept identifier
 * @param allowedDifficulties - Which difficulty levels are enabled for this concept
 * @returns A new ConceptProgress object
 */
export function createConceptProgress(
  conceptId: string,
  allowedDifficulties: Difficulty[]
): ConceptProgress {
  const masteryByDifficulty: Partial<Record<Difficulty, DifficultyMastery>> = {};

  for (const difficulty of DIFFICULTY_ORDER) {
    if (allowedDifficulties.includes(difficulty)) {
      masteryByDifficulty[difficulty] = createDifficultyMastery();
    }
  }

  const startingDifficulty =
    DIFFICULTY_ORDER.find((d) => allowedDifficulties.includes(d)) ||
    'familiarity';

  return {
    concept_id: conceptId,
    current_difficulty: startingDifficulty,
    mastery_by_difficulty: masteryByDifficulty as Record<
      Difficulty,
      DifficultyMastery
    >,
    total_attempts: 0,
    total_correct: 0,
    xp_earned: 0,
    last_attempted_at: null,
    question_history: [],
  };
}

/**
 * Records an attempt on a concept and updates mastery state
 *
 * @param conceptProgress - The current concept progress (will be mutated)
 * @param attempt - The attempt details
 * @returns Result containing updated progress and whether mastery was achieved
 */
export function recordAttempt(
  conceptProgress: ConceptProgress,
  attempt: AttemptInput
): AttemptResult {
  const { questionId, difficulty, isCorrect, timeTakenMs } = attempt;
  const now = new Date().toISOString();

  const xpEarned = isCorrect ? XP_VALUES[difficulty] || 0 : 0;

  // Update overall stats
  conceptProgress.total_attempts++;
  if (isCorrect) {
    conceptProgress.total_correct++;
  }
  conceptProgress.xp_earned += xpEarned;
  conceptProgress.last_attempted_at = now;

  // Update difficulty-specific mastery
  const difficultyMastery = conceptProgress.mastery_by_difficulty[difficulty];
  let masteryAchieved = false;

  if (difficultyMastery) {
    difficultyMastery.attempts++;
    if (isCorrect) {
      difficultyMastery.correct++;
      difficultyMastery.streak++;
    } else {
      difficultyMastery.streak = 0;
    }

    // Update sliding window
    difficultyMastery.recent_attempts.push(isCorrect);
    if (difficultyMastery.recent_attempts.length > MASTERY_THRESHOLD.window_size) {
      difficultyMastery.recent_attempts.shift();
    }

    // Check for mastery achievement
    if (!difficultyMastery.mastered) {
      const recentCorrect = difficultyMastery.recent_attempts.filter(Boolean).length;
      if (
        difficultyMastery.recent_attempts.length >= MASTERY_THRESHOLD.window_size &&
        recentCorrect >= MASTERY_THRESHOLD.required_correct
      ) {
        difficultyMastery.mastered = true;
        difficultyMastery.mastered_at = now;
        masteryAchieved = true;
        advanceDifficulty(conceptProgress);
      }
    }
  }

  // Add to question history
  conceptProgress.question_history.push({
    question_id: questionId,
    difficulty,
    is_correct: isCorrect,
    xp_earned: xpEarned,
    attempted_at: now,
    time_taken_ms: timeTakenMs,
  });

  return {
    conceptProgress,
    xpEarned,
    masteryAchieved,
    newDifficulty: conceptProgress.current_difficulty,
  };
}

/**
 * Gets a summary of the mastery status for a concept
 *
 * @param conceptProgress - The concept progress to summarize
 * @returns A MasteryStatus summary object
 */
export function getMasteryStatus(conceptProgress: ConceptProgress): MasteryStatus {
  const difficulties: Record<string, DifficultyStatus> = {};

  for (const [difficulty, data] of Object.entries(
    conceptProgress.mastery_by_difficulty
  )) {
    const recentCorrect = data.recent_attempts.filter(Boolean).length;
    const recentTotal = data.recent_attempts.length;

    difficulties[difficulty] = {
      mastered: data.mastered,
      progress: `${recentCorrect}/${recentTotal}`,
      attempts: data.attempts,
      correct: data.correct,
      streak: data.streak,
    };
  }

  return {
    concept_id: conceptProgress.concept_id,
    current_difficulty: conceptProgress.current_difficulty,
    total_xp: conceptProgress.xp_earned,
    difficulties,
  };
}

/**
 * Gets the recommended difficulty level for the next question
 *
 * @param conceptProgress - The concept progress to analyze
 * @returns The recommended difficulty level
 */
export function getRecommendedDifficulty(
  conceptProgress: ConceptProgress
): Difficulty {
  const currentMastery =
    conceptProgress.mastery_by_difficulty[conceptProgress.current_difficulty];

  if (currentMastery && currentMastery.mastered) {
    const currentIndex = DIFFICULTY_ORDER.indexOf(
      conceptProgress.current_difficulty
    );
    for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
      if (conceptProgress.mastery_by_difficulty[DIFFICULTY_ORDER[i]]) {
        return DIFFICULTY_ORDER[i];
      }
    }
  }

  return conceptProgress.current_difficulty;
}

/**
 * Checks if a concept has fully mastered all available difficulty levels
 *
 * @param conceptProgress - The concept progress to check
 * @returns True if all difficulties are mastered
 */
export function isConceptFullyMastered(
  conceptProgress: ConceptProgress
): boolean {
  for (const mastery of Object.values(conceptProgress.mastery_by_difficulty)) {
    if (!mastery.mastered) {
      return false;
    }
  }
  return true;
}

/**
 * Gets the mastery percentage for a concept (across all difficulties)
 *
 * @param conceptProgress - The concept progress to calculate
 * @returns Percentage of mastered difficulties (0-100)
 */
export function getConceptMasteryPercentage(
  conceptProgress: ConceptProgress
): number {
  const difficulties = Object.values(conceptProgress.mastery_by_difficulty);
  if (difficulties.length === 0) return 0;

  const masteredCount = difficulties.filter((d) => d.mastered).length;
  return Math.round((masteredCount / difficulties.length) * 100);
}

/**
 * Gets existing concept progress or creates a new one
 *
 * @param progressMap - Map of concept ID to progress
 * @param conceptId - The concept ID to look up
 * @param allowedDifficulties - Difficulties to enable if creating new
 * @returns Existing or new ConceptProgress
 */
export function getOrCreateConceptProgress(
  progressMap: Record<string, ConceptProgress>,
  conceptId: string,
  allowedDifficulties: Difficulty[]
): ConceptProgress {
  if (progressMap[conceptId]) {
    return progressMap[conceptId];
  }
  const newProgress = createConceptProgress(conceptId, allowedDifficulties);
  progressMap[conceptId] = newProgress;
  return newProgress;
}
