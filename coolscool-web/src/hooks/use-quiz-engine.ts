'use client';

/**
 * useQuizEngine Hook
 *
 * Backend-driven quiz engine hook. All quiz operations (question selection,
 * answer checking, mastery tracking, XP) are handled by the backend session API.
 * The frontend just renders questions and sends answers.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getBandMessage } from '@/lib/quiz-engine/quiz-engine';
import type {
  CAM,
  CAMTopic,
  QuizSession,
  TimeMode,
  TopicProficiency,
  SessionSummary,
  AnswerSubmitResult,
  EnrichedQuestion,
  ProficiencyBand,
  SessionStatus,
} from '@/lib/quiz-engine/types';
import { fetchCAM, fetchCAMByCurriculumId } from '@/services/curriculum-api';
import * as sessionApi from '@/services/session-api';
import type { BackendQuestion } from '@/services/session-api';

export interface UseQuizEngineOptions {
  board?: string;
  classLevel?: number;
  subject?: string;
  userId?: string;
  /** Required curriculum ID for backend sessions */
  curriculumId?: string;
}

export interface QuizEngineState {
  // Engine state
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // CAM data
  cam: CAM | null;
  themes: CAM['themes'];

  // Quiz session state
  session: QuizSession | null;
  currentQuestion: EnrichedQuestion | null;
  isSessionActive: boolean;

  // Answer feedback
  lastAnswerResult: AnswerSubmitResult | null;
  showingFeedback: boolean;

  // Topic-level canonical explanation
  canonicalExplanation: string | undefined;
}

export interface UseQuizEngineReturn extends QuizEngineState {
  // Initialization
  initialize: () => Promise<void>;

  // Topic operations
  getTopicProficiency: (topicId: string) => Promise<TopicProficiency>;
  getCAMTopic: (topicId: string) => CAMTopic | null;

  // Session operations
  startQuiz: (topicId: string, timeMode: TimeMode) => Promise<boolean>;
  submitAnswer: (answer: string | string[], timeTakenMs?: number) => Promise<AnswerSubmitResult | null>;
  skipQuestion: () => Promise<{ isSessionComplete: boolean }>;
  nextQuestion: () => void;
  endSession: (completed?: boolean, elapsedMs?: number) => Promise<SessionSummary | null>;

  // Utility
  getBandMessage: (band: ProficiencyBand) => string;
  getTotalXP: () => Promise<number>;
}

// ============================================
// Helpers
// ============================================

const BAND_LEVELS: Record<string, number> = {
  not_started: 0,
  building_familiarity: 1,
  growing_confidence: 2,
  consistent_understanding: 3,
  exam_ready: 4,
};

/** Map a backend question (answer-stripped) to the EnrichedQuestion shape the UI expects */
function mapBackendQuestion(q: BackendQuestion): EnrichedQuestion {
  return {
    question_id: q.question_id,
    concept_id: q.concept_id_str,
    difficulty: q.difficulty as EnrichedQuestion['difficulty'],
    type: q.question_type as EnrichedQuestion['type'],
    question_text: q.question_text,
    options: q.options?.map(opt => opt.text),
    correct_answer: '', // Stripped by backend — not available until after submit
    ordering_items: q.ordering_items_shuffled || undefined,
    image_url: q.image_url || undefined,
    option_images: q.option_images || undefined,
    // EnrichedQuestion metadata (not relevant for backend-driven sessions)
    eligible: true,
    is_recommended: true,
    priority_score: 0,
    concept_progress: null,
  };
}

// ============================================
// Hook
// ============================================

export function useQuizEngine(options: UseQuizEngineOptions = {}): UseQuizEngineReturn {
  const {
    board = 'icse',
    classLevel = 5,
    subject = 'mathematics',
    curriculumId,
  } = options;

  // Backend session ID
  const backendSessionIdRef = useRef<string | null>(null);

  // Next question pre-fetched from submit/skip response
  const nextQuestionRef = useRef<EnrichedQuestion | null>(null);

  // CAM data for topic lookup
  const camRef = useRef<CAM | null>(null);

  const [state, setState] = useState<QuizEngineState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    cam: null,
    themes: [],
    session: null,
    currentQuestion: null,
    isSessionActive: false,
    lastAnswerResult: null,
    showingFeedback: false,
    canonicalExplanation: undefined,
  });

  // Initialize — load CAM data for theme/topic browsing
  const initialize = useCallback(async () => {
    if (state.isInitialized || state.isLoading) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load CAM data — prefer curriculumId if available
      let cam: CAM | null = null;
      if (curriculumId) {
        cam = await fetchCAMByCurriculumId(curriculumId);
      }
      if (!cam) {
        cam = await fetchCAM(board, classLevel, subject);
      }
      if (!cam) {
        throw new Error(`No curriculum data available for ${board} Class ${classLevel} ${subject}`);
      }

      camRef.current = cam;

      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        cam,
        themes: cam.themes,
      }));
    } catch (error) {
      console.error('Failed to initialize quiz engine:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize',
      }));
    }
  }, [board, classLevel, subject, curriculumId, state.isInitialized, state.isLoading]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get topic proficiency from backend progress API
  const getTopicProficiency = useCallback(
    async (topicId: string): Promise<TopicProficiency> => {
      try {
        const progress = await sessionApi.getTopicProgress(topicId);
        if (progress) {
          return {
            band: progress.proficiencyBand as ProficiencyBand,
            label: progress.bandLabel,
            level: BAND_LEVELS[progress.proficiencyBand] ?? 0,
            stats: {
              concepts_total: progress.conceptsTotal,
              concepts_started: progress.conceptsStarted,
            },
          };
        }
      } catch {
        // Fall through to default
      }

      return {
        band: 'not_started',
        label: 'Not Started',
        level: 0,
        stats: null,
      };
    },
    []
  );

  // Get CAM topic from loaded CAM data
  const getCAMTopic = useCallback((topicId: string): CAMTopic | null => {
    const cam = camRef.current;
    if (!cam) return null;
    for (const theme of cam.themes) {
      for (const topic of theme.topics) {
        if (topic.topic_id === topicId) return topic;
      }
    }
    return null;
  }, []);

  // ==========================================
  // Session Operations (Backend API)
  // ==========================================

  // Start a quiz session via backend
  const startQuiz = useCallback(
    async (topicId: string, timeMode: TimeMode): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        if (!curriculumId) {
          throw new Error('curriculumId is required to start a quiz');
        }

        // 1. Create session on backend (selects questions via adaptive algorithm)
        const createResult = await sessionApi.createSession({
          curriculumId,
          topicId,
          timeMode,
          questionCount: 10,
        });

        const backendSession = createResult.session;
        backendSessionIdRef.current = backendSession.id;

        // 2. Start the session (NOT_STARTED -> IN_PROGRESS)
        const startResult = await sessionApi.startSession(backendSession.id);

        // Use the question from the start response
        const firstQuestion = startResult.currentQuestion
          ? mapBackendQuestion(startResult.currentQuestion)
          : null;

        // 3. Build local QuizSession state matching the shape the quiz page expects
        const session: QuizSession = {
          version: '2.0',
          session_id: backendSession.id,
          status: 'in_progress',
          config: {
            time_mode: timeMode,
            time_limit_ms: backendSession.timeLimitMs,
            topic_id: backendSession.topicId,
            topic_name: backendSession.topicName,
            question_count: backendSession.totalQuestions,
          },
          progress: {
            questions_answered: 0,
            questions_correct: 0,
            xp_earned: 0,
            current_question_index: 0,
            time_elapsed_ms: 0,
            time_remaining_ms: null,
          },
          // Placeholder array — quiz page only reads .length for total count
          questions: new Array(backendSession.totalQuestions).fill(null),
          current_question: firstQuestion,
          answers: [],
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: null,
          paused_at: null,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          session,
          currentQuestion: firstQuestion,
          isSessionActive: true,
          lastAnswerResult: null,
          showingFeedback: false,
          canonicalExplanation: undefined,
        }));

        return true;
      } catch (error) {
        console.error('Failed to start quiz:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to start quiz',
        }));
        return false;
      }
    },
    [curriculumId]
  );

  // Submit an answer via backend
  const submitAnswer = useCallback(
    async (answer: string | string[], timeTakenMs: number = 0): Promise<AnswerSubmitResult | null> => {
      if (!backendSessionIdRef.current || !state.isSessionActive) {
        return null;
      }

      try {
        const result = await sessionApi.submitAnswer(backendSessionIdRef.current, {
          userAnswer: answer,
          timeTakenMs,
        });

        // Store next question for when user clicks "Next"
        nextQuestionRef.current = result.nextQuestion
          ? mapBackendQuestion(result.nextQuestion)
          : null;

        // Update local session state
        // NOTE: current_question_index is NOT incremented here — it stays on the
        // current question so the header shows the right number during feedback.
        // It's incremented in nextQuestion() when the user advances.
        setState((prev) => {
          const prevSession = prev.session;
          if (!prevSession) return prev;

          const updatedSession: QuizSession = {
            ...prevSession,
            status: result.isSessionComplete ? 'completed' : prevSession.status,
            progress: {
              ...prevSession.progress,
              questions_answered: prevSession.progress.questions_answered + 1,
              questions_correct: prevSession.progress.questions_correct + (result.isCorrect ? 1 : 0),
              xp_earned: prevSession.progress.xp_earned + result.xpEarned,
            },
          };

          // Pick the right explanation based on correctness
          const explanation = result.isCorrect
            ? (result.explanationCorrect || undefined)
            : (result.explanationIncorrect || undefined);

          const answerResult: AnswerSubmitResult = {
            isCorrect: result.isCorrect,
            xpEarned: result.xpEarned,
            correctAnswer: result.correctAnswer,
            explanation,
            masteryAchieved: result.masteryAchieved,
            isSessionComplete: result.isSessionComplete,
            sessionProgress: {
              answered: updatedSession.progress.questions_answered,
              total: prevSession.questions.length,
              correct: updatedSession.progress.questions_correct,
              xp: updatedSession.progress.xp_earned,
            },
          };

          return {
            ...prev,
            session: updatedSession,
            lastAnswerResult: answerResult,
            showingFeedback: true,
          };
        });

        // Build the result to return (needs to be outside setState since it's synchronous)
        const explanation = result.isCorrect
          ? (result.explanationCorrect || undefined)
          : (result.explanationIncorrect || undefined);

        return {
          isCorrect: result.isCorrect,
          xpEarned: result.xpEarned,
          correctAnswer: result.correctAnswer,
          explanation,
          masteryAchieved: result.masteryAchieved,
          isSessionComplete: result.isSessionComplete,
          sessionProgress: {
            answered: (state.session?.progress.questions_answered ?? 0) + 1,
            total: state.session?.questions.length ?? 0,
            correct: (state.session?.progress.questions_correct ?? 0) + (result.isCorrect ? 1 : 0),
            xp: (state.session?.progress.xp_earned ?? 0) + result.xpEarned,
          },
        };
      } catch (error) {
        console.error('Failed to submit answer:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to submit answer',
        }));
        return null;
      }
    },
    [state.isSessionActive, state.session]
  );

  // Skip the current question via backend
  const skipQuestion = useCallback(
    async (): Promise<{ isSessionComplete: boolean }> => {
      if (!backendSessionIdRef.current || !state.isSessionActive) {
        return { isSessionComplete: false };
      }

      try {
        const result = await sessionApi.skipSessionQuestion(backendSessionIdRef.current);

        const nextQ = result.nextQuestion
          ? mapBackendQuestion(result.nextQuestion)
          : null;

        setState((prev) => {
          const prevSession = prev.session;
          if (!prevSession) return prev;

          const updatedSession: QuizSession = {
            ...prevSession,
            status: result.isSessionComplete ? 'completed' as SessionStatus : prevSession.status,
            progress: {
              ...prevSession.progress,
              current_question_index: prevSession.progress.current_question_index + 1,
            },
            current_question: nextQ,
          };

          if (result.isSessionComplete) {
            return {
              ...prev,
              session: updatedSession,
              currentQuestion: null,
              isSessionActive: false,
            };
          }

          return {
            ...prev,
            session: updatedSession,
            currentQuestion: nextQ,
            lastAnswerResult: null,
            showingFeedback: false,
          };
        });

        return { isSessionComplete: result.isSessionComplete };
      } catch (error) {
        console.error('Failed to skip question:', error);
        return { isSessionComplete: false };
      }
    },
    [state.isSessionActive]
  );

  // Move to next question (after viewing feedback — no API call needed)
  const nextQuestion = useCallback(() => {
    const nextQ = nextQuestionRef.current;
    nextQuestionRef.current = null;

    setState((prev) => ({
      ...prev,
      session: prev.session
        ? {
            ...prev.session,
            current_question: nextQ,
            progress: {
              ...prev.session.progress,
              current_question_index: prev.session.progress.current_question_index + 1,
            },
          }
        : null,
      currentQuestion: nextQ,
      lastAnswerResult: null,
      showingFeedback: false,
    }));
  }, []);

  // End the session via backend
  const endSession = useCallback(
    async (completed: boolean = false, elapsedMs?: number): Promise<SessionSummary | null> => {
      const sessionId = backendSessionIdRef.current;
      if (!sessionId) return null;

      try {
        // Always call endSession API — even if backend already marked the session
        // complete (e.g. after the last answer), we still need to save
        // time_elapsed_ms and re-calculate topic proficiency.
        await sessionApi.endSession(sessionId, completed, elapsedMs);

        // Fetch summary
        const { summary } = await sessionApi.getSessionSummary(sessionId);

        const sessionSummary: SessionSummary = {
          session_id: summary.sessionId,
          topic_id: summary.topicId,
          topic_name: summary.topicName,
          time_mode: summary.timeMode as TimeMode,
          status: summary.status as SessionStatus,
          total_questions: summary.totalQuestions,
          questions_answered: summary.questionsAnswered,
          questions_correct: summary.questionsCorrect,
          questions_skipped: summary.questionsSkipped,
          xp_earned: summary.xpEarned,
          time_elapsed_ms: summary.timeElapsedMs,
          started_at: summary.startedAt,
          completed_at: summary.completedAt,
        };

        setState((prev) => ({
          ...prev,
          session: null,
          currentQuestion: null,
          isSessionActive: false,
          lastAnswerResult: null,
          showingFeedback: false,
        }));

        backendSessionIdRef.current = null;
        nextQuestionRef.current = null;

        return sessionSummary;
      } catch (error) {
        console.error('Failed to end session:', error);
        return null;
      }
    },
    []
  );

  // Get total XP (from backend progress)
  const getTotalXP = useCallback(async (): Promise<number> => {
    // XP is tracked per-session by the backend; return 0 as a placeholder
    return state.session?.progress.xp_earned ?? 0;
  }, [state.session]);

  return {
    // State
    ...state,

    // Initialization
    initialize,

    // Topic operations
    getTopicProficiency,
    getCAMTopic,

    // Session operations
    startQuiz,
    submitAnswer,
    skipQuestion,
    nextQuestion,
    endSession,

    // Utility
    getBandMessage,
    getTotalXP,
  };
}

export default useQuizEngine;
