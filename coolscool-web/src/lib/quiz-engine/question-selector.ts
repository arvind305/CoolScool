/**
 * Question Selector Module
 *
 * Handles question selection using different strategies (adaptive, sequential, random).
 * Builds question pools with priority scoring based on mastery state.
 */

import type {
  Question,
  EnrichedQuestion,
  ConceptProgress,
  CAMConcept,
  QuestionBank,
  CAMTopic,
  SelectQuestionsParams,
  NextQuestionResult,
  SelectionStrategy,
} from './types';

import { getRecommendedDifficulty, DIFFICULTY_ORDER } from './mastery-tracker';

// ============================================================
// Constants
// ============================================================

export const SELECTION_STRATEGIES: Record<string, SelectionStrategy> = {
  ADAPTIVE: 'adaptive',
  SEQUENTIAL: 'sequential',
  RANDOM: 'random',
  REVIEW: 'review',
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculates a priority score for a question based on mastery state
 */
function calculatePriorityScore(
  question: Question,
  progress: ConceptProgress | null,
  isRecommended: boolean
): number {
  let score = 0;

  // Recommended difficulty gets highest priority
  if (isRecommended) score += 100;

  if (!progress) {
    // New concept gets high priority
    score += 50;
  } else {
    // Concepts with fewer attempts get higher priority
    score += Math.max(0, 20 - progress.total_attempts);

    // Non-mastered difficulties get priority
    const difficultyMastery = progress.mastery_by_difficulty?.[question.difficulty];
    if (difficultyMastery && !difficultyMastery.mastered) score += 30;

    // Positive streak bonus (momentum)
    if (difficultyMastery?.streak > 0) {
      score += Math.min(10, difficultyMastery.streak * 2);
    }
  }

  // Add small random factor for variety
  score += Math.random() * 10;

  return score;
}

/**
 * Builds an enriched question pool with eligibility and priority scores
 */
function buildQuestionPool(
  questions: Question[],
  concepts: CAMConcept[],
  conceptProgresses: Record<string, ConceptProgress>
): EnrichedQuestion[] {
  // Build concept map for quick lookup
  const conceptMap = new Map<string, CAMConcept>();
  for (const concept of concepts) {
    conceptMap.set(concept.concept_id, concept);
  }

  return questions
    .map((question): EnrichedQuestion | null => {
      const concept = conceptMap.get(question.concept_id);
      const progress = conceptProgresses[question.concept_id] || null;
      const allowedDifficulties = concept?.difficulty_levels || [];
      const isDifficultyAllowed = allowedDifficulties.includes(question.difficulty);

      // Filter out questions with ineligible difficulties
      if (!isDifficultyAllowed) return null;

      const recommendedDifficulty = progress
        ? getRecommendedDifficulty(progress)
        : 'familiarity';
      const isRecommended = question.difficulty === recommendedDifficulty;
      const priorityScore = calculatePriorityScore(question, progress, isRecommended);

      return {
        ...question,
        eligible: isDifficultyAllowed,
        is_recommended: isRecommended,
        priority_score: priorityScore,
        concept_progress: progress,
      };
    })
    .filter((q): q is EnrichedQuestion => q !== null);
}

/**
 * Groups questions by a key and interleaves them
 * This ensures variety by not having too many questions from the same concept in a row
 */
function groupAndInterleave(
  questions: EnrichedQuestion[],
  key: keyof EnrichedQuestion
): EnrichedQuestion[] {
  const groups = new Map<string, EnrichedQuestion[]>();

  for (const q of questions) {
    const groupKey = String(q[key]);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(q);
  }

  const result: EnrichedQuestion[] = [];
  const groupArrays = Array.from(groups.values());
  const indices = groupArrays.map(() => 0);

  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < groupArrays.length; i++) {
      if (indices[i] < groupArrays[i].length) {
        result.push(groupArrays[i][indices[i]]);
        indices[i]++;
        added = true;
      }
    }
  }

  return result;
}

// ============================================================
// Main Functions
// ============================================================

/**
 * Selects questions based on the specified strategy
 *
 * @param params - Selection parameters
 * @returns Array of selected questions with order and status
 */
export function selectQuestions(params: SelectQuestionsParams): EnrichedQuestion[] {
  const {
    questionBank,
    camTopic,
    conceptProgresses = {},
    count = null,
    strategy = 'adaptive',
  } = params;

  const allQuestions = questionBank.questions || [];
  const concepts = camTopic.concepts || [];

  if (allQuestions.length === 0) return [];

  // Build the question pool with eligibility and scores
  const questionPool = buildQuestionPool(allQuestions, concepts, conceptProgresses);
  let selectedQuestions: EnrichedQuestion[];

  switch (strategy) {
    case 'sequential':
      // Sort by concept order, then by difficulty order
      selectedQuestions = [...questionPool].sort((a, b) => {
        if (a.concept_id !== b.concept_id) {
          return a.concept_id.localeCompare(b.concept_id);
        }
        return (
          DIFFICULTY_ORDER.indexOf(a.difficulty) -
          DIFFICULTY_ORDER.indexOf(b.difficulty)
        );
      });
      break;

    case 'random':
      // Pure random shuffle
      selectedQuestions = shuffleArray([...questionPool]);
      break;

    case 'review':
      // Focus on previously attempted questions with lower mastery
      selectedQuestions = [...questionPool]
        .filter((q) => q.concept_progress?.total_attempts && q.concept_progress.total_attempts > 0)
        .sort((a, b) => {
          // Prioritize questions with lower mastery
          const aCorrectRate =
            (a.concept_progress?.total_correct || 0) /
            (a.concept_progress?.total_attempts || 1);
          const bCorrectRate =
            (b.concept_progress?.total_correct || 0) /
            (b.concept_progress?.total_attempts || 1);
          return aCorrectRate - bCorrectRate;
        });
      break;

    case 'adaptive':
    default:
      // Sort by priority score, then interleave by concept
      const sorted = [...questionPool].sort(
        (a, b) => b.priority_score - a.priority_score
      );
      selectedQuestions = groupAndInterleave(sorted, 'concept_id');
      break;
  }

  // Apply count limit if specified
  const limit = count || selectedQuestions.length;

  return selectedQuestions.slice(0, limit).map((q, index) => ({
    ...q,
    order_in_session: index,
    status: 'pending' as const,
  }));
}

/**
 * Gets the next question in a session
 *
 * @param sessionQuestions - Array of questions in the session
 * @param currentIndex - Current question index
 * @returns Next question result or null if no more questions
 */
export function getNextQuestion(
  sessionQuestions: EnrichedQuestion[],
  currentIndex: number
): NextQuestionResult | null {
  const nextIndex = currentIndex + 1;
  if (nextIndex >= sessionQuestions.length) return null;

  return {
    question: sessionQuestions[nextIndex],
    index: nextIndex,
    remaining: sessionQuestions.length - nextIndex - 1,
  };
}

/**
 * Gets the previous question in a session (for review)
 *
 * @param sessionQuestions - Array of questions in the session
 * @param currentIndex - Current question index
 * @returns Previous question result or null if at the beginning
 */
export function getPreviousQuestion(
  sessionQuestions: EnrichedQuestion[],
  currentIndex: number
): NextQuestionResult | null {
  const prevIndex = currentIndex - 1;
  if (prevIndex < 0) return null;

  return {
    question: sessionQuestions[prevIndex],
    index: prevIndex,
    remaining: sessionQuestions.length - prevIndex - 1,
  };
}

/**
 * Gets questions filtered by a specific difficulty
 *
 * @param questions - Array of questions
 * @param difficulty - Target difficulty
 * @returns Filtered questions
 */
export function getQuestionsByDifficulty(
  questions: EnrichedQuestion[],
  difficulty: string
): EnrichedQuestion[] {
  return questions.filter((q) => q.difficulty === difficulty);
}

/**
 * Gets questions filtered by a specific concept
 *
 * @param questions - Array of questions
 * @param conceptId - Target concept ID
 * @returns Filtered questions
 */
export function getQuestionsByConcept(
  questions: EnrichedQuestion[],
  conceptId: string
): EnrichedQuestion[] {
  return questions.filter((q) => q.concept_id === conceptId);
}

/**
 * Counts questions by status in a session
 *
 * @param questions - Array of questions
 * @returns Object with counts by status
 */
export function getQuestionStatusCounts(
  questions: EnrichedQuestion[]
): Record<string, number> {
  const counts: Record<string, number> = {
    pending: 0,
    answered: 0,
    skipped: 0,
  };

  for (const q of questions) {
    const status = q.status || 'pending';
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
}
