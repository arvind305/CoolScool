/**
 * Daily Challenge Service
 *
 * Manages daily challenge questions — one random question per day.
 * Users get one attempt per day and earn bonus XP for correct answers.
 */

import { query } from '../db/index.js';
import * as QuestionModel from '../models/question.model.js';

// ============================================
// INTERFACES
// ============================================

export interface DailyChallenge {
  id: string;
  challengeDate: string;
  bonusXp: number;
  question: QuestionModel.QuestionForClient;
}

export interface DailyChallengeResult {
  isCorrect: boolean;
  xpEarned: number;
  correctAnswer: unknown;
  explanation: string | null;
}

export interface UserDailyChallengeStatus {
  challenge: DailyChallenge | null;
  attempted: boolean;
  result: {
    isCorrect: boolean;
    xpEarned: number;
  } | null;
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Get or create today's daily challenge.
 */
export async function getTodayChallenge(): Promise<DailyChallenge | null> {
  const today = new Date().toISOString().split('T')[0]!;

  // Check if challenge exists for today
  const existing = await query<{
    id: string;
    challenge_date: string;
    question_id: string;
    bonus_xp: number;
  }>(
    'SELECT * FROM daily_challenges WHERE challenge_date = $1',
    [today]
  );

  let challengeRow = existing.rows[0];

  if (!challengeRow) {
    // Pick a random MCQ question not used in the last 30 days
    const questionResult = await query<{ id: string }>(
      `SELECT q.id FROM questions q
       WHERE q.question_type = 'mcq'
         AND q.difficulty IN ('familiarity', 'application')
         AND q.id NOT IN (
           SELECT dc.question_id FROM daily_challenges dc
           WHERE dc.challenge_date > CURRENT_DATE - INTERVAL '30 days'
         )
       ORDER BY RANDOM()
       LIMIT 1`
    );

    if (!questionResult.rows[0]) {
      // Fallback: pick any MCQ question
      const fallback = await query<{ id: string }>(
        `SELECT q.id FROM questions q
         WHERE q.question_type = 'mcq'
         ORDER BY RANDOM() LIMIT 1`
      );
      if (!fallback.rows[0]) return null;
      questionResult.rows[0] = fallback.rows[0];
    }

    const insertResult = await query<{
      id: string;
      challenge_date: string;
      question_id: string;
      bonus_xp: number;
    }>(
      `INSERT INTO daily_challenges (challenge_date, question_id, bonus_xp)
       VALUES ($1, $2, 50)
       ON CONFLICT (challenge_date) DO UPDATE SET challenge_date = EXCLUDED.challenge_date
       RETURNING *`,
      [today, questionResult.rows[0]!.id]
    );

    challengeRow = insertResult.rows[0];
  }

  if (!challengeRow) return null;

  // Get the full question (stripped of answer data for the client)
  const question = await QuestionModel.findById(challengeRow.question_id);
  if (!question) return null;

  return {
    id: challengeRow.id,
    challengeDate: challengeRow.challenge_date,
    bonusXp: challengeRow.bonus_xp,
    question: QuestionModel.stripAnswerData(question),
  };
}

/**
 * Submit an answer for today's daily challenge.
 * Enforces one attempt per user per day.
 */
export async function submitDailyChallengeAnswer(
  userId: string,
  answer: string
): Promise<DailyChallengeResult> {
  const today = new Date().toISOString().split('T')[0]!;

  // Get today's challenge
  const challengeResult = await query<{
    id: string;
    question_id: string;
    bonus_xp: number;
  }>(
    'SELECT * FROM daily_challenges WHERE challenge_date = $1',
    [today]
  );

  const challenge = challengeResult.rows[0];
  if (!challenge) {
    throw new Error('No daily challenge available today');
  }

  // Check if already attempted
  const attemptCheck = await query<{ id: string }>(
    'SELECT id FROM daily_challenge_attempts WHERE user_id = $1 AND challenge_id = $2',
    [userId, challenge.id]
  );

  if (attemptCheck.rows[0]) {
    throw new Error('Already attempted today\'s daily challenge');
  }

  // Get the question with answer data
  const question = await QuestionModel.findById(challenge.question_id);
  if (!question) {
    throw new Error('Daily challenge question not found');
  }

  // Check answer
  const isCorrect = QuestionModel.checkAnswer(question, answer);
  const xpEarned = isCorrect ? challenge.bonus_xp : 0;

  // Record attempt
  await query(
    `INSERT INTO daily_challenge_attempts (user_id, challenge_id, user_answer, is_correct, xp_earned)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, challenge.id, answer, isCorrect, xpEarned]
  );

  // Pick the right explanation
  const explanation = isCorrect
    ? question.explanation_correct
    : question.explanation_incorrect;

  return {
    isCorrect,
    xpEarned,
    correctAnswer: question.correct_answer,
    explanation,
  };
}

/**
 * Get user's daily challenge status (attempted or not).
 */
export async function getUserDailyChallengeStatus(
  userId: string
): Promise<UserDailyChallengeStatus> {
  const challenge = await getTodayChallenge();
  if (!challenge) {
    return { challenge: null, attempted: false, result: null };
  }

  // Check if user has attempted
  const attemptResult = await query<{
    is_correct: boolean;
    xp_earned: number;
  }>(
    `SELECT is_correct, xp_earned FROM daily_challenge_attempts
     WHERE user_id = $1 AND challenge_id = $2`,
    [userId, challenge.id]
  );

  const attempt = attemptResult.rows[0];

  return {
    challenge,
    attempted: !!attempt,
    result: attempt ? { isCorrect: attempt.is_correct, xpEarned: attempt.xp_earned } : null,
  };
}
