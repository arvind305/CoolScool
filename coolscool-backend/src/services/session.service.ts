/**
 * Session Service
 *
 * Server-side implementation of quiz sessions following North Star §8:
 * - Time modes: Unlimited, 10min, 5min, 3min (user-chosen)
 * - One question at a time (questions stored as UUID queue, fetched on demand)
 * - No negative marking
 * - No forced completion
 *
 * Ported from: quiz-engine/core/session-manager.js and question-selector.js
 */

import { query, withTransaction } from '../db/index.js';
import * as QuestionModel from '../models/question.model.js';
import { recordAttempt, getOrCreateConceptProgress, XP_VALUES, DIFFICULTY_ORDER, getRecommendedDifficulty, ConceptProgress, MasteryData } from './mastery.service.js';
import { updateTopicProgress } from './proficiency.service.js';

// ============================================
// CONSTANTS
// ============================================

export const SESSION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

export const TIME_MODES = {
  UNLIMITED: 'unlimited',
  TEN_MIN: '10min',
  FIVE_MIN: '5min',
  THREE_MIN: '3min',
} as const;

export type TimeMode = typeof TIME_MODES[keyof typeof TIME_MODES];

export const TIME_LIMITS: Record<TimeMode, number | null> = {
  [TIME_MODES.UNLIMITED]: null,
  [TIME_MODES.TEN_MIN]: 10 * 60 * 1000,
  [TIME_MODES.FIVE_MIN]: 5 * 60 * 1000,
  [TIME_MODES.THREE_MIN]: 3 * 60 * 1000,
};

export const SELECTION_STRATEGIES = {
  ADAPTIVE: 'adaptive',
  SEQUENTIAL: 'sequential',
  RANDOM: 'random',
  REVIEW: 'review',
} as const;

export type SelectionStrategy = typeof SELECTION_STRATEGIES[keyof typeof SELECTION_STRATEGIES];

// ============================================
// INTERFACES
// ============================================

export interface QuizSession {
  id: string;
  user_id: string;
  curriculum_id: string;
  session_status: SessionStatus;
  time_mode: TimeMode;
  time_limit_ms: number | null;
  topic_id_str: string;
  topic_name: string;
  questions_answered: number;
  questions_correct: number;
  questions_skipped: number;
  xp_earned: number;
  current_question_index: number;
  time_elapsed_ms: number;
  question_queue: string[];
  created_at: Date;
  started_at: Date | null;
  paused_at: Date | null;
  completed_at: Date | null;
}

export interface CreateSessionInput {
  curriculumId: string;
  topicIdStr: string;
  timeMode?: TimeMode;
  questionCount?: number | null;
  strategy?: SelectionStrategy;
}

export interface SubmitAnswerInput {
  userAnswer: unknown;
  timeTakenMs?: number;
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  xpEarned: number;
  masteryAchieved: boolean;
  newDifficulty: string;
  correctAnswer: unknown;
  explanationCorrect: string | null;
  explanationIncorrect: string | null;
  isSessionComplete: boolean;
  nextQuestion: QuestionModel.QuestionForClient | null;
}

export interface SessionSummary {
  session_id: string;
  topic_id: string;
  topic_name: string;
  time_mode: TimeMode;
  status: SessionStatus;
  total_questions: number;
  questions_answered: number;
  questions_correct: number;
  questions_skipped: number;
  xp_earned: number;
  time_elapsed_ms: number;
  by_difficulty: Record<string, { answered: number; correct: number }>;
  started_at: Date | null;
  completed_at: Date | null;
}

interface QuestionWithMetadata extends QuestionModel.Question {
  eligible: boolean;
  is_recommended: boolean;
  priority_score: number;
  recency_penalty: number;
  concept_progress: ConceptProgress | null;
}

interface CAMConcept {
  concept_id: string;
  difficulty_levels: string[];
}

// ============================================
// SESSION LIFECYCLE
// ============================================

/**
 * Creates a new quiz session
 */
export async function createSession(
  userId: string,
  input: CreateSessionInput
): Promise<QuizSession> {
  const {
    curriculumId,
    topicIdStr,
    timeMode = TIME_MODES.UNLIMITED,
    questionCount = null,
    strategy = SELECTION_STRATEGIES.ADAPTIVE,
  } = input;

  // Validate topic exists in this curriculum
  const topicResult = await query<{ topic_id: string; topic_name: string }>(
    'SELECT topic_id, topic_name FROM topics WHERE curriculum_id = $1 AND topic_id = $2',
    [curriculumId, topicIdStr]
  );

  if (!topicResult.rows[0]) {
    throw new Error(`Topic not found in curriculum: ${topicIdStr}`);
  }

  const topic = topicResult.rows[0];

  // Get questions for this topic in this curriculum
  const questions = await QuestionModel.getQuestionsByTopic(curriculumId, topicIdStr);
  if (questions.length === 0) {
    throw new Error(`No questions available for topic: ${topicIdStr}`);
  }

  // Get CAM concepts for this topic in this curriculum
  const camResult = await query<CAMConcept>(
    `SELECT concept_id, difficulty_levels
     FROM concepts c
     JOIN topics t ON c.topic_id = t.id
     WHERE c.curriculum_id = $1 AND t.topic_id = $2`,
    [curriculumId, topicIdStr]
  );

  // Get user's concept progress for this topic in this curriculum
  const progressResult = await query<ConceptProgress>(
    `SELECT * FROM concept_progress
     WHERE user_id = $1 AND curriculum_id = $2 AND concept_id_str LIKE $3`,
    [userId, curriculumId, `${topicIdStr}%`]
  );

  const conceptProgresses = new Map<string, ConceptProgress>();
  for (const progress of progressResult.rows) {
    conceptProgresses.set(progress.concept_id_str, progress);
  }

  // Build full question history: tracks correctness + recency for ALL past sessions
  const historyMap = await buildQuestionHistoryMap(userId, topicIdStr);

  // Select questions using the specified strategy
  const selectedQuestionIds = selectQuestions({
    questions,
    camConcepts: camResult.rows,
    conceptProgresses,
    historyMap,
    count: questionCount,
    strategy,
  });

  if (selectedQuestionIds.length === 0) {
    throw new Error('No eligible questions found for this topic');
  }

  // Create session in database with curriculum_id
  const result = await query<QuizSession>(
    `INSERT INTO quiz_sessions
     (user_id, curriculum_id, session_status, time_mode, time_limit_ms, topic_id_str, topic_name, question_queue)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      curriculumId,
      SESSION_STATUS.NOT_STARTED,
      timeMode,
      TIME_LIMITS[timeMode],
      topicIdStr,
      topic.topic_name,
      selectedQuestionIds,
    ]
  );

  return result.rows[0]!;
}

/**
 * Starts a session (transitions NOT_STARTED -> IN_PROGRESS)
 */
export async function startSession(
  userId: string,
  sessionId: string
): Promise<QuizSession> {
  const session = await getSessionForUser(userId, sessionId);

  if (session.session_status !== SESSION_STATUS.NOT_STARTED) {
    throw new Error(`Cannot start session in status: ${session.session_status}`);
  }

  const result = await query<QuizSession>(
    `UPDATE quiz_sessions
     SET session_status = $1, started_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [SESSION_STATUS.IN_PROGRESS, sessionId]
  );

  return result.rows[0]!;
}

/**
 * Pauses a session
 */
export async function pauseSession(
  userId: string,
  sessionId: string,
  elapsedMs: number
): Promise<QuizSession> {
  const session = await getSessionForUser(userId, sessionId);

  if (session.session_status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error(`Cannot pause session in status: ${session.session_status}`);
  }

  const result = await query<QuizSession>(
    `UPDATE quiz_sessions
     SET session_status = $1, paused_at = NOW(), time_elapsed_ms = $2
     WHERE id = $3
     RETURNING *`,
    [SESSION_STATUS.PAUSED, elapsedMs, sessionId]
  );

  return result.rows[0]!;
}

/**
 * Resumes a paused session
 */
export async function resumeSession(
  userId: string,
  sessionId: string
): Promise<QuizSession> {
  const session = await getSessionForUser(userId, sessionId);

  if (session.session_status !== SESSION_STATUS.PAUSED) {
    throw new Error(`Cannot resume session in status: ${session.session_status}`);
  }

  const result = await query<QuizSession>(
    `UPDATE quiz_sessions
     SET session_status = $1, paused_at = NULL
     WHERE id = $2
     RETURNING *`,
    [SESSION_STATUS.IN_PROGRESS, sessionId]
  );

  return result.rows[0]!;
}

/**
 * Ends a session (complete or abandon)
 */
export async function endSession(
  userId: string,
  sessionId: string,
  completed: boolean = false,
  elapsedMs?: number
): Promise<QuizSession> {
  const session = await getSessionForUser(userId, sessionId);

  const finalStatus = completed ? SESSION_STATUS.COMPLETED : SESSION_STATUS.ABANDONED;

  const result = await query<QuizSession>(
    `UPDATE quiz_sessions
     SET session_status = $1, completed_at = NOW(), time_elapsed_ms = COALESCE($2, time_elapsed_ms)
     WHERE id = $3
     RETURNING *`,
    [finalStatus, elapsedMs, sessionId]
  );

  // Update topic progress after session ends
  await updateTopicProgress(userId, session.curriculum_id, session.topic_id_str);

  return result.rows[0]!;
}

// ============================================
// QUESTION OPERATIONS
// ============================================

/**
 * Gets the current question for a session (without answer data)
 */
export async function getCurrentQuestion(
  userId: string,
  sessionId: string
): Promise<QuestionModel.QuestionForClient | null> {
  const session = await getSessionForUser(userId, sessionId);

  if (session.current_question_index >= session.question_queue.length) {
    return null;
  }

  const questionId = session.question_queue[session.current_question_index]!;
  const question = await QuestionModel.findById(questionId);

  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  return QuestionModel.stripAnswerData(question);
}

/**
 * Submits an answer for the current question
 */
export async function submitAnswer(
  userId: string,
  sessionId: string,
  input: SubmitAnswerInput
): Promise<SubmitAnswerResult> {
  const { userAnswer, timeTakenMs = 0 } = input;

  const session = await getSessionForUser(userId, sessionId);

  if (session.session_status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error(`Cannot submit answer in status: ${session.session_status}`);
  }

  if (session.current_question_index >= session.question_queue.length) {
    throw new Error('No current question to answer');
  }

  const questionId = session.question_queue[session.current_question_index]!;
  const question = await QuestionModel.findById(questionId);

  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  // Check answer
  const isCorrect = QuestionModel.checkAnswer(question, userAnswer);

  // Calculate XP (no negative marking)
  const xpEarned = isCorrect ? (XP_VALUES[question.difficulty] || 0) : 0;

  // Record the attempt in mastery service (with curriculum_id from session)
  const masteryResult = await recordAttempt(userId, session.curriculum_id, question.concept_id_str, {
    questionId: question.question_id,
    difficulty: question.difficulty,
    isCorrect,
    timeTakenMs,
  });

  // Save session answer
  await query(
    `INSERT INTO session_answers
     (session_id, question_id, question_index, user_answer, is_correct, xp_earned, time_taken_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [sessionId, question.id, session.current_question_index, JSON.stringify(userAnswer), isCorrect, xpEarned, timeTakenMs]
  );

  // Calculate next question index
  const nextQuestionIndex = session.current_question_index + 1;
  const isSessionComplete = nextQuestionIndex >= session.question_queue.length;

  // Update session progress
  const updateResult = await query<QuizSession>(
    `UPDATE quiz_sessions
     SET questions_answered = questions_answered + 1,
         questions_correct = questions_correct + $1,
         xp_earned = xp_earned + $2,
         current_question_index = $3,
         session_status = $4,
         completed_at = $5
     WHERE id = $6
     RETURNING *`,
    [
      isCorrect ? 1 : 0,
      xpEarned,
      nextQuestionIndex,
      isSessionComplete ? SESSION_STATUS.COMPLETED : SESSION_STATUS.IN_PROGRESS,
      isSessionComplete ? new Date() : null,
      sessionId,
    ]
  );

  // Update topic progress if session complete
  if (isSessionComplete) {
    await updateTopicProgress(userId, session.curriculum_id, session.topic_id_str);
  }

  // Get next question if available
  let nextQuestion: QuestionModel.QuestionForClient | null = null;
  if (!isSessionComplete) {
    const nextQuestionId = session.question_queue[nextQuestionIndex]!;
    const nextQ = await QuestionModel.findById(nextQuestionId);
    if (nextQ) {
      nextQuestion = QuestionModel.stripAnswerData(nextQ);
    }
  }

  return {
    isCorrect,
    xpEarned,
    masteryAchieved: masteryResult.masteryAchieved,
    newDifficulty: masteryResult.newDifficulty,
    correctAnswer: question.correct_answer,
    explanationCorrect: question.explanation_correct,
    explanationIncorrect: question.explanation_incorrect,
    isSessionComplete,
    nextQuestion,
  };
}

/**
 * Skips the current question (no penalty, per North Star §8)
 */
export async function skipQuestion(
  userId: string,
  sessionId: string
): Promise<{ isSessionComplete: boolean; nextQuestion: QuestionModel.QuestionForClient | null }> {
  const session = await getSessionForUser(userId, sessionId);

  if (session.session_status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error(`Cannot skip question in status: ${session.session_status}`);
  }

  if (session.current_question_index >= session.question_queue.length) {
    throw new Error('No current question to skip');
  }

  const nextQuestionIndex = session.current_question_index + 1;
  const isSessionComplete = nextQuestionIndex >= session.question_queue.length;

  // Update session
  await query(
    `UPDATE quiz_sessions
     SET questions_skipped = questions_skipped + 1,
         current_question_index = $1,
         session_status = $2,
         completed_at = $3
     WHERE id = $4`,
    [
      nextQuestionIndex,
      isSessionComplete ? SESSION_STATUS.COMPLETED : SESSION_STATUS.IN_PROGRESS,
      isSessionComplete ? new Date() : null,
      sessionId,
    ]
  );

  // Update topic progress if session complete
  if (isSessionComplete) {
    await updateTopicProgress(userId, session.curriculum_id, session.topic_id_str);
  }

  // Get next question if available
  let nextQuestion: QuestionModel.QuestionForClient | null = null;
  if (!isSessionComplete) {
    const nextQuestionId = session.question_queue[nextQuestionIndex]!;
    const nextQ = await QuestionModel.findById(nextQuestionId);
    if (nextQ) {
      nextQuestion = QuestionModel.stripAnswerData(nextQ);
    }
  }

  return {
    isSessionComplete,
    nextQuestion,
  };
}

// ============================================
// SESSION QUERIES
// ============================================

/**
 * Gets a session by ID, ensuring it belongs to the user
 */
export async function getSessionForUser(
  userId: string,
  sessionId: string
): Promise<QuizSession> {
  const result = await query<QuizSession>(
    'SELECT * FROM quiz_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (!result.rows[0]) {
    throw new Error('Session not found');
  }

  return result.rows[0];
}

/**
 * Gets session by ID (without user check - for internal use)
 */
export async function getSessionById(sessionId: string): Promise<QuizSession | null> {
  const result = await query<QuizSession>(
    'SELECT * FROM quiz_sessions WHERE id = $1',
    [sessionId]
  );

  return result.rows[0] || null;
}

/**
 * Lists sessions for a user
 */
export async function listUserSessions(
  userId: string,
  options: { limit?: number; offset?: number; status?: SessionStatus } = {}
): Promise<{ sessions: QuizSession[]; total: number }> {
  const { limit = 20, offset = 0, status } = options;

  let whereClause = 'WHERE user_id = $1';
  const params: unknown[] = [userId];

  if (status) {
    whereClause += ` AND session_status = $${params.length + 1}`;
    params.push(status);
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM quiz_sessions ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  params.push(limit, offset);
  const result = await query<QuizSession>(
    `SELECT * FROM quiz_sessions ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { sessions: result.rows, total };
}

/**
 * Gets session summary
 */
export async function getSessionSummary(
  userId: string,
  sessionId: string
): Promise<SessionSummary> {
  const session = await getSessionForUser(userId, sessionId);

  // Get answers with question details
  const answersResult = await query<{
    is_correct: boolean;
    difficulty: string;
  }>(
    `SELECT sa.is_correct, q.difficulty
     FROM session_answers sa
     JOIN questions q ON sa.question_id = q.id
     WHERE sa.session_id = $1`,
    [sessionId]
  );

  // Group by difficulty
  const byDifficulty: Record<string, { answered: number; correct: number }> = {};
  for (const answer of answersResult.rows) {
    if (!byDifficulty[answer.difficulty]) {
      byDifficulty[answer.difficulty] = { answered: 0, correct: 0 };
    }
    const difficultyStats = byDifficulty[answer.difficulty]!;
    difficultyStats.answered++;
    if (answer.is_correct) {
      difficultyStats.correct++;
    }
  }

  return {
    session_id: session.id,
    topic_id: session.topic_id_str,
    topic_name: session.topic_name,
    time_mode: session.time_mode,
    status: session.session_status,
    total_questions: session.question_queue.length,
    questions_answered: session.questions_answered,
    questions_correct: session.questions_correct,
    questions_skipped: session.questions_skipped,
    xp_earned: session.xp_earned,
    time_elapsed_ms: session.time_elapsed_ms,
    by_difficulty: byDifficulty,
    started_at: session.started_at,
    completed_at: session.completed_at,
  };
}

/**
 * Checks if session has timed out
 */
export function isSessionTimedOut(session: QuizSession, currentElapsedMs: number): boolean {
  if (!session.time_limit_ms) {
    return false; // Unlimited mode
  }
  return currentElapsedMs >= session.time_limit_ms;
}

// ============================================
// QUESTION HISTORY TRACKING
// ============================================

/** Supported question types that the frontend can render */
const SUPPORTED_QUESTION_TYPES = new Set(['mcq', 'fill_blank', 'true_false', 'ordering']);

/**
 * History entry for a question the student has previously answered.
 * Tracks the question UUID, whether it was answered correctly, and how many sessions ago.
 */
interface QuestionHistoryEntry {
  questionId: string;
  isCorrect: boolean;
  sessionsAgo: number;
}

/** Map from question UUID -> history entry */
type QuestionHistoryMap = Map<string, QuestionHistoryEntry>;

/**
 * Builds a complete history map of all questions a student has answered for a topic.
 * Tracks: question UUID, correctness, and how many sessions ago.
 * No limit on sessions — we track everything.
 */
export async function buildQuestionHistoryMap(
  userId: string,
  topicIdStr: string
): Promise<QuestionHistoryMap> {
  // Get ALL completed/abandoned sessions for this user + topic, newest first
  const sessionsResult = await query<{ id: string }>(
    `SELECT id FROM quiz_sessions
     WHERE user_id = $1 AND topic_id_str = $2
       AND session_status IN ('completed', 'abandoned')
     ORDER BY completed_at DESC NULLS LAST, created_at DESC`,
    [userId, topicIdStr]
  );

  if (sessionsResult.rows.length === 0) {
    return new Map();
  }

  const sessionIds = sessionsResult.rows.map(r => r.id);

  // Get all answered question_ids with correctness from those sessions
  const answersResult = await query<{ question_id: string; session_id: string; is_correct: boolean }>(
    `SELECT sa.question_id, sa.session_id, sa.is_correct
     FROM session_answers sa
     WHERE sa.session_id = ANY($1)`,
    [sessionIds]
  );

  // Build session index map: session_id -> sessions ago (1-indexed)
  const sessionIndexMap = new Map<string, number>();
  for (let i = 0; i < sessionIds.length; i++) {
    sessionIndexMap.set(sessionIds[i]!, i + 1);
  }

  // Map question_id -> most recent history entry
  // For correctness: use the MOST RECENT attempt's result
  // For sessionsAgo: use the MOST RECENT appearance (minimum)
  const historyMap: QuestionHistoryMap = new Map();
  for (const row of answersResult.rows) {
    const sessionsAgo = sessionIndexMap.get(row.session_id) ?? sessionIds.length;
    const existing = historyMap.get(row.question_id);
    if (existing === undefined || sessionsAgo < existing.sessionsAgo) {
      historyMap.set(row.question_id, {
        questionId: row.question_id,
        isCorrect: row.is_correct,
        sessionsAgo,
      });
    }
  }

  return historyMap;
}

// Keep legacy exports for test compatibility
export type RecencyMap = Map<string, number>;
export const RECENCY_PENALTIES = {
  LAST_SESSION: -80,
  TWO_SESSIONS_AGO: -50,
  THREE_SESSIONS_AGO: -30,
  FOUR_PLUS_AGO: -10,
  NEVER_SEEN: 20,
} as const;

/** @deprecated Use buildQuestionHistoryMap instead */
export async function buildRecencyMap(
  userId: string,
  topicIdStr: string
): Promise<RecencyMap> {
  const historyMap = await buildQuestionHistoryMap(userId, topicIdStr);
  const recencyMap: RecencyMap = new Map();
  for (const [qId, entry] of historyMap) {
    recencyMap.set(qId, entry.sessionsAgo);
  }
  return recencyMap;
}

export function getRecencyPenalty(sessionsAgo: number | undefined): number {
  if (sessionsAgo === undefined) return RECENCY_PENALTIES.NEVER_SEEN;
  if (sessionsAgo <= 1) return RECENCY_PENALTIES.LAST_SESSION;
  if (sessionsAgo === 2) return RECENCY_PENALTIES.TWO_SESSIONS_AGO;
  if (sessionsAgo === 3) return RECENCY_PENALTIES.THREE_SESSIONS_AGO;
  return RECENCY_PENALTIES.FOUR_PLUS_AGO;
}

// ============================================
// COGNITIVE VARIETY BALANCING
// ============================================

/**
 * Ensures cognitive level variety in the final question queue:
 * 1. At least 2 different cognitive_levels in the queue
 * 2. No more than 3 consecutive questions at the same cognitive_level
 *
 * Swaps lowest-scored questions from the selected set with higher-variety
 * questions from the remaining pool when needed.
 */
export function applyCognitiveVariety(
  selected: QuestionWithMetadata[],
  remainingPool: QuestionWithMetadata[]
): QuestionWithMetadata[] {
  if (selected.length <= 1) return selected;

  const result = [...selected];

  // Track IDs already in the result to prevent duplicates
  const usedIds = new Set(result.map(q => q.id));

  // Pass 1: Ensure at least 2 different cognitive levels
  const uniqueLevels = new Set(result.map(q => q.cognitive_level));
  if (uniqueLevels.size < 2 && remainingPool.length > 0) {
    // Find a replacement from the pool with a different cognitive level (no duplicates)
    const currentLevel = result[0]!.cognitive_level;
    const replacement = remainingPool.find(q => q.cognitive_level !== currentLevel && !usedIds.has(q.id));
    if (replacement) {
      // Replace the lowest-scored question
      const lowestIdx = result.reduce((minIdx, q, idx) =>
        q.priority_score < result[minIdx]!.priority_score ? idx : minIdx, 0);
      usedIds.delete(result[lowestIdx]!.id);
      result[lowestIdx] = replacement;
      usedIds.add(replacement.id);
    }
  }

  // Pass 2: Break consecutive runs of >3 same cognitive_level
  for (let i = 3; i < result.length; i++) {
    const a = result[i - 3]!.cognitive_level;
    const b = result[i - 2]!.cognitive_level;
    const c = result[i - 1]!.cognitive_level;
    const d = result[i]!.cognitive_level;

    if (a === b && b === c && c === d) {
      // Find a question later in the array with a different level to swap with
      let swapped = false;
      for (let j = i + 1; j < result.length; j++) {
        if (result[j]!.cognitive_level !== d) {
          const temp = result[i]!;
          result[i] = result[j]!;
          result[j] = temp;
          swapped = true;
          break;
        }
      }
      // If no swap found in selected, try from remaining pool (no duplicates)
      if (!swapped && remainingPool.length > 0) {
        const replacement = remainingPool.find(q => q.cognitive_level !== d && !usedIds.has(q.id));
        if (replacement) {
          usedIds.delete(result[i]!.id);
          result[i] = replacement;
          usedIds.add(replacement.id);
        }
      }
    }
  }

  return result;
}

// ============================================
// QUESTION SELECTION (Ported from question-selector.js)
// ============================================

interface SelectQuestionsParams {
  questions: QuestionModel.Question[];
  camConcepts: CAMConcept[];
  conceptProgresses: Map<string, ConceptProgress>;
  historyMap: QuestionHistoryMap;
  count: number | null;
  strategy: SelectionStrategy;
}

/**
 * Selects questions for a quiz session.
 *
 * Core rules:
 * 1. Never serve a question the student answered correctly recently (hard exclude)
 * 2. Re-test wrong answers after a 2-session gap
 * 3. When the pool at recommended difficulty is thin, widen to adjacent difficulties
 * 4. Final dedup check — no question appears twice
 * 5. Only serve question types the frontend supports
 */
function selectQuestions(params: SelectQuestionsParams): string[] {
  const { questions, camConcepts, conceptProgresses, historyMap, count, strategy } = params;

  if (questions.length === 0) {
    return [];
  }

  // Filter out unsupported question types and questions with missing data
  const validQuestions = questions.filter(q => {
    if (!SUPPORTED_QUESTION_TYPES.has(q.question_type)) return false;
    if (!q.question_text || q.question_text.trim() === '') return false;
    if (q.question_type === 'mcq' && (!q.options || q.options.length === 0)) return false;
    return true;
  });

  if (validQuestions.length === 0) {
    return [];
  }

  // Build question pool with eligibility info (uses history for exclusion)
  const questionPool = buildQuestionPool(validQuestions, camConcepts, conceptProgresses, historyMap);

  // Apply selection strategy
  let selected: QuestionWithMetadata[];

  switch (strategy) {
    case SELECTION_STRATEGIES.SEQUENTIAL:
      selected = selectSequential(questionPool, count);
      break;
    case SELECTION_STRATEGIES.RANDOM:
      selected = selectRandom(questionPool, count);
      break;
    case SELECTION_STRATEGIES.REVIEW:
      selected = selectForReview(questionPool, conceptProgresses, count);
      break;
    case SELECTION_STRATEGIES.ADAPTIVE:
    default:
      selected = selectAdaptive(questionPool, count);
      break;
  }

  // Final dedup: ensure no question UUID appears twice
  const seen = new Set<string>();
  const deduped = selected.filter(q => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });

  // Return UUIDs only
  return deduped.map(q => q.id);
}

/**
 * Builds question pool with eligibility based on CAM, mastery, and history.
 *
 * Exclusion rules:
 * - Correctly answered questions are HARD EXCLUDED (not in pool at all)
 * - Incorrectly answered questions return after a 2-session gap
 * - Never-seen questions get a bonus
 *
 * Difficulty widening:
 * - Always includes recommended difficulty questions
 * - If pool at recommended difficulty is thin (< count needed), widens to adjacent difficulties
 */
function buildQuestionPool(
  questions: QuestionModel.Question[],
  camConcepts: CAMConcept[],
  conceptProgresses: Map<string, ConceptProgress>,
  historyMap: QuestionHistoryMap
): QuestionWithMetadata[] {
  // Build concept lookup
  const conceptMap = new Map<string, CAMConcept>();
  for (const concept of camConcepts) {
    conceptMap.set(concept.concept_id, concept);
  }

  const pool: QuestionWithMetadata[] = [];

  for (const question of questions) {
    const concept = conceptMap.get(question.concept_id_str);
    const progress = conceptProgresses.get(question.concept_id_str) || null;

    // Check if difficulty is allowed by CAM
    const allowedDifficulties = concept?.difficulty_levels || [];
    const isDifficultyAllowed = allowedDifficulties.includes(question.difficulty);

    if (!isDifficultyAllowed) {
      continue; // Skip ineligible questions
    }

    // --- HISTORY-BASED EXCLUSION ---
    const history = historyMap.get(question.id);
    if (history) {
      // Rule 1: Correctly answered → HARD EXCLUDE
      // The student proved they know this. Don't show it again.
      if (history.isCorrect) {
        continue;
      }

      // Rule 2: Incorrectly answered → allow back after 2-session gap
      // Give the student time to absorb the correct answer before retesting.
      if (!history.isCorrect && history.sessionsAgo < 3) {
        continue;
      }
    }

    // Determine recommended difficulty
    let recommendedDifficulty = 'familiarity';
    if (progress) {
      const masteryData = typeof progress.mastery_data === 'string'
        ? JSON.parse(progress.mastery_data)
        : progress.mastery_data;
      recommendedDifficulty = getRecommendedDifficulty(progress.current_difficulty, masteryData);
    }

    const isRecommended = question.difficulty === recommendedDifficulty;

    // Calculate priority score with recency penalty
    // Questions that survived exclusion (wrong answers, 3+ sessions ago) still get
    // a recency penalty so the algorithm prefers fresher content when available.
    const recencyPenalty = getRecencyPenalty(history?.sessionsAgo);
    const priorityScore = calculatePriorityScore(question, progress, isRecommended)
      + recencyPenalty;

    pool.push({
      ...question,
      eligible: true,
      is_recommended: isRecommended,
      priority_score: priorityScore,
      recency_penalty: recencyPenalty,
      concept_progress: progress,
    });
  }

  return pool;
}

/**
 * Calculates priority score for adaptive selection
 */
function calculatePriorityScore(
  question: QuestionModel.Question,
  progress: ConceptProgress | null,
  isRecommended: boolean
): number {
  let score = 0;

  // Recommended difficulty gets highest priority
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

    // Check difficulty mastery
    const masteryData = typeof progress.mastery_data === 'string'
      ? JSON.parse(progress.mastery_data)
      : progress.mastery_data;

    const difficultyMastery = masteryData[question.difficulty as keyof MasteryData];
    if (difficultyMastery && !difficultyMastery.mastered) {
      score += 30; // Not mastered yet
    }

    // Streak bonus (momentum)
    if (difficultyMastery?.streak > 0) {
      score += Math.min(10, difficultyMastery.streak * 2);
    }
  }

  // Add randomness to prevent exact same order
  score += Math.random() * 10;

  return score;
}

/**
 * Adaptive selection based on mastery state
 */
function selectAdaptive(pool: QuestionWithMetadata[], count: number | null): QuestionWithMetadata[] {
  // Sort by priority score (descending)
  const sorted = [...pool].sort((a, b) => b.priority_score - a.priority_score);

  // Group by concept and interleave for variety
  const interleaved = groupAndInterleave(sorted);

  const limit = count || interleaved.length;
  const selected = interleaved.slice(0, limit);
  const remaining = interleaved.slice(limit);

  // Apply cognitive variety balancing
  return applyCognitiveVariety(selected, remaining);
}

/**
 * Sequential selection (order by concept, then difficulty)
 */
function selectSequential(pool: QuestionWithMetadata[], count: number | null): QuestionWithMetadata[] {
  const sorted = [...pool].sort((a, b) => {
    // First by concept_id
    if (a.concept_id_str !== b.concept_id_str) {
      return a.concept_id_str.localeCompare(b.concept_id_str);
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
 */
function selectRandom(pool: QuestionWithMetadata[], count: number | null): QuestionWithMetadata[] {
  const shuffled = shuffleArray([...pool]);
  const limit = count || shuffled.length;
  return shuffled.slice(0, limit);
}

/**
 * Review selection - focuses on questions from concepts with incomplete mastery
 */
function selectForReview(
  pool: QuestionWithMetadata[],
  progresses: Map<string, ConceptProgress>,
  count: number | null
): QuestionWithMetadata[] {
  // Prioritize questions from concepts with recent incorrect answers
  const scored = pool.map(q => {
    const progress = progresses.get(q.concept_id_str);
    let reviewScore = q.priority_score;

    if (progress) {
      const masteryData = typeof progress.mastery_data === 'string'
        ? JSON.parse(progress.mastery_data)
        : progress.mastery_data;

      const diffMastery = masteryData[q.difficulty as keyof MasteryData];
      // Check recent_attempts for incorrect answers
      if (diffMastery?.recent_attempts?.includes(false)) {
        reviewScore += 100; // Prioritize recently incorrect
      }
    }

    return { ...q, review_score: reviewScore };
  });

  const sorted = scored.sort((a, b) => b.review_score - a.review_score);

  const limit = count || sorted.length;
  return sorted.slice(0, limit);
}

/**
 * Groups questions by concept_id_str and interleaves for variety
 */
function groupAndInterleave(items: QuestionWithMetadata[]): QuestionWithMetadata[] {
  // Group by concept_id_str
  const groups = new Map<string, QuestionWithMetadata[]>();
  for (const item of items) {
    const groupKey = item.concept_id_str;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }

  // Interleave: take one from each group in rotation
  const result: QuestionWithMetadata[] = [];
  const groupArrays = Array.from(groups.values());
  const indices = groupArrays.map(() => 0);

  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < groupArrays.length; i++) {
      const groupArray = groupArrays[i]!;
      const idx = indices[i]!;
      if (idx < groupArray.length) {
        result.push(groupArray[idx]!);
        indices[i] = idx + 1;
        added = true;
      }
    }
  }

  return result;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }
  return array;
}
