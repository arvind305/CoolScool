'use client';

import { useState, useCallback, ReactNode } from 'react';
import { ProficiencyBand } from '@/lib/quiz-engine/types';
import { ThemeSection } from './theme-section';
import { TopicCard } from './topic-card';

export interface ThemeTopic {
  topic_id: string;
  topic_name: string;
  concept_count: number;
  question_count: number;
  proficiency: {
    band: ProficiencyBand;
    label: string;
  };
  /** Whether the user is authenticated (for sample tracking) */
  isAuthenticated?: boolean;
  /** Number of free samples remaining for anonymous users */
  samplesRemaining?: number;
}

export interface ThemeData {
  theme_id: string;
  theme_name: string;
  theme_order: number;
  topics: ThemeTopic[];
}

export interface ThemeListProps {
  /** Array of theme data with topics */
  themes: ThemeData[];
  /** Callback when a topic is selected */
  onTopicSelect?: (topicId: string) => void;
  /** Default expanded theme ID */
  defaultExpandedTheme?: string;
  /** Custom render function for topic cards (optional) */
  renderTopicCard?: (topic: ThemeTopic, themeId: string) => ReactNode;
}

/**
 * ThemeList - Container for multiple ThemeSection components
 *
 * Features:
 * - Manages which theme is expanded (only one at a time)
 * - Renders topics within each theme
 * - Handles topic selection
 */
export function ThemeList({
  themes,
  onTopicSelect,
  defaultExpandedTheme,
  renderTopicCard,
}: ThemeListProps) {
  // Default to first theme being expanded if not specified
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(
    defaultExpandedTheme ?? (themes.length > 0 ? themes[0].theme_id : null)
  );

  const handleThemeToggle = useCallback((themeId: string, expanded: boolean) => {
    // Only one theme can be expanded at a time
    // If clicking on already expanded theme, collapse it
    // If clicking on collapsed theme, expand it (and collapse others)
    setExpandedThemeId(expanded ? themeId : null);
  }, []);

  const handleTopicClick = useCallback(
    (topicId: string) => {
      onTopicSelect?.(topicId);
    },
    [onTopicSelect]
  );

  return (
    <div className="theme-list">
      {themes.map((theme) => (
        <ThemeSection
          key={theme.theme_id}
          themeId={theme.theme_id}
          themeName={theme.theme_name}
          themeOrder={theme.theme_order}
          topicCount={theme.topics.length}
          expanded={expandedThemeId === theme.theme_id}
          onToggle={handleThemeToggle}
        >
          {theme.topics.map((topic) =>
            renderTopicCard ? (
              renderTopicCard(topic, theme.theme_id)
            ) : (
              <TopicCard
                key={topic.topic_id}
                topicId={topic.topic_id}
                topicName={topic.topic_name}
                conceptCount={topic.concept_count}
                questionCount={topic.question_count}
                proficiency={topic.proficiency}
                onClick={handleTopicClick}
                isAuthenticated={topic.isAuthenticated}
                samplesRemaining={topic.samplesRemaining}
              />
            )
          )}
        </ThemeSection>
      ))}
    </div>
  );
}

export default ThemeList;
