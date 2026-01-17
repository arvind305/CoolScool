'use client';

import { forwardRef, useMemo } from 'react';

// ============================================================
// Timer Component
// ============================================================

export interface TimerProps {
  /** Time remaining in milliseconds, or null for unlimited time */
  timeRemaining: number | null;
  /** Whether to show warning state (typically when time < 60 seconds) */
  warning?: boolean;
  /** Optional className for the container */
  className?: string;
}

/**
 * Displays time remaining in MM:SS format.
 * Shows "Unlimited" when no time limit is set.
 * Uses CSS classes: .quiz-timer, .quiz-timer.warning
 */
export const Timer = forwardRef<HTMLDivElement, TimerProps>(
  function Timer({ timeRemaining, warning = false, className = '' }, ref) {
    // Format time as MM:SS
    const formattedTime = useMemo(() => {
      if (timeRemaining === null) {
        return 'Unlimited';
      }

      const totalSeconds = Math.max(0, Math.floor(timeRemaining / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, [timeRemaining]);

    // Auto-detect warning state if not explicitly provided
    const isWarning = warning || (timeRemaining !== null && timeRemaining < 60000);

    return (
      <div
        ref={ref}
        className={`quiz-timer ${isWarning ? 'warning' : ''} ${className}`.trim()}
        role="timer"
        aria-live="polite"
        aria-label={
          timeRemaining === null
            ? 'Unlimited time'
            : `${formattedTime} remaining`
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span id="timer-display">{formattedTime}</span>
      </div>
    );
  }
);

// Styles for this component (add to globals.css or a CSS module)
// These match the reference styles.css lines 883-898
const styles = `
.quiz-timer {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
}

.quiz-timer.warning {
  background: rgba(249, 115, 22, 0.3);
  color: #fbbf24;
  font-weight: var(--font-weight-semibold);
}
`;

export default Timer;
