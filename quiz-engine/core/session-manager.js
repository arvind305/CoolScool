/**
 * Session Manager Module
 *
 * Manages quiz session state following North Star §8:
 * - Time modes: Unlimited, 10min, 5min, 3min (user-chosen)
 * - One question at a time
 * - No negative marking
 * - No forced completion
 *
 * @module quiz-engine/core/session-manager
 */

'use strict';

const { selectQuestions, getNextQuestion } = require('./question-selector');
const { recordAttempt, XP_VALUES } = require('./mastery-tracker');

/**
 * Session status values
 */
const SESSION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
};

/**
 * Time modes as defined in North Star §8.1
 */
const TIME_MODES = {
  UNLIMITED: 'unlimited',
  TEN_MIN: '10min',
  FIVE_MIN: '5min',
  THREE_MIN: '3min'
};

/**
 * Time limits in milliseconds for each mode
 */
const TIME_LIMITS = {
  [TIME_MODES.UNLIMITED]: null,
  [TIME_MODES.TEN_MIN]: 10 * 60 * 1000,
  [TIME_MODES.FIVE_MIN]: 5 * 60 * 1000,
  [TIME_MODES.THREE_MIN]: 3 * 60 * 1000
};

/**
 * Generates a unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sess_${timestamp}_${random}`;
}

/**
 * Creates a new quiz session
 *
 * @param {Object} params - Session parameters
 * @param {string} params.topicId - Topic ID
 * @param {string} params.topicName - Topic name
 * @param {string} params.timeMode - Time mode (unlimited, 10min, 5min, 3min)
 * @param {Object} params.questionBank - Question bank for the topic
 * @param {Object} params.camTopic - CAM topic definition
 * @param {Object} params.conceptProgresses - Current progress by concept
 * @param {number} params.questionCount - Number of questions (optional)
 * @param {string} params.strategy - Question selection strategy (optional)
 * @returns {Object} New session object
 */
function createSession(params) {
  const {
    topicId,
    topicName,
    timeMode = TIME_MODES.UNLIMITED,
    questionBank,
    camTopic,
    conceptProgresses = {},
    questionCount = null,
    strategy = 'adaptive'
  } = params;

  const now = new Date().toISOString();

  // Select questions for this session
  const questions = selectQuestions({
    questionBank,
    camTopic,
    conceptProgresses,
    count: questionCount,
    strategy
  });

  return {
    version: '1.0.0',
    session_id: generateSessionId(),
    status: SESSION_STATUS.NOT_STARTED,
    config: {
      time_mode: timeMode,
      time_limit_ms: TIME_LIMITS[timeMode],
      topic_id: topicId,
      topic_name: topicName,
      question_count: questions.length
    },
    progress: {
      questions_answered: 0,
      questions_correct: 0,
      xp_earned: 0,
      current_question_index: 0,
      time_elapsed_ms: 0,
      time_remaining_ms: TIME_LIMITS[timeMode]
    },
    questions,
    current_question: questions.length > 0 ? questions[0] : null,
    answers: [],
    created_at: now,
    started_at: null,
    completed_at: null,
    paused_at: null
  };
}

/**
 * Starts a session (transitions from not_started to in_progress)
 *
 * @param {Object} session - Session object
 * @returns {Object} Updated session
 */
function startSession(session) {
  if (session.status !== SESSION_STATUS.NOT_STARTED) {
    throw new Error(`Cannot start session in status: ${session.status}`);
  }

  const now = new Date().toISOString();

  return {
    ...session,
    status: SESSION_STATUS.IN_PROGRESS,
    started_at: now
  };
}

/**
 * Pauses a session
 *
 * @param {Object} session - Session object
 * @param {number} elapsedSinceStart - Time elapsed since session started (ms)
 * @returns {Object} Updated session
 */
function pauseSession(session, elapsedSinceStart) {
  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error(`Cannot pause session in status: ${session.status}`);
  }

  const now = new Date().toISOString();

  return {
    ...session,
    status: SESSION_STATUS.PAUSED,
    paused_at: now,
    progress: {
      ...session.progress,
      time_elapsed_ms: elapsedSinceStart,
      time_remaining_ms: session.config.time_limit_ms
        ? Math.max(0, session.config.time_limit_ms - elapsedSinceStart)
        : null
    }
  };
}

/**
 * Resumes a paused session
 *
 * @param {Object} session - Session object
 * @returns {Object} Updated session
 */
function resumeSession(session) {
  if (session.status !== SESSION_STATUS.PAUSED) {
    throw new Error(`Cannot resume session in status: ${session.status}`);
  }

  return {
    ...session,
    status: SESSION_STATUS.IN_PROGRESS,
    paused_at: null
  };
}

/**
 * Records an answer for the current question
 *
 * @param {Object} session - Session object
 * @param {Object} answer - Answer details
 * @param {*} answer.userAnswer - User's answer
 * @param {number} answer.timeTakenMs - Time taken to answer
 * @param {Object} conceptProgress - Current concept progress (to update)
 * @returns {Object} Result with updated session and progress
 */
function submitAnswer(session, answer, conceptProgress) {
  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error(`Cannot submit answer in status: ${session.status}`);
  }

  const currentQuestion = session.current_question;
  if (!currentQuestion) {
    throw new Error('No current question to answer');
  }

  const { userAnswer, timeTakenMs = 0 } = answer;
  const now = new Date().toISOString();

  // Check if answer is correct
  const isCorrect = checkAnswer(userAnswer, currentQuestion);

  // Calculate XP (no negative marking per North Star §8)
  const xpEarned = isCorrect ? (XP_VALUES[currentQuestion.difficulty] || 0) : 0;

  // Record the answer
  const sessionAnswer = {
    question_id: currentQuestion.question_id,
    user_answer: userAnswer,
    is_correct: isCorrect,
    xp_earned: xpEarned,
    time_taken_ms: timeTakenMs,
    answered_at: now
  };

  // Update concept progress if provided
  let updatedConceptProgress = conceptProgress;
  let masteryResult = null;

  if (conceptProgress) {
    masteryResult = recordAttempt(conceptProgress, {
      questionId: currentQuestion.question_id,
      difficulty: currentQuestion.difficulty,
      isCorrect,
      timeTakenMs
    });
    updatedConceptProgress = masteryResult.conceptProgress;
  }

  // Update session progress
  const newAnswers = [...session.answers, sessionAnswer];
  const newQuestionsAnswered = session.progress.questions_answered + 1;
  const newQuestionsCorrect = session.progress.questions_correct + (isCorrect ? 1 : 0);
  const newXpEarned = session.progress.xp_earned + xpEarned;
  const newQuestionIndex = session.progress.current_question_index + 1;

  // Mark current question as answered
  const updatedQuestions = session.questions.map((q, i) =>
    i === session.progress.current_question_index
      ? { ...q, status: 'answered' }
      : q
  );

  // Get next question (may be null if done)
  const nextQuestionResult = getNextQuestion(session.questions, session.progress.current_question_index);

  // Check if session is complete
  const isComplete = !nextQuestionResult;

  return {
    session: {
      ...session,
      status: isComplete ? SESSION_STATUS.COMPLETED : SESSION_STATUS.IN_PROGRESS,
      progress: {
        ...session.progress,
        questions_answered: newQuestionsAnswered,
        questions_correct: newQuestionsCorrect,
        xp_earned: newXpEarned,
        current_question_index: isComplete ? newQuestionIndex : nextQuestionResult.index
      },
      questions: updatedQuestions,
      current_question: nextQuestionResult?.question || null,
      answers: newAnswers,
      completed_at: isComplete ? now : null
    },
    answer: sessionAnswer,
    conceptProgress: updatedConceptProgress,
    masteryResult,
    isSessionComplete: isComplete
  };
}

/**
 * Skips the current question (per North Star §8 - no forced completion)
 *
 * @param {Object} session - Session object
 * @returns {Object} Updated session
 */
function skipQuestion(session) {
  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    throw new Error(`Cannot skip question in status: ${session.status}`);
  }

  const currentQuestion = session.current_question;
  if (!currentQuestion) {
    throw new Error('No current question to skip');
  }

  // Mark current question as skipped
  const updatedQuestions = session.questions.map((q, i) =>
    i === session.progress.current_question_index
      ? { ...q, status: 'skipped' }
      : q
  );

  // Get next question
  const nextQuestionResult = getNextQuestion(session.questions, session.progress.current_question_index);
  const isComplete = !nextQuestionResult;

  const now = new Date().toISOString();

  return {
    ...session,
    status: isComplete ? SESSION_STATUS.COMPLETED : SESSION_STATUS.IN_PROGRESS,
    progress: {
      ...session.progress,
      current_question_index: isComplete
        ? session.progress.current_question_index + 1
        : nextQuestionResult.index
    },
    questions: updatedQuestions,
    current_question: nextQuestionResult?.question || null,
    completed_at: isComplete ? now : null
  };
}

/**
 * Ends the session (user abandons or completes)
 *
 * @param {Object} session - Session object
 * @param {boolean} completed - Whether session was completed vs abandoned
 * @returns {Object} Updated session
 */
function endSession(session, completed = false) {
  const now = new Date().toISOString();

  return {
    ...session,
    status: completed ? SESSION_STATUS.COMPLETED : SESSION_STATUS.ABANDONED,
    completed_at: now
  };
}

/**
 * Checks if an answer is correct
 *
 * @param {*} userAnswer - User's answer
 * @param {Object} question - Question object
 * @returns {boolean} True if correct
 */
function checkAnswer(userAnswer, question) {
  const correctAnswer = question.correct_answer;

  switch (question.type) {
    case 'mcq':
    case 'true_false':
      // Simple string comparison (case-insensitive)
      return String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase();

    case 'fill_blank':
      // String comparison, trimmed and case-insensitive
      return String(userAnswer).trim().toLowerCase() ===
             String(correctAnswer).trim().toLowerCase();

    case 'ordering':
      // Array comparison (order matters)
      if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
        return false;
      }
      if (userAnswer.length !== correctAnswer.length) {
        return false;
      }
      return userAnswer.every((item, i) => item === correctAnswer[i]);

    case 'match':
      // Object/Map comparison for match pairs
      if (typeof userAnswer !== 'object' || typeof correctAnswer !== 'object') {
        return false;
      }
      const correctPairs = new Map();
      for (const pair of (question.match_pairs || [])) {
        correctPairs.set(pair.left, pair.right);
      }
      for (const [left, right] of Object.entries(userAnswer)) {
        if (correctPairs.get(left) !== right) {
          return false;
        }
      }
      return Object.keys(userAnswer).length === correctPairs.size;

    default:
      return userAnswer === correctAnswer;
  }
}

/**
 * Gets session summary (for display after completion)
 *
 * @param {Object} session - Session object
 * @returns {Object} Session summary
 */
function getSessionSummary(session) {
  const totalQuestions = session.questions.length;
  const answered = session.answers.length;
  const correct = session.progress.questions_correct;
  const skipped = session.questions.filter(q => q.status === 'skipped').length;

  // Group answers by difficulty
  const byDifficulty = {};
  for (const answer of session.answers) {
    const question = session.questions.find(q => q.question_id === answer.question_id);
    if (question) {
      const diff = question.difficulty;
      if (!byDifficulty[diff]) {
        byDifficulty[diff] = { answered: 0, correct: 0 };
      }
      byDifficulty[diff].answered++;
      if (answer.is_correct) {
        byDifficulty[diff].correct++;
      }
    }
  }

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
    by_difficulty: byDifficulty,
    started_at: session.started_at,
    completed_at: session.completed_at
  };
}

/**
 * Checks if session has timed out
 *
 * @param {Object} session - Session object
 * @param {number} currentElapsedMs - Current elapsed time in ms
 * @returns {boolean} True if timed out
 */
function isSessionTimedOut(session, currentElapsedMs) {
  if (!session.config.time_limit_ms) {
    return false; // Unlimited mode
  }
  return currentElapsedMs >= session.config.time_limit_ms;
}

// Export module
module.exports = {
  SESSION_STATUS,
  TIME_MODES,
  TIME_LIMITS,
  generateSessionId,
  createSession,
  startSession,
  pauseSession,
  resumeSession,
  submitAnswer,
  skipQuestion,
  endSession,
  checkAnswer,
  getSessionSummary,
  isSessionTimedOut
};
