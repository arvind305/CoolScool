'use client';

import { forwardRef, useMemo } from 'react';

// ============================================================
// QuizProgress Component
// ============================================================

export interface QuizProgressProps {
  /** Current question number (1-indexed) */
  current: number;
  /** Total number of questions */
  total: number;
  /** Optional className for the container */
  className?: string;
}

/**
 * Displays a progress bar showing current question / total.
 * Features animated fill with gradient styling.
 * Uses CSS classes: .quiz-progress-bar, .quiz-progress-fill
 */
export const QuizProgress = forwardRef<HTMLDivElement, QuizProgressProps>(
  function QuizProgress({ current, total, className = '' }, ref) {
    // Calculate percentage
    const percentage = useMemo(() => {
      if (total <= 0) return 0;
      return Math.min(100, Math.max(0, (current / total) * 100));
    }, [current, total]);

    return (
      <div
        ref={ref}
        className={`quiz-progress-bar ${className}`.trim()}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${current} of ${total} questions`}
      >
        <div
          className="quiz-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

// Styles for this component (add to globals.css or a CSS module)
// These match the reference styles.css lines 900-915
const styles = `
.quiz-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  margin-top: var(--spacing-md);
  overflow: hidden;
}

.quiz-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a78bfa 0%, #5eead4 100%);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
  box-shadow: 0 0 10px rgba(167, 139, 250, 0.5);
}
`;

export default QuizProgress;
