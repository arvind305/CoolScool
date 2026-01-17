'use client';

import { useCallback, useState, useId, ReactNode } from 'react';

export interface ThemeSectionProps {
  themeId: string;
  themeName: string;
  themeOrder: number;
  topicCount: number;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Callback when toggle is clicked */
  onToggle?: (themeId: string, expanded: boolean) => void;
  /** Topic cards to render inside */
  children?: ReactNode;
  /** Default expanded state for uncontrolled mode */
  defaultExpanded?: boolean;
}

/**
 * ThemeSection - Collapsible accordion with theme header
 *
 * Features:
 * - Theme icon with gradient background (numbered 1-10 with cycling colors)
 * - Theme name with colored background
 * - Topic count display
 * - Expand/collapse with animation
 * - Supports both controlled and uncontrolled expansion state
 * - Keyboard accessible with aria-expanded
 */
export function ThemeSection({
  themeId,
  themeName,
  themeOrder,
  topicCount,
  expanded: controlledExpanded,
  onToggle,
  children,
  defaultExpanded = false,
}: ThemeSectionProps) {
  // Support both controlled and uncontrolled mode
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const topicListId = useId();

  const handleToggle = useCallback(() => {
    const newExpanded = !isExpanded;

    if (!isControlled) {
      setInternalExpanded(newExpanded);
    }

    onToggle?.(themeId, newExpanded);
  }, [isExpanded, isControlled, onToggle, themeId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <div
      className={`theme-section ${isExpanded ? 'expanded' : ''}`}
      data-theme-id={themeId}
    >
      <button
        type="button"
        className="theme-header"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={topicListId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div className="theme-info">
          <div className="theme-icon" aria-hidden="true">
            {themeOrder}
          </div>
          <div className="theme-text">
            <div className="theme-name">{themeName}</div>
            <div className="theme-count">
              {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
            </div>
          </div>
        </div>
        <svg
          className="theme-toggle-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        id={topicListId}
        className="topic-list"
        role="list"
        aria-hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}

export default ThemeSection;
