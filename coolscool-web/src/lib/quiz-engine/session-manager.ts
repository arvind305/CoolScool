/**
 * Session Manager Module
 *
 * Manages quiz sessions including creation, starting, answering questions,
 * timing, and completion.
 */

import type {
  QuizSession,
  SessionStatus,
  TimeMode,
  SessionConfig,
  SessionProgress,
  SessionSummary,
  SessionAnswer,
  EnrichedQuestion,
  ConceptProgress,
  QuestionBank,
  CAMTopic,
  AnswerInput,
  SubmitAnswerResult,
  SelectionStrategy,
} from './types';

import { XP_VALUES, recordAttempt } from './mastery-tracker';
import { selectQuestions, getNextQuestion } from './question-selector';

// ============================================================
// Constants
// ============================================================

export const SESSION_STATUS: Record<string, SessionStatus> = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

export const TIME_MODES: Record<string, TimeMode> = {
  UNLIMITED: 'unlimited',
  TEN_MIN: '10min',
  FIVE_MIN: '5min',
  THREE_MIN: '3min',
};

export const TIME_LIMITS: Record<TimeMode, number | null> = {
  unlimited: null,
  '10min': 10 * 60 * 1000,
  '5min': 5 * 60 * 1000,
  '3min': 3 * 60 * 1000,
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generates a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sess_${timestamp}_${random}`;
}

/**
 * Normalize a fill-blank answer for comparison.
 * Applied identically to both user input and correct answer.
 */
export function normalizeFillBlank(raw: string): string {
  let s = raw.trim().toLowerCase();
  // Collapse multiple spaces to single
  s = s.replace(/\s+/g, ' ');
  // Strip trailing period or comma
  s = s.replace(/[.,]+$/, '');
  // Remove apostrophes ("bowman's" → "bowmans")
  s = s.replace(/'/g, '');
  // Normalize hyphens to spaces for text (not purely numeric/math)
  // Only if the string contains letters (skip "-3", "x^2 - 1")
  if (/^[a-z\s-]+$/.test(s)) {
    s = s.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return s;
}

/**
 * Levenshtein distance between two strings.
 * Used for limited typo tolerance on longer text answers.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Use single-row optimization
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]!
        : 1 + Math.min(prev[j - 1]!, prev[j]!, curr[j - 1]!);
    }
    prev = curr;
  }
  return prev[n]!;
}

/**
 * Check a fill-blank answer: normalize then compare, with limited typo tolerance
 * for non-numeric text answers longer than 5 characters.
 */
export function checkFillBlank(userRaw: string, correctRaw: string): boolean {
  const user = normalizeFillBlank(userRaw);
  const correct = normalizeFillBlank(correctRaw);

  // Exact match after normalization
  if (user === correct) return true;

  // No fuzzy matching for numeric/math answers or short strings
  const isNumericOrMath = /[0-9^()\/]/.test(correct);
  if (isNumericOrMath) return false;
  if (correct.length <= 5) return false;

  // Allow Levenshtein distance of 1 for typo tolerance
  return levenshtein(user, correct) <= 1;
}

/**
 * Normalize a true/false answer to canonical form ("a" or "b").
 * Handles inconsistent data: "A", "B", "true", "false", "True", "False".
 */
export function normalizeTrueFalse(answer: string): string {
  const lower = answer.toLowerCase().trim();
  if (lower === 'true' || lower === 'a') return 'a';
  if (lower === 'false' || lower === 'b') return 'b';
  return lower;
}

/**
 * Checks if a user's answer is correct
 */
export function checkAnswer(
  userAnswer: string | string[],
  question: EnrichedQuestion
): boolean {
  const correctAnswer = question.correct_answer;

  switch (question.type) {
    case 'mcq':
      return (
        String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase()
      );

    case 'true_false':
      return (
        normalizeTrueFalse(String(userAnswer)) === normalizeTrueFalse(String(correctAnswer))
      );

    case 'fill_blank':
      return checkFillBlank(String(userAnswer), String(correctAnswer));

    case 'ordering':
      if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
        return false;
      }
      if (userAnswer.length !== correctAnswer.length) return false;
      return userAnswer.every((item, i) => item === correctAnswer[i]);

    default:
      return userAnswer === correctAnswer;
  }
}

// ============================================================
// Session Creation
// ============================================================

export interface CreateSessionParams {
  topicId: string;
  topicName: string;
  timeMode?: TimeMode;
  questionBank: QuestionBank;
  camTopic: CAMTopic;
  conceptProgresses?: Record<string, ConceptProgress>;
  questionCount?: number | null;
  strategy?: SelectionStrategy;
  // Board/class context
  board?: string;
  classLevel?: number;
  subject?: string;
}

/**
 * Creates a new quiz session
 *
 * @param params - Session creation parameters
 * @returns A new QuizSession object
 */
export function createSession(params: CreateSessionParams): QuizSession {
  const {
    topicId,
    topicName,
    timeMode = 'unlimited',
    questionBank,
    camTopic,
    conceptProgresses = {},
    questionCount = null,
    strategy = 'adaptive',
    board,
    classLevel,
    subject,
  } = params;

  const now = new Date().toISOString();

  // Select questions based on strategy
  const questions = selectQuestions({
    questionBank,
    camTopic,
    conceptProgresses,
    count: questionCount,
    strategy,
  });

  return {
    version: '1.0.0',
    session_id: generateSessionId(),
    status: 'not_started',
    config: {
      time_mode: timeMode,
      time_limit_ms: TIME_LIMITS[timeMode],
      topic_id: topicId,
      topic_name: topicName,
      question_count: questions.length,
      board,
      class_level: classLevel,
      subject,
    },
    progress: {
      questions_answered: 0,
      questions_correct: 0,
      xp_earned: 0,
      current_question_index: 0,
      time_elapsed_ms: 0,
      time_remaining_ms: TIME_LIMITS[timeMode],
    },
    questions,
    current_question: questions.length > 0 ? questions[0] : null,
    answers: [],
    created_at: now,
    started_at: null,
    completed_at: null,
    paused_at: null,
  };
}

// ============================================================
// Session State Changes
// ============================================================

/**
 * Starts a session (transitions from not_started to in_progress)
 */
export function startSession(session: QuizSession): QuizSession {
  if (session.status !== 'not_started') {
    throw new Error(`Cannot start session in status: ${session.status}`);
  }

  return {
    ...session,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  };
}

/**
 * Pauses an in-progress session
 */
export function pauseSession(session: QuizSession): QuizSession {
  if (session.status !== 'in_progress') {
    throw new Error(`Cannot pause session in status: ${session.status}`);
  }

  return {
    ...session,
    status: 'paused',
    paused_at: new Date().toISOString(),
  };
}

/**
 * Resumes a paused session
 */
export function resumeSession(session: QuizSession): QuizSession {
  if (session.status !== 'paused') {
    throw new Error(`Cannot resume session in status: ${session.status}`);
  }

  return {
    ...session,
    status: 'in_progress',
    paused_at: null,
  };
}

/**
 * Ends a session (marks as completed or abandoned)
 */
export function endSession(
  session: QuizSession,
  completed: boolean = false
): QuizSession {
  return {
    ...session,
    status: completed ? 'completed' : 'abandoned',
    completed_at: new Date().toISOString(),
  };
}

// ============================================================
// Answer Handling
// ============================================================

/**
 * Submits an answer for the current question
 *
 * @param session - The current session
 * @param answer - The answer input
 * @param conceptProgress - The concept progress (will be updated)
 * @returns Result containing updated session and concept progress
 */
export function submitAnswer(
  session: QuizSession,
  answer: AnswerInput,
  conceptProgress: ConceptProgress | null
): SubmitAnswerResult {
  if (session.status !== 'in_progress') {
    throw new Error(`Cannot submit answer in status: ${session.status}`);
  }

  const currentQuestion = session.current_question;
  if (!currentQuestion) {
    throw new Error('No current question to answer');
  }

  const { userAnswer, timeTakenMs = 0 } = answer;
  const now = new Date().toISOString();
  const isCorrect = checkAnswer(userAnswer, currentQuestion);
  const xpEarned = isCorrect ? XP_VALUES[currentQuestion.difficulty] || 0 : 0;

  // Create session answer record
  const sessionAnswer: SessionAnswer = {
    question_id: currentQuestion.question_id,
    user_answer: userAnswer,
    is_correct: isCorrect,
    xp_earned: xpEarned,
    time_taken_ms: timeTakenMs,
    answered_at: now,
  };

  // Update concept progress if provided
  let updatedConceptProgress = conceptProgress;
  let masteryResult = null;

  if (conceptProgress) {
    masteryResult = recordAttempt(conceptProgress, {
      questionId: currentQuestion.question_id,
      difficulty: currentQuestion.difficulty,
      isCorrect,
      timeTakenMs,
    });
    updatedConceptProgress = masteryResult.conceptProgress;
  }

  // Update session state
  const newAnswers = [...session.answers, sessionAnswer];
  const newQuestionsAnswered = session.progress.questions_answered + 1;
  const newQuestionsCorrect =
    session.progress.questions_correct + (isCorrect ? 1 : 0);
  const newXpEarned = session.progress.xp_earned + xpEarned;
  const newQuestionIndex = session.progress.current_question_index + 1;

  // Mark current question as answered
  const updatedQuestions = session.questions.map((q, i) =>
    i === session.progress.current_question_index
      ? { ...q, status: 'answered' as const }
      : q
  );

  // Get next question
  const nextQuestionResult = getNextQuestion(
    session.questions,
    session.progress.current_question_index
  );
  const isComplete = !nextQuestionResult;

  return {
    session: {
      ...session,
      status: isComplete ? 'completed' : 'in_progress',
      progress: {
        ...session.progress,
        questions_answered: newQuestionsAnswered,
        questions_correct: newQuestionsCorrect,
        xp_earned: newXpEarned,
        current_question_index: isComplete
          ? session.progress.current_question_index  // Keep at last valid index when complete
          : nextQuestionResult.index,
      },
      questions: updatedQuestions,
      current_question: nextQuestionResult?.question || null,
      answers: newAnswers,
      completed_at: isComplete ? now : null,
    },
    answer: sessionAnswer,
    conceptProgress: updatedConceptProgress!,
    masteryResult,
    isSessionComplete: isComplete,
  };
}

/**
 * Skips the current question
 */
export function skipQuestion(session: QuizSession): QuizSession {
  if (session.status !== 'in_progress') {
    throw new Error(`Cannot skip question in status: ${session.status}`);
  }

  const currentQuestion = session.current_question;
  if (!currentQuestion) {
    throw new Error('No current question to skip');
  }

  // Mark current question as skipped
  const updatedQuestions = session.questions.map((q, i) =>
    i === session.progress.current_question_index
      ? { ...q, status: 'skipped' as const }
      : q
  );

  // Get next question
  const nextQuestionResult = getNextQuestion(
    session.questions,
    session.progress.current_question_index
  );
  const isComplete = !nextQuestionResult;

  return {
    ...session,
    status: isComplete ? 'completed' : 'in_progress',
    progress: {
      ...session.progress,
      current_question_index: isComplete
        ? session.progress.current_question_index  // Keep at last valid index when complete
        : nextQuestionResult.index,
    },
    questions: updatedQuestions,
    current_question: nextQuestionResult?.question || null,
    completed_at: isComplete ? new Date().toISOString() : null,
  };
}

// ============================================================
// Session Summary & Timing
// ============================================================

/**
 * Gets a summary of the session
 */
export function getSessionSummary(session: QuizSession): SessionSummary {
  const totalQuestions = session.questions.length;
  const answered = session.answers.length;
  const correct = session.progress.questions_correct;
  const skipped = session.questions.filter((q) => q.status === 'skipped').length;

  return {
    session_id: session.session_id,
    topic_id: session.config.topic_id,
    topic_name: session.config.topic_name,
    time_mode: session.config.time_mode,
    status: session.status,
    total_questions: totalQuestions,
    questions_answered: answered,
    questions_correct: correct,
    questions_skipped: skipped,
    xp_earned: session.progress.xp_earned,
    time_elapsed_ms: session.progress.time_elapsed_ms,
    started_at: session.started_at,
    completed_at: session.completed_at,
    board: session.config.board,
    class_level: session.config.class_level,
    subject: session.config.subject,
  };
}

/**
 * Checks if a session has timed out
 */
export function isSessionTimedOut(
  session: QuizSession,
  currentElapsedMs: number
): boolean {
  if (!session.config.time_limit_ms) return false;
  return currentElapsedMs >= session.config.time_limit_ms;
}

/**
 * Updates the session's elapsed time
 */
export function updateSessionTime(
  session: QuizSession,
  elapsedMs: number
): QuizSession {
  const timeRemaining = session.config.time_limit_ms
    ? Math.max(0, session.config.time_limit_ms - elapsedMs)
    : null;

  return {
    ...session,
    progress: {
      ...session.progress,
      time_elapsed_ms: elapsedMs,
      time_remaining_ms: timeRemaining,
    },
  };
}

/**
 * Calculates the accuracy percentage for a session
 */
export function getSessionAccuracy(session: QuizSession): number {
  if (session.progress.questions_answered === 0) return 0;
  return Math.round(
    (session.progress.questions_correct / session.progress.questions_answered) *
      100
  );
}

/**
 * Calculates the average time per question
 */
export function getAverageTimePerQuestion(session: QuizSession): number {
  if (session.answers.length === 0) return 0;
  const totalTime = session.answers.reduce((sum, a) => sum + a.time_taken_ms, 0);
  return Math.round(totalTime / session.answers.length);
}
