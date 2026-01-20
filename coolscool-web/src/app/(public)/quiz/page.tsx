'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import {
  QuizHeader,
  QuestionDisplay,
  AnswerOptions,
  Feedback,
  QuizSummary,
} from '@/components/quiz';
import { Button, LoginPrompt } from '@/components/ui';
import { useQuizEngine, useAccessControl } from '@/hooks';
import type { TimeMode, ProficiencyBand, SessionSummary } from '@/lib/quiz-engine/types';

type QuizState = 'loading' | 'ready' | 'answering' | 'feedback' | 'summary' | 'error' | 'sample_exhausted';

function QuizPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[var(--color-text-muted)]">Loading quiz...</p>
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizPageLoading />}>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get query params
  const topicId = searchParams.get('topic') || '';
  const topicName = searchParams.get('topicName') || 'this topic';
  const timeMode = (searchParams.get('mode') || 'unlimited') as TimeMode;
  const board = searchParams.get('board') || 'icse';
  const classLevel = parseInt(searchParams.get('class') || '5', 10);
  const subject = searchParams.get('subject') || 'mathematics';
  const curriculumId = searchParams.get('curriculumId') || undefined;

  // Access control for sample tracking
  const access = useAccessControl();

  // Quiz engine hook
  const engine = useQuizEngine({
    board,
    classLevel,
    subject,
    curriculumId,
  });

  // Local state
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [proficiency, setProficiency] = useState<{ band: ProficiencyBand; label: string }>({
    band: 'not_started',
    label: 'Not Started',
  });

  // Timer refs
  const sessionStartTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initAttemptedRef = useRef(false);

  // Initialize quiz session
  useEffect(() => {
    async function initQuiz() {
      if (!topicId) {
        setQuizState('error');
        return;
      }

      // Wait for access control to finish loading
      if (access.isLoading) {
        return;
      }

      // Check if anonymous user has exhausted samples BEFORE loading quiz
      if (!access.isAuthenticated && !access.hasFreeSamples(topicId)) {
        setQuizState('sample_exhausted');
        return;
      }

      // Wait for engine to initialize
      if (!engine.isInitialized && !engine.isLoading) {
        await engine.initialize();
      }

      if (engine.isInitialized && !engine.session) {
        const success = await engine.startQuiz(topicId, timeMode);
        if (success) {
          sessionStartTimeRef.current = Date.now();
          questionStartTimeRef.current = Date.now();
          setQuizState('ready');
          startTimer();
        } else {
          setQuizState('error');
        }
      }
    }

    // Only run init once access is loaded
    if (!initAttemptedRef.current || !access.isLoading) {
      initAttemptedRef.current = true;
      initQuiz();
    }
  }, [engine.isInitialized, engine.isLoading, topicId, timeMode, access.isLoading, access.isAuthenticated, access.hasFreeSamples]);

  // Start the timer
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(Date.now() - sessionStartTimeRef.current);
    }, 1000);
  }, []);

  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  // Handle answer selection
  const handleAnswerSelect = useCallback((answer: string | string[]) => {
    setSelectedAnswer(answer);
  }, []);

  // Handle answer submission
  const handleSubmit = useCallback(async () => {
    if (selectedAnswer === null) return;

    const timeTaken = Date.now() - questionStartTimeRef.current;
    const result = await engine.submitAnswer(selectedAnswer, timeTaken);

    if (result) {
      setQuizState('feedback');

      // For anonymous users, record sample usage and check if exhausted
      if (!access.isAuthenticated) {
        const remaining = access.recordSampleUsed(topicId);

        // Check if samples are now exhausted (mid-quiz)
        if (remaining <= 0) {
          // Let the feedback show briefly, then show login prompt
          // The user can still see this question's feedback
          // but subsequent questions will be blocked
        }
      }

      // Check if session is complete
      if (result.isSessionComplete) {
        // Get proficiency after completing
        const prof = await engine.getTopicProficiency(topicId);
        setProficiency({ band: prof.band, label: prof.label });
      }
    }
  }, [selectedAnswer, engine, topicId, access]);

  // Handle skip question
  const handleSkip = useCallback(() => {
    engine.skipQuestion();
    setSelectedAnswer(null);
    questionStartTimeRef.current = Date.now();

    // Check if session is complete after skipping
    if (!engine.currentQuestion) {
      handleEndSession();
    }
  }, [engine]);

  // Handle next question
  const handleNext = useCallback(() => {
    // For anonymous users, check if samples are exhausted before moving to next
    if (!access.isAuthenticated && !access.hasFreeSamples(topicId)) {
      stopTimer();
      setQuizState('sample_exhausted');
      return;
    }

    engine.nextQuestion();
    setSelectedAnswer(null);
    questionStartTimeRef.current = Date.now();

    // Check if there's a next question
    if (engine.currentQuestion) {
      setQuizState('ready');
    } else {
      handleEndSession();
    }
  }, [engine, access, topicId, stopTimer]);

  // Handle end session
  const handleEndSession = useCallback(async () => {
    stopTimer();
    const sessionSummary = await engine.endSession(true);
    if (sessionSummary) {
      setSummary(sessionSummary);
      // Get final proficiency
      const prof = await engine.getTopicProficiency(topicId);
      setProficiency({ band: prof.band, label: prof.label });
      setQuizState('summary');
    }
  }, [engine, topicId, stopTimer]);

  // Handle practice again
  const handlePracticeAgain = useCallback(() => {
    // For anonymous users, check if they have samples before restarting
    if (!access.isAuthenticated && !access.hasFreeSamples(topicId)) {
      setQuizState('sample_exhausted');
      return;
    }

    // Reset and restart
    setSelectedAnswer(null);
    setQuizState('loading');
    setSummary(null);
    sessionStartTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();
    setElapsedTime(0);

    // Restart the quiz
    engine.startQuiz(topicId, timeMode).then((success) => {
      if (success) {
        setQuizState('ready');
        startTimer();
      }
    });
  }, [engine, topicId, timeMode, startTimer, access]);

  // Handle choose topic
  const handleChooseTopic = useCallback(() => {
    router.push(`/browse/${board}/class-${classLevel}/${subject}`);
  }, [router, board, classLevel, subject]);

  // Handle sign in from login prompt
  const handleSignIn = useCallback(() => {
    signIn('google', { callbackUrl: window.location.href });
  }, []);

  // Handle continue browsing from login prompt
  const handleContinueBrowsing = useCallback(() => {
    router.push(`/browse/${board}/class-${classLevel}/${subject}`);
  }, [router, board, classLevel, subject]);

  // Get session info
  const session = engine.session;
  const currentQuestion = engine.currentQuestion;
  const lastResult = engine.lastAnswerResult;

  // Calculate time limit and remaining
  const timeLimit =
    timeMode === 'unlimited'
      ? null
      : timeMode === '10min'
        ? 10 * 60 * 1000
        : timeMode === '5min'
          ? 5 * 60 * 1000
          : 3 * 60 * 1000;

  const timeRemaining = timeLimit !== null ? Math.max(0, timeLimit - elapsedTime) : null;

  // Sample exhausted state - show login prompt
  if (quizState === 'sample_exhausted') {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <LoginPrompt
          topicId={topicId}
          topicName={session?.config?.topic_name || topicName}
          samplesUsed={access.sampleLimit}
          onSignIn={handleSignIn}
          onContinueBrowsing={handleContinueBrowsing}
        />
      </div>
    );
  }

  // Loading state (including waiting for access control)
  if (quizState === 'loading' || engine.isLoading || access.isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (quizState === 'error' || engine.error) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-incorrect-bg)] flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-incorrect)"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Unable to Load Quiz</h2>
        <p className="text-[var(--color-text-muted)] mb-6">
          {engine.error || 'Could not load questions for this topic. Please try again.'}
        </p>
        <Link href={`/browse/${board}/class-${classLevel}/${subject}`} className="btn btn-primary">
          Back to Topics
        </Link>
      </div>
    );
  }

  // Summary state
  if (quizState === 'summary' && summary) {
    return (
      <div className="px-4 py-8">
        <QuizSummary
          summary={summary}
          proficiency={proficiency}
          onPracticeAgain={handlePracticeAgain}
          onChooseTopic={handleChooseTopic}
          isAuthenticated={access.isAuthenticated}
        />
      </div>
    );
  }

  // Quiz session active
  const questionNum = session.progress.current_question_index + 1;
  const totalQuestions = session.questions.length;
  const progressPercent = (session.progress.questions_answered / totalQuestions) * 100;
  const showingFeedback = quizState === 'feedback' && lastResult !== null;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Quiz Header */}
      <QuizHeader
        topicName={session.config.topic_name}
        currentQuestion={questionNum}
        totalQuestions={totalQuestions}
        timeRemaining={timeRemaining}
      />

      {/* Question Container */}
      <div className="question-container mt-8">
        {currentQuestion && (
          <>
            {/* Question Number */}
            <QuestionDisplay
              questionNumber={questionNum}
              totalQuestions={totalQuestions}
              questionText={currentQuestion.question_text}
            />

            {/* Answer Options */}
            <AnswerOptions
              type={currentQuestion.type}
              options={
                currentQuestion.options?.map((opt, idx) => ({
                  id: String.fromCharCode(65 + idx), // A, B, C, D
                  text: typeof opt === 'string' ? opt : (opt as { id: string; text: string }).text,
                })) || []
              }
              orderingItems={
                (currentQuestion as unknown as { ordering_items?: string[] }).ordering_items || []
              }
              selectedAnswer={selectedAnswer}
              correctAnswer={showingFeedback ? lastResult.correctAnswer : undefined}
              disabled={showingFeedback}
              onSelect={handleAnswerSelect}
            />

            {/* Feedback */}
            {showingFeedback && (
              <Feedback
                isCorrect={lastResult.isCorrect}
                correctAnswer={
                  Array.isArray(lastResult.correctAnswer)
                    ? lastResult.correctAnswer.join(' -> ')
                    : lastResult.correctAnswer
                }
                explanation={lastResult.explanation}
                xpEarned={lastResult.xpEarned}
              />
            )}
          </>
        )}

        {/* Actions */}
        <div className="quiz-actions">
          {!showingFeedback ? (
            <>
              <Button
                variant="secondary"
                onClick={handleSkip}
                id="skip-btn"
              >
                Skip
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                id="submit-btn"
              >
                Submit
              </Button>
            </>
          ) : (
            <>
              {lastResult.isSessionComplete ? (
                <Button
                  variant="primary"
                  onClick={handleEndSession}
                  id="finish-btn"
                >
                  See Results
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  id="next-btn"
                >
                  Next Question
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
