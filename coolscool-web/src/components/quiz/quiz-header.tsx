'use client';

import { forwardRef } from 'react';
import { Timer } from './timer';
import { QuizProgress } from './quiz-progress';

// ============================================================
// QuizHeader Component
// ============================================================

export interface QuizHeaderProps {
  /** Name of the topic being quizzed */
  topicName: string;
  /** Current question number (1-indexed) */
  currentQuestion: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Time remaining in milliseconds, or null for unlimited */
  timeRemaining: number | null;
  /** Optional className for the container */
  className?: string;
}

/**
 * Dark header displaying topic name, timer, and question count.
 * Combines Timer and QuizProgress components.
 * Uses CSS classes: .quiz-header, .quiz-header-content, .quiz-topic-name, .quiz-meta
 */
export const QuizHeader = forwardRef<HTMLElement, QuizHeaderProps>(
  function QuizHeader(
    {
      topicName,
      currentQuestion,
      totalQuestions,
      timeRemaining,
      className = '',
    },
    ref
  ) {
    return (
      <header ref={ref} className={`quiz-header ${className}`.trim()}>
        <div className="quiz-header-content">
          <span className="quiz-topic-name">{topicName}</span>
          <div className="quiz-meta">
            <Timer timeRemaining={timeRemaining} />
            <span
              className="quiz-question-count"
              aria-label={`Question ${currentQuestion} of ${totalQuestions}`}
            >
              <span id="current-question-num">{currentQuestion}</span>
              <span aria-hidden="true">/</span>
              <span id="total-questions">{totalQuestions}</span>
            </span>
          </div>
        </div>
        <QuizProgress current={currentQuestion} total={totalQuestions} />
      </header>
    );
  }
);

// Styles for this component (add to globals.css or a CSS module)
// These match the reference styles.css lines 847-916
const styles = `
.quiz-header {
  background: linear-gradient(135deg, #1c1917 0%, #292524 100%);
  color: var(--color-text-inverse);
  padding: var(--spacing-lg) var(--spacing-lg);
  margin: calc(-1 * var(--spacing-lg));
  margin-bottom: var(--spacing-xl);
  border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
  box-shadow: var(--shadow-md);
}

.quiz-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.quiz-topic-name {
  font-family: var(--font-display);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-md);
  color: var(--color-text-inverse);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(124, 58, 237, 0.3);
  border-radius: var(--radius-md);
}

.quiz-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.8);
}

.quiz-question-count {
  display: flex;
  align-items: center;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}
`;

export default QuizHeader;
