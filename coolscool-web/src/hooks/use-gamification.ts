'use client';

/**
 * Gamification Hooks
 *
 * Hooks for achievements, level info, and daily challenge.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Achievement, AchievementStats, LevelInfo, DailyChallenge, DailyChallengeResult } from '@/lib/api/types';

// ============================================
// useAchievements — full list for showcase page
// ============================================

export function useAchievements() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ achievements: Achievement[] }>(ENDPOINTS.ACHIEVEMENTS);
      setAchievements(res.achievements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { isLoading, error, achievements, refresh: fetch };
}

// ============================================
// useAchievementStats — summary for dashboard card
// ============================================

export function useAchievementStats() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AchievementStats | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ stats: AchievementStats }>(ENDPOINTS.ACHIEVEMENT_STATS);
      setStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievement stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { isLoading, error, stats, refresh: fetch };
}

// ============================================
// useLevelInfo — current level for dashboard
// ============================================

export function useLevelInfo() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ levelInfo: LevelInfo }>(ENDPOINTS.LEVEL_INFO);
      setLevelInfo(res.levelInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load level info');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { isLoading, error, levelInfo, refresh: fetch };
}

// ============================================
// useDailyChallenge — today's challenge
// ============================================

export function useDailyChallenge() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DailyChallenge | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<DailyChallenge>(ENDPOINTS.DAILY_CHALLENGE);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily challenge');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { isLoading, error, data, refresh: fetch };
}

// ============================================
// useSubmitDailyChallenge — mutation for submitting answer
// ============================================

export function useSubmitDailyChallenge() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DailyChallengeResult | null>(null);

  const submit = useCallback(async (answer: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post<DailyChallengeResult>(ENDPOINTS.DAILY_CHALLENGE, { answer });
      setResult(res);
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, error, result, submit };
}
