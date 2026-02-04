'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeList, type ThemeData, type ThemeTopic } from './theme-list';
import { TimeModeModal } from '@/components/quiz/time-mode-modal';
import {
  fetchCAM,
  fetchCAMByCurriculumId,
  hasContentFor,
  findCurriculumByBoardClassSubject,
} from '@/services/curriculum-api';
import { useAccessControl } from '@/hooks';
import { useCurriculumOptional } from '@/contexts/CurriculumContext';
import type { CAM, TimeMode, ProficiencyBand } from '@/lib/quiz-engine/types';

// Storage key for banner dismissal
const BANNER_DISMISSED_KEY = 'coolscool_topic_banner_dismissed';

export interface TopicBrowserProps {
  board: string;
  classLevel: number;
  subject: string;
  /** Optional curriculum ID - if not provided, will look up from board/class/subject */
  curriculumId?: string;
}

/**
 * TopicBrowser - Client component for browsing and selecting topics
 *
 * Features:
 * - Loads CAM data for the given board/class/subject or curriculumId
 * - Displays themes and topics with ThemeList component
 * - Opens time mode modal when a topic is selected
 * - Navigates to quiz page when quiz is started
 */
export function TopicBrowser({ board, classLevel, subject, curriculumId: propCurriculumId }: TopicBrowserProps) {
  const router = useRouter();
  const access = useAccessControl();
  const curriculumContext = useCurriculumOptional();

  // State
  const [cam, setCam] = useState<CAM | null>(null);
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [curriculumId, setCurriculumId] = useState<string | null>(propCurriculumId || null);

  // Modal state
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  // Banner state
  const [bannerDismissed, setBannerDismissed] = useState(true); // Start true to prevent flash

  // Load banner dismissal state from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
      setBannerDismissed(dismissed);
    }
  }, []);

  // Handle banner dismissal
  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    }
  }, []);

  // Load CAM data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // Determine curriculum ID - try multiple sources (prop first, then context, then API)
        let resolvedCurriculumId = propCurriculumId;

        // Try to get from context if matching board/class/subject
        if (!resolvedCurriculumId && curriculumContext?.currentCurriculum) {
          const contextCurriculum = curriculumContext.currentCurriculum;
          if (
            contextCurriculum.board.toLowerCase() === board.toLowerCase() &&
            contextCurriculum.classLevel === classLevel &&
            contextCurriculum.subject.toLowerCase() === subject.toLowerCase()
          ) {
            resolvedCurriculumId = contextCurriculum.id;
          }
        }

        // Try to find curriculum from API if not found
        if (!resolvedCurriculumId) {
          const foundCurriculum = await findCurriculumByBoardClassSubject(board, classLevel, subject);
          if (foundCurriculum) {
            resolvedCurriculumId = foundCurriculum.id;
          }
        }

        // Check if content is available (fallback for non-API content)
        if (!resolvedCurriculumId && !hasContentFor(board, classLevel, subject)) {
          setError(`Content for ${board.toUpperCase()} Class ${classLevel} ${subject} is coming soon!`);
          setIsLoading(false);
          return;
        }

        // Store the resolved curriculum ID for quiz navigation
        if (resolvedCurriculumId) {
          setCurriculumId(resolvedCurriculumId);
        }

        // Load CAM data - prefer curriculum ID based fetch
        let camData: CAM | null = null;
        if (resolvedCurriculumId) {
          camData = await fetchCAMByCurriculumId(resolvedCurriculumId);
        }

        // Fallback to board/class/subject based fetch
        if (!camData) {
          camData = await fetchCAM(board, classLevel, subject);
        }

        const counts = new Map<string, number>();

        if (!camData) {
          setError('Unable to load curriculum data. Please try again later.');
          setIsLoading(false);
          return;
        }

        setCam(camData);
        setQuestionCounts(counts);

        // Transform CAM themes to ThemeData format (sample info will be added in render)
        const themeData: ThemeData[] = camData.themes.map((theme) => ({
          theme_id: theme.theme_id,
          theme_name: theme.theme_name,
          theme_order: theme.theme_order,
          topics: theme.topics.map((topic) => ({
            topic_id: topic.topic_id,
            topic_name: topic.topic_name,
            concept_count: topic.concepts?.length || 0,
            question_count: counts.get(topic.topic_id) || 0,
            proficiency: {
              band: 'not_started' as ProficiencyBand,
              label: 'Not Started',
            },
          })),
        }));

        setThemes(themeData);
      } catch (err) {
        console.error('Error loading curriculum data:', err);
        setError('Unable to load curriculum data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [board, classLevel, subject, propCurriculumId, curriculumContext?.currentCurriculum]);

  // Handle topic selection
  const handleTopicSelect = useCallback((topicId: string) => {
    // Find the topic name
    for (const theme of themes) {
      const topic = theme.topics.find((t) => t.topic_id === topicId);
      if (topic) {
        setSelectedTopic({ id: topicId, name: topic.topic_name });
        setIsModalOpen(true);
        return;
      }
    }
  }, [themes]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    if (!isStartingQuiz) {
      setIsModalOpen(false);
      setSelectedTopic(null);
    }
  }, [isStartingQuiz]);

  // Handle quiz start
  const handleQuizStart = useCallback(
    async (timeMode: TimeMode) => {
      if (!selectedTopic) return;

      setIsStartingQuiz(true);

      // Navigate to quiz page with query params
      const params = new URLSearchParams({
        topic: selectedTopic.id,
        mode: timeMode,
        board,
        class: classLevel.toString(),
        subject,
      });

      // Include curriculum ID if available
      if (curriculumId) {
        params.set('curriculumId', curriculumId);
      }

      router.push(`/quiz?${params.toString()}`);
    },
    [selectedTopic, board, classLevel, subject, curriculumId, router]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">Loading topics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-band-building)] flex items-center justify-center">
          <span className="text-2xl">!</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">Content Coming Soon</h3>
        <p className="text-[var(--color-text-muted)] max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  // No themes
  if (themes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--color-text-muted)]">No topics available for this subject.</p>
      </div>
    );
  }

  // Add sample info to themes for rendering
  const themesWithSampleInfo: ThemeData[] = themes.map((theme) => ({
    ...theme,
    topics: theme.topics.map((topic) => ({
      ...topic,
      isAuthenticated: access.isAuthenticated,
      samplesRemaining: access.isAuthenticated ? undefined : access.samplesRemaining(topic.topic_id),
    })),
  }));

  // Show banner for anonymous users who haven't dismissed it
  const showBanner = !access.isAuthenticated && !bannerDismissed && !access.isLoading;

  return (
    <>
      {/* Anonymous user banner */}
      {showBanner && (
        <div className="topic-browser-banner">
          <div className="topic-browser-banner-content">
            {/* Info icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="topic-browser-banner-icon"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Sign in to track your progress across sessions</span>
            <Link href="/login" className="topic-browser-banner-link">
              Sign in
            </Link>
          </div>
          <button
            type="button"
            className="topic-browser-banner-dismiss"
            onClick={handleDismissBanner}
            aria-label="Dismiss banner"
          >
            {/* X icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <ThemeList
        themes={themesWithSampleInfo}
        onTopicSelect={handleTopicSelect}
        defaultExpandedTheme={themes[0]?.theme_id}
      />

      <TimeModeModal
        open={isModalOpen}
        onClose={handleModalClose}
        onStart={handleQuizStart}
        topicName={selectedTopic?.name || ''}
        isLoading={isStartingQuiz}
      />
    </>
  );
}

export default TopicBrowser;
