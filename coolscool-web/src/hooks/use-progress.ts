'use client';

/**
 * useProgress Hook
 * Provides access to user progress data from the quiz engine
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  QuizEngine,
  createQuizEngine,
} from '@/lib/quiz-engine/quiz-engine';
import type {
  CAM,
  UserProgress,
  SessionSummary,
  TopicProgress,
  TopicProficiency,
  StorageStats,
  ProficiencyBand,
} from '@/lib/quiz-engine/types';
import { fetchCAM } from '@/services/curriculum-api';

export interface UseProgressOptions {
  board?: string;
  classLevel?: number;
  subject?: string;
  userId?: string;
}

export interface TopicProgressWithMeta extends TopicProgress {
  topic_name: string;
  theme_name: string;
}

export interface ProgressData {
  // Overview stats
  totalXP: number;
  sessionsCompleted: number;
  topicsStarted: number;
  topicsMastered: number;
  averageAccuracy: number;

  // Detailed data
  sessionHistory: SessionSummary[];
  topicProgresses: TopicProgressWithMeta[];

  // Storage stats
  storageStats: StorageStats | null;
}

export interface UseProgressState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  data: ProgressData | null;
}

export interface UseProgressReturn extends UseProgressState {
  // Actions
  refresh: () => Promise<void>;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<{ success: boolean; error?: string }>;
  clearAllData: () => Promise<boolean>;
}

const DEFAULT_PROGRESS_DATA: ProgressData = {
  totalXP: 0,
  sessionsCompleted: 0,
  topicsStarted: 0,
  topicsMastered: 0,
  averageAccuracy: 0,
  sessionHistory: [],
  topicProgresses: [],
  storageStats: null,
};

export function useProgress(options: UseProgressOptions = {}): UseProgressReturn {
  const {
    board = 'icse',
    classLevel = 5,
    subject = 'mathematics',
    userId = 'anonymous',
  } = options;

  const engineRef = useRef<QuizEngine | null>(null);
  const camRef = useRef<CAM | null>(null);

  const [state, setState] = useState<UseProgressState>({
    isLoading: true,
    isInitialized: false,
    error: null,
    data: null,
  });

  // Calculate derived stats from progress data
  const calculateStats = useCallback(
    async (engine: QuizEngine, cam: CAM): Promise<ProgressData> => {
      // Load all data
      const [progress, sessionHistory, storageStats] = await Promise.all([
        engine.getProgress(),
        engine.getSessionHistory(),
        engine.getStorageStats(),
      ]);

      // Calculate topics with progress
      const topicProgresses: TopicProgressWithMeta[] = [];
      let topicsStarted = 0;
      let topicsMastered = 0;

      for (const theme of cam.themes) {
        for (const topic of theme.topics) {
          const topicProgress = progress?.topics?.[topic.topic_id];
          const proficiency = await engine.getTopicProficiency(topic.topic_id);

          if (topicProgress && topicProgress.total_attempts > 0) {
            topicsStarted++;
            topicProgresses.push({
              ...topicProgress,
              topic_name: topic.topic_name,
              theme_name: theme.theme_name,
            });

            if (proficiency.band === 'exam_ready') {
              topicsMastered++;
            }
          }
        }
      }

      // Sort by last attempted (most recent first)
      topicProgresses.sort((a, b) => {
        const dateA = a.last_attempted_at ? new Date(a.last_attempted_at).getTime() : 0;
        const dateB = b.last_attempted_at ? new Date(b.last_attempted_at).getTime() : 0;
        return dateB - dateA;
      });

      // Calculate average accuracy from sessions
      let totalCorrect = 0;
      let totalAnswered = 0;
      for (const session of sessionHistory) {
        totalCorrect += session.questions_correct;
        totalAnswered += session.questions_answered;
      }
      const averageAccuracy = totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : 0;

      return {
        totalXP: progress?.total_xp || 0,
        sessionsCompleted: sessionHistory.length,
        topicsStarted,
        topicsMastered,
        averageAccuracy,
        sessionHistory: sessionHistory.sort((a, b) => {
          const dateA = a.started_at ? new Date(a.started_at).getTime() : 0;
          const dateB = b.started_at ? new Date(b.started_at).getTime() : 0;
          return dateB - dateA;
        }),
        topicProgresses,
        storageStats,
      };
    },
    []
  );

  // Initialize the engine and load data
  const initialize = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create engine
      const engine = createQuizEngine({
        userId,
        board,
        classLevel,
        subject,
      });

      // Load CAM data
      const cam = await fetchCAM(board, classLevel, subject);
      if (!cam) {
        throw new Error(`No curriculum data available for ${board} Class ${classLevel} ${subject}`);
      }

      engine.setCAM(cam);
      await engine.initialize();

      engineRef.current = engine;
      camRef.current = cam;

      // Calculate stats
      const data = await calculateStats(engine, cam);

      setState({
        isLoading: false,
        isInitialized: true,
        error: null,
        data,
      });
    } catch (error) {
      console.error('Failed to initialize progress:', error);
      setState({
        isLoading: false,
        isInitialized: false,
        error: error instanceof Error ? error.message : 'Failed to load progress',
        data: DEFAULT_PROGRESS_DATA,
      });
    }
  }, [board, classLevel, subject, userId, calculateStats]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (!engineRef.current || !camRef.current) {
      await initialize();
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await engineRef.current.reloadProgress();
      const data = await calculateStats(engineRef.current, camRef.current);
      setState((prev) => ({ ...prev, isLoading: false, data }));
    } catch (error) {
      console.error('Failed to refresh progress:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh',
      }));
    }
  }, [initialize, calculateStats]);

  // Export data
  const exportData = useCallback(async () => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.downloadExport();
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  }, []);

  // Import data
  const importData = useCallback(
    async (file: File): Promise<{ success: boolean; error?: string }> => {
      if (!engineRef.current) {
        return { success: false, error: 'Engine not initialized' };
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await engineRef.current.importData(data);

        if (result.success) {
          await refresh();
          return { success: true };
        } else {
          return {
            success: false,
            error: result.errors?.[0] || 'Import failed',
          };
        }
      } catch (error) {
        console.error('Failed to import data:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Invalid file',
        };
      }
    },
    [refresh]
  );

  // Clear all data
  const clearAllData = useCallback(async (): Promise<boolean> => {
    if (!engineRef.current) return false;

    try {
      const result = await engineRef.current.clearAllData();
      if (result) {
        await refresh();
      }
      return result;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }, [refresh]);

  return {
    ...state,
    refresh,
    exportData,
    importData,
    clearAllData,
  };
}

export default useProgress;
