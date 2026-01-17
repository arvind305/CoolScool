/**
 * Quiz Store
 *
 * Zustand store for quiz session state management.
 * Handles ephemeral quiz state during active sessions.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  QuizSession,
  EnrichedQuestion,
  SubmitAnswerResult,
  TimeMode,
} from '@/lib/quiz-engine/types';

// ============================================
// STATE INTERFACE
// ============================================

interface QuizState {
  // Session state
  session: QuizSession | null;
  currentQuestion: EnrichedQuestion | null;
  isSessionActive: boolean;

  // Answer feedback
  lastAnswerResult: SubmitAnswerResult | null;
  showingFeedback: boolean;

  // Timing
  sessionStartTime: number | null;
  questionStartTime: number | null;
  elapsedTime: number;

  // Loading states
  isInitializing: boolean;
  isSubmitting: boolean;

  // Error
  error: string | null;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface QuizActions {
  // Session lifecycle
  setSession: (session: QuizSession) => void;
  startSession: () => void;
  endSession: () => void;
  resetSession: () => void;

  // Question flow
  setCurrentQuestion: (question: EnrichedQuestion | null) => void;
  setAnswerResult: (result: SubmitAnswerResult) => void;
  showFeedback: () => void;
  hideFeedback: () => void;

  // Timing
  updateElapsedTime: (ms: number) => void;
  resetQuestionTimer: () => void;

  // Loading/Error
  setInitializing: (value: boolean) => void;
  setSubmitting: (value: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: QuizState = {
  session: null,
  currentQuestion: null,
  isSessionActive: false,
  lastAnswerResult: null,
  showingFeedback: false,
  sessionStartTime: null,
  questionStartTime: null,
  elapsedTime: 0,
  isInitializing: false,
  isSubmitting: false,
  error: null,
};

// ============================================
// STORE
// ============================================

export const useQuizStore = create<QuizState & QuizActions>()(
  immer((set) => ({
    ...initialState,

    // Session lifecycle
    setSession: (session) =>
      set((state) => {
        state.session = session;
        state.currentQuestion = session.current_question;
      }),

    startSession: () =>
      set((state) => {
        state.isSessionActive = true;
        state.sessionStartTime = Date.now();
        state.questionStartTime = Date.now();
      }),

    endSession: () =>
      set((state) => {
        state.isSessionActive = false;
      }),

    resetSession: () =>
      set((state) => {
        Object.assign(state, initialState);
      }),

    // Question flow
    setCurrentQuestion: (question) =>
      set((state) => {
        state.currentQuestion = question;
        state.questionStartTime = Date.now();
      }),

    setAnswerResult: (result) =>
      set((state) => {
        state.lastAnswerResult = result;
        state.showingFeedback = true;
        state.session = result.session;
        state.currentQuestion = result.session.current_question;
      }),

    showFeedback: () =>
      set((state) => {
        state.showingFeedback = true;
      }),

    hideFeedback: () =>
      set((state) => {
        state.showingFeedback = false;
      }),

    // Timing
    updateElapsedTime: (ms) =>
      set((state) => {
        state.elapsedTime = ms;
      }),

    resetQuestionTimer: () =>
      set((state) => {
        state.questionStartTime = Date.now();
      }),

    // Loading/Error
    setInitializing: (value) =>
      set((state) => {
        state.isInitializing = value;
      }),

    setSubmitting: (value) =>
      set((state) => {
        state.isSubmitting = value;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    clearError: () =>
      set((state) => {
        state.error = null;
      }),
  }))
);

// ============================================
// SELECTORS
// ============================================

export const selectIsQuizActive = (state: QuizState) => state.isSessionActive;
export const selectCurrentQuestion = (state: QuizState) => state.currentQuestion;
export const selectSession = (state: QuizState) => state.session;
export const selectIsShowingFeedback = (state: QuizState) => state.showingFeedback;
export const selectLastAnswerResult = (state: QuizState) => state.lastAnswerResult;
export const selectQuizProgress = (state: QuizState) => state.session?.progress || null;
export const selectQuizError = (state: QuizState) => state.error;
export const selectIsSubmitting = (state: QuizState) => state.isSubmitting;
