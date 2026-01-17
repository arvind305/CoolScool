'use client';

import { forwardRef } from 'react';

// ============================================================
// QuestionDisplay Component
// ============================================================

export interface QuestionDisplayProps {
  /** Current question number (1-indexed) */
  questionNumber: number;
  /** Total number of questions in the session */
  totalQuestions: number;
  /** The question text to display */
  questionText: string;
  /** Optional className for the container */
  className?: string;
}

/**
 * Displays the current question with a numbered badge and styled text container.
 * Uses CSS classes: .question-number, .question-text
 */
export const QuestionDisplay = forwardRef<HTMLDivElement, QuestionDisplayProps>(
  function QuestionDisplay(
    { questionNumber, totalQuestions, questionText, className = '' },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={`question-container ${className}`.trim()}
        role="region"
        aria-label={`Question ${questionNumber} of ${totalQuestions}`}
      >
        <span className="question-number" aria-hidden="true">
          Question {questionNumber}
        </span>
        <p className="question-text" id="question-text">
          {questionText}
        </p>
      </div>
    );
  }
);

// Styles for this component (add to globals.css or a CSS module)
// These match the reference styles.css lines 926-950
const styles = `
.question-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: var(--container-sm);
  margin: 0 auto;
  width: 100%;
}

.question-number {
  display: inline-block;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-primary-subtle);
  border-radius: var(--radius-md);
  width: fit-content;
}

.question-text {
  font-size: var(--font-size-xl);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--spacing-xl);
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-lg);
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border-left: 4px solid var(--color-primary);
  box-shadow: var(--shadow-sm);
}
`;

export default QuestionDisplay;
