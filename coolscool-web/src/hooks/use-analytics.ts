'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

// Types
export interface DailyTrend {
  date: string;
  sessions: number;
  questions: number;
  xp: number;
  accuracy: number;
}

export interface SubjectBreakdown {
  subject: string;
  sessions: number;
  questions: number;
  correct: number;
  accuracy: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface WeakArea {
  topicId: string;
  topicName: string;
  subject: string;
  totalAttempts: number;
  totalCorrect: number;
  accuracy: number;
  proficiencyBand: string;
}

export interface AnalyticsData {
  trends: DailyTrend[];
  subjects: SubjectBreakdown[];
  streak: StreakData;
  weakAreas: WeakArea[];
}

export function useAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all analytics data in parallel
      const [trendsRes, subjectsRes, streakRes, weakAreasRes] = await Promise.all([
        api.get<{ trends: DailyTrend[] }>(ENDPOINTS.PROGRESS_TRENDS),
        api.get<{ subjects: SubjectBreakdown[] }>(ENDPOINTS.PROGRESS_SUBJECTS),
        api.get<{ streak: StreakData }>(ENDPOINTS.PROGRESS_STREAK),
        api.get<{ weakAreas: WeakArea[] }>(ENDPOINTS.PROGRESS_WEAK_AREAS),
      ]);

      setData({
        trends: trendsRes.trends,
        subjects: subjectsRes.subjects,
        streak: streakRes.streak,
        weakAreas: weakAreasRes.weakAreas,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { isLoading, error, data, refresh: fetchAnalytics };
}
