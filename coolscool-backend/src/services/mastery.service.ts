/**
 * Mastery Service
 *
 * Server-side implementation of mastery tracking from North Star §10:
 * - Mastery threshold: 4/5 correct to advance difficulty
 * - XP awards: 10 (familiarity), 20 (application), 30 (exam_style)
 * - Tracks progress through difficulty levels
 */

import { query } from '../db/index.js';

// XP values per difficulty level (North Star §10)
export const XP_VALUES: Record<string, number> = {
  familiarity: 10,
  application: 20,
  exam_style: 30,
};

// Mastery threshold: 4 out of 5 correct (North Star §10)
export const MASTERY_THRESHOLD = {
  required_correct: 4,
  window_size: 5,
};

// Difficulty progression order
export const DIFFICULTY_ORDER = ['familiarity', 'application', 'exam_style'];

export interface DifficultyMastery {
  attempts: number;
  correct: number;
  streak: number;
  mastered: boolean;
  mastered_at: string | null;
  recent_attempts: boolean[];
}

export interface MasteryData {
  familiarity: DifficultyMastery;
  application: DifficultyMastery;
  exam_style: DifficultyMastery;
}

export interface ConceptProgress {
  id: string;
  user_id: string;
  curriculum_id: string;
  concept_id: string;
  concept_id_str: string;
  current_difficulty: string;
  total_attempts: number;
  total_correct: number;
  xp_earned: number;
  mastery_data: MasteryData;
  last_attempted_at: string | null;
}

export interface AttemptInput {
  questionId: string;
  difficulty: string;
  isCorrect: boolean;
  timeTakenMs?: number;
}

export interface AttemptResult {
  xpEarned: number;
  masteryAchieved: boolean;
  newDifficulty: string;
  conceptProgress: ConceptProgress;
}

// Create default mastery data structure
function createDefaultMasteryData(): MasteryData {
  const createDifficultyMastery = (): DifficultyMastery => ({
    attempts: 0,
    correct: 0,
    streak: 0,
    mastered: false,
    mastered_at: null,
    recent_attempts: [],
  });

  return {
    familiarity: createDifficultyMastery(),
    application: createDifficultyMastery(),
    exam_style: createDifficultyMastery(),
  };
}

// Get or create concept progress for a user in a curriculum
export async function getOrCreateConceptProgress(
  userId: string,
  curriculumId: string,
  conceptIdStr: string
): Promise<ConceptProgress> {
  // Try to find existing progress
  const existing = await query<ConceptProgress>(
    `SELECT * FROM concept_progress WHERE user_id = $1 AND curriculum_id = $2 AND concept_id_str = $3`,
    [userId, curriculumId, conceptIdStr]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  // Get the concept UUID (must be from the specified curriculum)
  const conceptResult = await query<{ id: string }>(
    'SELECT id FROM concepts WHERE curriculum_id = $1 AND concept_id = $2',
    [curriculumId, conceptIdStr]
  );

  if (!conceptResult.rows[0]) {
    throw new Error(`Concept not found in curriculum: ${conceptIdStr}`);
  }

  // Create new progress with curriculum_id
  const result = await query<ConceptProgress>(
    `INSERT INTO concept_progress (user_id, curriculum_id, concept_id, concept_id_str, current_difficulty, mastery_data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, curriculumId, conceptResult.rows[0].id, conceptIdStr, 'familiarity', JSON.stringify(createDefaultMasteryData())]
  );

  return result.rows[0]!;
}

// Record a question attempt
export async function recordAttempt(
  userId: string,
  curriculumId: string,
  conceptIdStr: string,
  attempt: AttemptInput
): Promise<AttemptResult> {
  const { questionId, difficulty, isCorrect, timeTakenMs } = attempt;
  const now = new Date().toISOString();

  // Get current progress for this curriculum
  let progress = await getOrCreateConceptProgress(userId, curriculumId, conceptIdStr);
  const masteryData = typeof progress.mastery_data === 'string'
    ? JSON.parse(progress.mastery_data)
    : progress.mastery_data;

  // Calculate XP (only for correct answers)
  const xpEarned = isCorrect ? (XP_VALUES[difficulty] || 0) : 0;

  // Update overall stats
  const newTotalAttempts = progress.total_attempts + 1;
  const newTotalCorrect = progress.total_correct + (isCorrect ? 1 : 0);
  const newXpEarned = progress.xp_earned + xpEarned;

  // Update difficulty-specific mastery
  const difficultyKey = difficulty as keyof MasteryData;
  const difficultyMastery = masteryData[difficultyKey];

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
    let masteryAchieved = false;
    if (!difficultyMastery.mastered) {
      const recentCorrect = difficultyMastery.recent_attempts.filter(Boolean).length;
      if (
        difficultyMastery.recent_attempts.length >= MASTERY_THRESHOLD.window_size &&
        recentCorrect >= MASTERY_THRESHOLD.required_correct
      ) {
        difficultyMastery.mastered = true;
        difficultyMastery.mastered_at = now;
        masteryAchieved = true;
      }
    }

    // Determine new difficulty (advance if mastered)
    let newDifficulty = progress.current_difficulty;
    if (masteryAchieved) {
      newDifficulty = advanceDifficulty(progress.current_difficulty, masteryData);
    }

    // Update database
    const updateResult = await query<ConceptProgress>(
      `UPDATE concept_progress
       SET total_attempts = $1,
           total_correct = $2,
           xp_earned = $3,
           mastery_data = $4,
           current_difficulty = $5,
           last_attempted_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        newTotalAttempts,
        newTotalCorrect,
        newXpEarned,
        JSON.stringify(masteryData),
        newDifficulty,
        now,
        progress.id,
      ]
    );

    progress = updateResult.rows[0]!;

    // Record in question_attempts table for audit
    await query(
      `INSERT INTO question_attempts
       (user_id, question_id, concept_id_str, difficulty, is_correct, xp_earned, time_taken_ms)
       SELECT $1, q.id, $3, $4, $5, $6, $7
       FROM questions q WHERE q.question_id = $2`,
      [userId, questionId, conceptIdStr, difficulty, isCorrect, xpEarned, timeTakenMs || 0]
    );

    return {
      xpEarned,
      masteryAchieved,
      newDifficulty,
      conceptProgress: progress,
    };
  }

  // Fallback if difficulty not found in mastery data
  return {
    xpEarned: 0,
    masteryAchieved: false,
    newDifficulty: progress.current_difficulty,
    conceptProgress: progress,
  };
}

// Advance to next difficulty level
function advanceDifficulty(currentDifficulty: string, masteryData: MasteryData): string {
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);

  for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
    const nextDifficulty = DIFFICULTY_ORDER[i] as keyof MasteryData;
    if (masteryData[nextDifficulty]) {
      return nextDifficulty;
    }
  }

  return currentDifficulty; // Stay at current if no next available
}

// Get all concept progress for a user in a topic within a curriculum
export async function getTopicConceptProgress(
  userId: string,
  curriculumId: string,
  topicIdStr: string
): Promise<ConceptProgress[]> {
  const result = await query<ConceptProgress>(
    `SELECT cp.*
     FROM concept_progress cp
     JOIN concepts c ON cp.concept_id = c.id
     JOIN topics t ON c.topic_id = t.id
     WHERE cp.user_id = $1 AND cp.curriculum_id = $2 AND t.topic_id = $3`,
    [userId, curriculumId, topicIdStr]
  );

  return result.rows;
}

// Check if a concept is fully mastered
export function isFullyMastered(masteryData: MasteryData): boolean {
  return Object.values(masteryData).every((d) => d.mastered);
}

// Get recommended difficulty for a concept
export function getRecommendedDifficulty(
  currentDifficulty: string,
  masteryData: MasteryData
): string {
  const diffKey = currentDifficulty as keyof MasteryData;
  const currentMastery = masteryData[diffKey];

  if (currentMastery && currentMastery.mastered) {
    const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);
    for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
      const nextDiff = DIFFICULTY_ORDER[i] as keyof MasteryData;
      if (masteryData[nextDiff]) {
        return nextDiff;
      }
    }
  }

  return currentDifficulty;
}
