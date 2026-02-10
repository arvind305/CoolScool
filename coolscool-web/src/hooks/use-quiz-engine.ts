'use client';

/**
 * useQuizEngine Hook
 * Provides quiz engine state management for React components
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  QuizEngine,
  createQuizEngine,
  getBandMessage,
} from '@/lib/quiz-engine/quiz-engine';
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
} from '@/lib/quiz-engine/types';
import { fetchCAM, fetchCAMByCurriculumId, fetchQuestionBankByCurriculumId } from '@/services/curriculum-api';

export interface UseQuizEngineOptions {
  board?: string;
  classLevel?: number;
  subject?: string;
  userId?: string;
  /** Optional curriculum ID for multi-curriculum support */
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
  skipQuestion: () => void;
  nextQuestion: () => void;
  endSession: (completed?: boolean) => Promise<SessionSummary | null>;

  // Utility
  getBandMessage: (band: ProficiencyBand) => string;
  getTotalXP: () => Promise<number>;
}

export function useQuizEngine(options: UseQuizEngineOptions = {}): UseQuizEngineReturn {
  const {
    board = 'icse',
    classLevel = 5,
    subject = 'mathematics',
    userId = 'anonymous',
    curriculumId,
  } = options;

  const engineRef = useRef<QuizEngine | null>(null);

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

  // Initialize the quiz engine
  const initialize = useCallback(async () => {
    if (state.isInitialized || state.isLoading) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create engine
      const engine = createQuizEngine({
        userId,
        board,
        classLevel,
        subject,
      });

      // Load CAM data - prefer curriculumId if available
      let cam: CAM | null = null;
      if (curriculumId) {
        cam = await fetchCAMByCurriculumId(curriculumId);
      }
      // Fallback to board/class/subject based fetch
      if (!cam) {
        cam = await fetchCAM(board, classLevel, subject);
      }
      if (!cam) {
        throw new Error(`No curriculum data available for ${board} Class ${classLevel} ${subject}`);
      }

      engine.setCAM(cam);
      await engine.initialize();

      engineRef.current = engine;

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
  }, [board, classLevel, subject, userId, curriculumId, state.isInitialized, state.isLoading]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get topic proficiency
  const getTopicProficiency = useCallback(
    async (topicId: string): Promise<TopicProficiency> => {
      if (!engineRef.current) {
        return {
          band: 'not_started',
          label: 'Not Started',
          level: 0,
          stats: null,
        };
      }
      return engineRef.current.getTopicProficiency(topicId);
    },
    []
  );

  // Get CAM topic
  const getCAMTopic = useCallback((topicId: string): CAMTopic | null => {
    if (!engineRef.current) return null;
    return engineRef.current.getCAMTopic(topicId);
  }, []);

  // Start a quiz session
  const startQuiz = useCallback(
    async (topicId: string, timeMode: TimeMode): Promise<boolean> => {
      if (!engineRef.current) {
        console.error('Engine not initialized');
        return false;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Load question bank for topic via curriculum API
        if (!curriculumId) {
          throw new Error('curriculumId is required to load questions');
        }
        const questionBank = await fetchQuestionBankByCurriculumId(curriculumId, topicId);
        if (!questionBank) {
          throw new Error(`No questions available for topic: ${topicId}`);
        }

        engineRef.current.registerQuestionBank(topicId, questionBank);

        // Store canonical explanation for post-test summary
        const storedCanonicalExplanation = questionBank.canonical_explanation;

        // Create and start session
        await engineRef.current.createSession({
          topicId,
          timeMode,
          questionCount: 10,
        });

        const session = engineRef.current.startSession();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          session,
          currentQuestion: session.current_question,
          isSessionActive: true,
          lastAnswerResult: null,
          showingFeedback: false,
          canonicalExplanation: storedCanonicalExplanation,
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

  // Submit an answer
  const submitAnswer = useCallback(
    async (answer: string | string[], timeTakenMs: number = 0): Promise<AnswerSubmitResult | null> => {
      if (!engineRef.current || !state.isSessionActive) {
        return null;
      }

      try {
        const result = await engineRef.current.submitAnswer(answer, timeTakenMs);
        const session = engineRef.current.getSession();

        setState((prev) => ({
          ...prev,
          session,
          lastAnswerResult: result,
          showingFeedback: true,
        }));

        return result;
      } catch (error) {
        console.error('Failed to submit answer:', error);
        return null;
      }
    },
    [state.isSessionActive]
  );

  // Skip the current question
  const skipQuestion = useCallback(() => {
    if (!engineRef.current || !state.isSessionActive) return;

    const result = engineRef.current.skipQuestion();
    const session = engineRef.current.getSession();

    if (result.isSessionComplete) {
      setState((prev) => ({
        ...prev,
        session,
        currentQuestion: null,
        isSessionActive: false,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        session,
        currentQuestion: result.nextQuestion,
        lastAnswerResult: null,
        showingFeedback: false,
      }));
    }
  }, [state.isSessionActive]);

  // Move to next question (after viewing feedback)
  const nextQuestion = useCallback(() => {
    if (!engineRef.current) return;

    const session = engineRef.current.getSession();

    setState((prev) => ({
      ...prev,
      currentQuestion: session?.current_question || null,
      lastAnswerResult: null,
      showingFeedback: false,
    }));
  }, []);

  // End the session
  const endSession = useCallback(
    async (completed: boolean = false): Promise<SessionSummary | null> => {
      if (!engineRef.current || !state.session) return null;

      try {
        const summary = await engineRef.current.endSession(completed);

        setState((prev) => ({
          ...prev,
          session: null,
          currentQuestion: null,
          isSessionActive: false,
          lastAnswerResult: null,
          showingFeedback: false,
        }));

        return summary;
      } catch (error) {
        console.error('Failed to end session:', error);
        return null;
      }
    },
    [state.session]
  );

  // Get total XP
  const getTotalXP = useCallback(async (): Promise<number> => {
    if (!engineRef.current) return 0;
    return engineRef.current.getTotalXP();
  }, []);

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
