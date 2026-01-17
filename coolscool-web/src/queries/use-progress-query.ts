/**
 * Progress Query Hooks
 *
 * React Query hooks for user progress data.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from './keys';
import { api, ENDPOINTS, type UserProgress, type ProgressSummary, type TopicProgress } from '@/lib/api';
import { useContextStore } from '@/stores/context-store';

// ============================================
// HOOKS
// ============================================

/**
 * Query hook for fetching full user progress
 */
export function useProgressQuery() {
  const { data: session, status } = useSession();
  const { board, classLevel, subject } = useContextStore();

  return useQuery({
    queryKey: queryKeys.progress.detail(board, classLevel, subject),
    queryFn: async (): Promise<UserProgress> => {
      const result = await api.get<{ progress: UserProgress }>(ENDPOINTS.PROGRESS);
      return result.progress;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
  });
}

/**
 * Query hook for fetching progress summary (dashboard)
 */
export function useProgressSummaryQuery() {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.progress.summary(),
    queryFn: async (): Promise<ProgressSummary> => {
      const result = await api.get<{ summary: ProgressSummary }>(ENDPOINTS.PROGRESS_SUMMARY);
      return result.summary;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
  });
}

/**
 * Query hook for fetching single topic progress
 */
export function useTopicProgressQuery(topicId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.progress.topic(topicId || ''),
    queryFn: async (): Promise<TopicProgress> => {
      const result = await api.get<{ progress: TopicProgress }>(ENDPOINTS.PROGRESS_TOPIC(topicId!));
      return result.progress;
    },
    enabled: status === 'authenticated' && !!session?.accessToken && !!topicId,
  });
}

/**
 * Mutation hook for exporting progress
 */
export function useExportProgressMutation() {
  return useMutation({
    mutationFn: async () => {
      const result = await api.post<{ export: unknown }>(ENDPOINTS.PROGRESS_EXPORT);
      return result.export;
    },
  });
}

/**
 * Mutation hook for importing progress
 */
export function useImportProgressMutation() {
  const queryClient = useQueryClient();
  const { board, classLevel, subject } = useContextStore();

  return useMutation({
    mutationFn: async ({ exportData, merge = false }: { exportData: unknown; merge?: boolean }) => {
      const result = await api.post<{ imported: number; skipped: number }>(
        ENDPOINTS.PROGRESS_IMPORT,
        { exportData, merge }
      );
      return result;
    },
    onSuccess: () => {
      // Invalidate progress queries after import
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.progress.detail(board, classLevel, subject),
      });
    },
  });
}

/**
 * Mutation hook for resetting all progress
 */
export function useResetProgressMutation() {
  const queryClient = useQueryClient();
  const { board, classLevel, subject } = useContextStore();

  return useMutation({
    mutationFn: async () => {
      await api.delete(ENDPOINTS.PROGRESS, { confirm: 'RESET_ALL_PROGRESS' });
    },
    onSuccess: () => {
      // Invalidate all progress queries
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.progress.detail(board, classLevel, subject),
      });
    },
  });
}

// ============================================
// COMBINED HOOK
// ============================================

/**
 * Combined hook for progress with common operations
 */
export function useProgress() {
  const query = useProgressQuery();
  const summaryQuery = useProgressSummaryQuery();
  const exportMutation = useExportProgressMutation();
  const importMutation = useImportProgressMutation();
  const resetMutation = useResetProgressMutation();

  return {
    // Full progress
    progress: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Summary
    summary: summaryQuery.data,
    isSummaryLoading: summaryQuery.isLoading,

    // Export
    exportProgress: exportMutation.mutateAsync,
    isExporting: exportMutation.isPending,

    // Import
    importProgress: importMutation.mutateAsync,
    isImporting: importMutation.isPending,

    // Reset
    resetProgress: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
  };
}
