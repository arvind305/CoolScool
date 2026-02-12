/**
 * Question Selector Module
 *
 * Selects questions based on mastery state following North Star §10:
 * - Pick from CAM-allowed difficulty levels per concept
 * - Adapts based on current mastery level
 * - Prioritizes concepts that need more practice
 *
 * @module quiz-engine/core/question-selector
 */

'use strict';

const { DIFFICULTY_ORDER, getRecommendedDifficulty } = require('./mastery-tracker');

/**
 * Selection strategies for question picking
 */
const SELECTION_STRATEGIES = {
  ADAPTIVE: 'adaptive',       // Based on mastery (default)
  SEQUENTIAL: 'sequential',   // In order through concepts
  RANDOM: 'random',           // Random selection
  REVIEW: 'review'            // Focus on previously incorrect
};

/**
 * Selects questions for a quiz session
 *
 * @param {Object} params - Selection parameters
 * @param {Object} params.questionBank - Question bank for the topic
 * @param {Object} params.camTopic - CAM topic definition with concepts
 * @param {Object} params.conceptProgresses - Map of concept_id to progress
 * @param {number} params.count - Number of questions to select (optional)
 * @param {string} params.strategy - Selection strategy (optional)
 * @returns {Object[]} Selected questions with metadata
 */
function selectQuestions(params) {
  const {
    questionBank,
    camTopic,
    conceptProgresses = {},
    count = null,
    strategy = SELECTION_STRATEGIES.ADAPTIVE
  } = params;

  const allQuestions = questionBank.questions || [];
  const concepts = camTopic.concepts || [];

  if (allQuestions.length === 0) {
    return [];
  }

  // Build question pool with eligibility info
  const questionPool = buildQuestionPool(allQuestions, concepts, conceptProgresses);

  // Apply selection strategy
  let selectedQuestions;

  switch (strategy) {
    case SELECTION_STRATEGIES.SEQUENTIAL:
      selectedQuestions = selectSequential(questionPool, count);
      break;
    case SELECTION_STRATEGIES.RANDOM:
      selectedQuestions = selectRandom(questionPool, count);
      break;
    case SELECTION_STRATEGIES.REVIEW:
      selectedQuestions = selectForReview(questionPool, conceptProgresses, count);
      break;
    case SELECTION_STRATEGIES.ADAPTIVE:
    default:
      selectedQuestions = selectAdaptive(questionPool, conceptProgresses, count);
      break;
  }

  // Add session metadata
  return selectedQuestions.map((q, index) => ({
    ...q,
    order_in_session: index,
    status: 'pending'
  }));
}

/**
 * Builds a question pool with eligibility based on CAM and mastery
 *
 * @param {Object[]} questions - All questions in the bank
 * @param {Object[]} concepts - CAM concepts
 * @param {Object} conceptProgresses - Progress by concept ID
 * @returns {Object[]} Questions with eligibility metadata
 */
function buildQuestionPool(questions, concepts, conceptProgresses) {
  // Build concept lookup
  const conceptMap = new Map();
  for (const concept of concepts) {
    conceptMap.set(concept.concept_id, concept);
  }

  return questions.map(question => {
    const concept = conceptMap.get(question.concept_id);
    const progress = conceptProgresses[question.concept_id];

    // Check if difficulty is allowed by CAM
    const allowedDifficulties = concept?.difficulty_levels || [];
    const isDifficultyAllowed = allowedDifficulties.includes(question.difficulty);

    // Determine if this is the recommended difficulty
    const recommendedDifficulty = progress
      ? getRecommendedDifficulty(progress)
      : 'familiarity';

    const isRecommended = question.difficulty === recommendedDifficulty;

    // Calculate priority score for adaptive selection
    const priorityScore = calculatePriorityScore(question, progress, isRecommended);

    return {
      ...question,
      eligible: isDifficultyAllowed,
      is_recommended: isRecommended,
      priority_score: priorityScore,
      concept_progress: progress || null
    };
  }).filter(q => q.eligible); // Only include eligible questions
}

/**
 * Calculates priority score for adaptive selection
 * Higher score = should be selected first
 *
 * @param {Object} question - Question object
 * @param {Object} progress - Concept progress (may be null)
 * @param {boolean} isRecommended - Whether this difficulty is recommended
 * @returns {number} Priority score
 */
function calculatePriorityScore(question, progress, isRecommended) {
  let score = 0;

  // Base score by difficulty (prefer current mastery level)
  if (isRecommended) {
    score += 100;
  }

  // Concepts with less practice get priority
  if (!progress) {
    score += 50; // Never attempted
  } else {
    // Lower attempts = higher priority (caps at 20)
    const attemptBonus = Math.max(0, 20 - progress.total_attempts);
    score += attemptBonus;

    // Check if recently incorrect at this difficulty
    const difficultyMastery = progress.mastery_by_difficulty?.[question.difficulty];
    if (difficultyMastery && !difficultyMastery.mastered) {
      score += 30; // Not mastered yet
    }

    // Streak bonus (if doing well, keep momentum)
    if (difficultyMastery?.streak > 0) {
      score += Math.min(10, difficultyMastery.streak * 2);
    }
  }

  // Add some randomness (0-10) to prevent exact same order
  score += Math.random() * 10;

  return score;
}

/**
 * Adaptive selection based on mastery state
 *
 * @param {Object[]} pool - Question pool
 * @param {Object} progresses - Concept progresses
 * @param {number} count - Number to select
 * @returns {Object[]} Selected questions
 */
function selectAdaptive(pool, progresses, count) {
  // Sort by priority score (descending)
  const sorted = [...pool].sort((a, b) => b.priority_score - a.priority_score);

  // Group by concept to ensure variety
  const byConceptPriority = groupAndInterleave(sorted, 'concept_id');

  // Select top N
  const limit = count || byConceptPriority.length;
  return byConceptPriority.slice(0, limit);
}

/**
 * Sequential selection (order by concept, then difficulty)
 *
 * @param {Object[]} pool - Question pool
 * @param {number} count - Number to select
 * @returns {Object[]} Selected questions
 */
function selectSequential(pool, count) {
  const sorted = [...pool].sort((a, b) => {
    // First by concept_id
    if (a.concept_id !== b.concept_id) {
      return a.concept_id.localeCompare(b.concept_id);
    }
    // Then by difficulty order
    const diffOrder = DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty);
    if (diffOrder !== 0) return diffOrder;
    // Then by question_id
    return a.question_id.localeCompare(b.question_id);
  });

  const limit = count || sorted.length;
  return sorted.slice(0, limit);
}

/**
 * Random selection
 *
 * @param {Object[]} pool - Question pool
 * @param {number} count - Number to select
 * @returns {Object[]} Selected questions
 */
function selectRandom(pool, count) {
  const shuffled = shuffleArray([...pool]);
  const limit = count || shuffled.length;
  return shuffled.slice(0, limit);
}

/**
 * Review selection - focuses on previously incorrect answers
 *
 * @param {Object[]} pool - Question pool
 * @param {Object} progresses - Concept progresses
 * @param {number} count - Number to select
 * @returns {Object[]} Selected questions
 */
function selectForReview(pool, progresses, count) {
  // Build set of previously incorrect question IDs
  const incorrectQuestionIds = new Set();

  for (const progress of Object.values(progresses)) {
    if (progress.question_history) {
      for (const attempt of progress.question_history) {
        if (!attempt.is_correct) {
          incorrectQuestionIds.add(attempt.question_id);
        }
      }
    }
  }

  // Prioritize incorrect questions
  const scored = pool.map(q => ({
    ...q,
    review_score: incorrectQuestionIds.has(q.question_id) ? 100 : q.priority_score
  }));

  const sorted = scored.sort((a, b) => b.review_score - a.review_score);

  const limit = count || sorted.length;
  return sorted.slice(0, limit);
}

/**
 * Groups questions by a key and interleaves for variety
 *
 * @param {Object[]} questions - Questions to group
 * @param {string} key - Key to group by
 * @returns {Object[]} Interleaved questions
 */
function groupAndInterleave(questions, key) {
  // Group by key
  const groups = new Map();
  for (const q of questions) {
    const groupKey = q[key];
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(q);
  }

  // Interleave: take one from each group in rotation
  const result = [];
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

/**
 * Shuffles an array using Fisher-Yates algorithm
 *
 * @param {any[]} array - Array to shuffle
 * @returns {any[]} Shuffled array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Gets questions by difficulty for a specific concept
 *
 * @param {Object[]} questions - All questions
 * @param {string} conceptId - Concept ID to filter
 * @param {string} difficulty - Difficulty to filter
 * @returns {Object[]} Filtered questions
 */
function getQuestionsByConceptAndDifficulty(questions, conceptId, difficulty) {
  return questions.filter(q =>
    q.concept_id === conceptId && q.difficulty === difficulty
  );
}

/**
 * Gets a single next question for the session
 *
 * @param {Object[]} sessionQuestions - Questions in the session
 * @param {number} currentIndex - Current question index
 * @returns {Object|null} Next question or null if done
 */
function getNextQuestion(sessionQuestions, currentIndex) {
  const nextIndex = currentIndex + 1;
  if (nextIndex >= sessionQuestions.length) {
    return null;
  }
  return {
    question: sessionQuestions[nextIndex],
    index: nextIndex,
    remaining: sessionQuestions.length - nextIndex - 1
  };
}

// Export module
module.exports = {
  SELECTION_STRATEGIES,
  selectQuestions,
  buildQuestionPool,
  calculatePriorityScore,
  getQuestionsByConceptAndDifficulty,
  getNextQuestion,
  shuffleArray
};
