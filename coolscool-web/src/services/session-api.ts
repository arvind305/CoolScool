/**
 * Session API Service
 *
 * Backend session API client for quiz sessions.
 * Uses the unified API client which auto-injects auth tokens.
 */

import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

// ============================================
// Types
// ============================================

/** Question as returned by the backend (answer data stripped) */
export interface BackendQuestion {
  id: string;
  question_id: string;
  concept_id_str: string;
  topic_id_str: string;
  difficulty: string;
  cognitive_level: string;
  question_type: string;
  question_text: string;
  options: { id: string; text: string }[] | null;
  match_left: string[] | null;
  match_right_shuffled: string[] | null;
  ordering_items_shuffled: string[] | null;
  hint: string | null;
  image_url: string | null;
  option_images: Record<string, string> | null;
}

/** Session info from create/start responses */
export interface BackendSession {
  id: string;
  curriculumId: string;
  status: string;
  timeMode: string;
  timeLimitMs: number | null;
  topicId: string;
  topicName: string;
  totalQuestions: number;
  currentQuestionIndex: number;
}

/** Result from submitting an answer */
export interface BackendSubmitResult {
  isCorrect: boolean;
  xpEarned: number;
  masteryAchieved: boolean;
  newDifficulty: string;
  correctAnswer: string | string[];
  explanationCorrect: string | null;
  explanationIncorrect: string | null;
  isSessionComplete: boolean;
  nextQuestion: BackendQuestion | null;
}

/** Result from skipping a question */
export interface BackendSkipResult {
  isSessionComplete: boolean;
  nextQuestion: BackendQuestion | null;
}

/** Session summary from the backend */
export interface BackendSessionSummary {
  sessionId: string;
  topicId: string;
  topicName: string;
  timeMode: string;
  status: string;
  totalQuestions: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsSkipped: number;
  xpEarned: number;
  timeElapsedMs: number;
  byDifficulty: Record<string, { answered: number; correct: number }>;
  startedAt: string | null;
  completedAt: string | null;
}

/** Topic progress from the progress API */
export interface BackendTopicProgress {
  topicId: string;
  topicName: string;
  proficiencyBand: string;
  bandLabel: string;
  bandMessage: string;
  conceptsStarted: number;
  conceptsTotal: number;
  xpEarned: number;
  lastAttemptedAt: string | null;
}

// ============================================
// API Functions
// ============================================

/** Create a new quiz session (backend selects questions using adaptive algorithm) */
export async function createSession(params: {
  curriculumId: string;
  topicId: string;
  timeMode: string;
  questionCount?: number;
}): Promise<{ session: BackendSession; currentQuestion: BackendQuestion | null }> {
  return api.post(ENDPOINTS.SESSIONS, params);
}

/** Start a session (NOT_STARTED -> IN_PROGRESS) */
export async function startSession(
  sessionId: string
): Promise<{
  session: { id: string; status: string; startedAt: string };
  currentQuestion: BackendQuestion | null;
}> {
  return api.post(ENDPOINTS.SESSION_START(sessionId));
}

/** Submit an answer for the current question */
export async function submitAnswer(
  sessionId: string,
  params: { userAnswer: string | string[]; timeTakenMs: number }
): Promise<BackendSubmitResult> {
  return api.post(ENDPOINTS.SESSION_ANSWER(sessionId), params);
}

/** Skip the current question */
export async function skipSessionQuestion(
  sessionId: string
): Promise<BackendSkipResult> {
  return api.post(ENDPOINTS.SESSION_SKIP(sessionId));
}

/** End a session (complete or abandon) */
export async function endSession(
  sessionId: string,
  completed: boolean,
  elapsedMs?: number
): Promise<{
  session: {
    id: string;
    status: string;
    questionsAnswered: number;
    questionsCorrect: number;
    questionsSkipped: number;
    xpEarned: number;
    completedAt: string | null;
  };
}> {
  return api.post(ENDPOINTS.SESSION_END(sessionId), { completed, elapsedMs });
}

/** Get session summary with by-difficulty breakdown */
export async function getSessionSummary(
  sessionId: string
): Promise<{ summary: BackendSessionSummary }> {
  return api.get(ENDPOINTS.SESSION_SUMMARY(sessionId));
}

/** Get topic progress/proficiency from progress API */
export async function getTopicProgress(
  topicId: string
): Promise<BackendTopicProgress | null> {
  try {
    const result: { progress: BackendTopicProgress } = await api.get(
      ENDPOINTS.PROGRESS_TOPIC(topicId)
    );
    return result.progress || null;
  } catch {
    return null;
  }
}
