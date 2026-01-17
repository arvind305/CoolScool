'use client';

import { useCallback } from 'react';
import { ProficiencyBand } from '@/lib/quiz-engine/types';
import { ProficiencyBadge } from './proficiency-badge';

export interface TopicCardProps {
  topicId: string;
  topicName: string;
  conceptCount: number;
  questionCount: number;
  proficiency: {
    band: ProficiencyBand;
    label: string;
  };
  onClick?: (topicId: string) => void;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** Number of free samples remaining for anonymous users (undefined = not tracked/authenticated) */
  samplesRemaining?: number;
  /** Maximum number of free samples allowed (default 3) */
  sampleLimit?: number;
}

/**
 * TopicCard - Displays a topic with name, concept/question counts, and proficiency
 *
 * Features:
 * - Colored topic name pill
 * - Concept and question count display
 * - Proficiency badge on right
 * - Hover effect with translateX animation
 * - Keyboard accessible (Enter/Space to click)
 */
export function TopicCard({
  topicId,
  topicName,
  conceptCount,
  questionCount,
  proficiency,
  onClick,
  isAuthenticated,
  samplesRemaining,
  sampleLimit = 3,
}: TopicCardProps) {
  const handleClick = useCallback(() => {
    onClick?.(topicId);
  }, [onClick, topicId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(topicId);
      }
    },
    [onClick, topicId]
  );

  // Determine if we should show sample badge (only for anonymous users)
  const showSampleBadge = !isAuthenticated && samplesRemaining !== undefined;
  const samplesExhausted = showSampleBadge && samplesRemaining === 0;

  // Render the sample badge for anonymous users
  const renderSampleBadge = () => {
    if (!showSampleBadge) return null;

    if (samplesExhausted) {
      return (
        <span className="topic-sample-badge exhausted">
          {/* Lock icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Sign in to practice
        </span>
      );
    }

    // Show remaining samples
    const label = samplesRemaining === sampleLimit ? `${samplesRemaining} free` : `${samplesRemaining} left`;
    return (
      <span className="topic-sample-badge available">
        {/* Gift icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
        {label}
      </span>
    );
  };

  // Render the action indicator (arrow or lock)
  const renderActionIndicator = () => {
    if (samplesExhausted) {
      // Show lock icon instead of arrow when samples exhausted
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="topic-arrow topic-locked"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    }

    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className="topic-arrow"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    );
  };

  return (
    <div
      className={`topic-card${samplesExhausted ? ' samples-exhausted' : ''}`}
      data-topic-id={topicId}
      role="listitem"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="topic-info">
        <div className="topic-name">{topicName}</div>
        <div className="topic-concepts">
          {conceptCount} concepts | {questionCount} questions
        </div>
        {renderSampleBadge()}
      </div>
      <div className="topic-proficiency">
        <ProficiencyBadge band={proficiency.band} label={proficiency.label} size="sm" />
        {renderActionIndicator()}
      </div>
    </div>
  );
}

export default TopicCard;
