'use client';

import { forwardRef } from 'react';

// ============================================================
// Feedback Component
// ============================================================

export interface FeedbackProps {
  /** Whether the answer was correct */
  isCorrect: boolean;
  /** The correct answer to display (for incorrect answers) */
  correctAnswer?: string | string[];
  /** Explanation text */
  explanation?: string;
  /** XP points earned */
  xpEarned?: number;
  /** Whether the feedback is visible */
  visible?: boolean;
  /** Optional className for the container */
  className?: string;
}

/**
 * Displays correct/incorrect feedback with explanation and XP earned.
 * Features animated slide-in effect.
 * Uses CSS classes: .feedback-section, .feedback-header, .feedback-explanation
 */
export const Feedback = forwardRef<HTMLDivElement, FeedbackProps>(
  function Feedback(
    {
      isCorrect,
      correctAnswer,
      explanation,
      xpEarned = 0,
      visible = true,
      className = '',
    },
    ref
  ) {
    // Format the correct answer for display
    const formatAnswer = (answer: string | string[] | undefined): string => {
      if (!answer) return '';
      if (Array.isArray(answer)) {
        return answer.join(' -> ');
      }
      return answer;
    };

    if (!visible) {
      return null;
    }

    return (
      <div
        ref={ref}
        id="feedback-section"
        className={`feedback-section visible ${isCorrect ? 'correct' : 'incorrect'} ${className}`.trim()}
        role="alert"
        aria-live="polite"
      >
        <div className="feedback-header">
          <span id="feedback-icon" className="feedback-icon" aria-hidden="true">
            {isCorrect ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </span>
          <span id="feedback-title">{isCorrect ? 'Correct' : 'Not quite'}</span>
        </div>

        <div id="feedback-explanation" className="feedback-explanation">
          {!isCorrect && correctAnswer && (
            <p>
              <strong>The correct answer is:</strong> {formatAnswer(correctAnswer)}
            </p>
          )}
          {explanation && <p>{explanation}</p>}
          {xpEarned > 0 && (
            <p>
              <strong>+{xpEarned} XP</strong>
            </p>
          )}
        </div>
      </div>
    );
  }
);

// Styles for this component (add to globals.css or a CSS module)
// These match the reference styles.css lines 1128-1186
const styles = `
.feedback-section {
  display: none;
  padding: var(--spacing-lg);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-lg);
  animation: feedbackSlideIn var(--transition-normal);
}

@keyframes feedbackSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feedback-section.visible {
  display: block;
}

.feedback-section.correct {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
  border: 2px solid var(--color-correct);
  border-left-width: 4px;
}

.feedback-section.incorrect {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(248, 113, 113, 0.05) 100%);
  border: 2px solid var(--color-incorrect);
  border-left-width: 4px;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-md);
}

.feedback-icon {
  width: 24px;
  height: 24px;
}

.feedback-section.correct .feedback-header {
  color: var(--color-correct);
}

.feedback-section.incorrect .feedback-header {
  color: var(--color-incorrect);
}

.feedback-explanation {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

.feedback-explanation strong {
  color: var(--color-text);
}

.feedback-explanation p {
  margin: 0;
  margin-bottom: var(--spacing-sm);
}

.feedback-explanation p:last-child {
  margin-bottom: 0;
}
`;

export default Feedback;
