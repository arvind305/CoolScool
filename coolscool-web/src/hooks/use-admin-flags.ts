'use client';

/**
 * useAdminFlags — admin flags list, filtering, and actions.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export interface FlagItem {
  id: string;
  userId: string;
  questionId: string;
  curriculumId: string | null;
  flagReason: string;
  userComment: string | null;
  status: string;
  adminNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  email: string;
}

export interface FlagStats {
  total: number;
  byStatus: Record<string, number>;
  byReason: Record<string, number>;
  resolutionRate: number;
}

export type FlagStatusFilter = 'all' | 'open' | 'reviewed' | 'fixed' | 'dismissed';

export function useAdminFlags() {
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [stats, setStats] = useState<FlagStats | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FlagStatusFilter>('all');

  const fetchFlags = useCallback(async (filter: FlagStatusFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }
      params.set('limit', '50');
      const qs = params.toString();
      const url = `${ENDPOINTS.FLAGS}${qs ? `?${qs}` : ''}`;
      const res = await api.get<{ flags: FlagItem[]; total: number }>(url);
      setFlags(res.flags);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<{ stats: FlagStats }>(ENDPOINTS.FLAGS_STATS);
      setStats(res.stats);
    } catch {
      // Non-critical
    }
  }, []);

  const updateFlag = useCallback(async (flagId: string, status: string, adminNotes?: string) => {
    try {
      const body: Record<string, string> = { status };
      if (adminNotes !== undefined) {
        body.adminNotes = adminNotes;
      }
      await api.patch(ENDPOINTS.FLAG(flagId), body);
      // Refresh both lists
      await Promise.all([fetchFlags(statusFilter), fetchStats()]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update flag' };
    }
  }, [fetchFlags, fetchStats, statusFilter]);

  const changeFilter = useCallback((filter: FlagStatusFilter) => {
    setStatusFilter(filter);
    fetchFlags(filter);
  }, [fetchFlags]);

  useEffect(() => {
    fetchFlags(statusFilter);
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    flags,
    stats,
    total,
    isLoading,
    error,
    statusFilter,
    changeFilter,
    updateFlag,
    refresh: () => { fetchFlags(statusFilter); fetchStats(); },
  };
}
