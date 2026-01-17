/**
 * Sessions Query Hooks
 *
 * React Query hooks for quiz session history.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from './keys';
import { api, ENDPOINTS, type PaginationParams } from '@/lib/api';
import { useContextStore } from '@/stores/context-store';
import type { SessionSummary } from '@/lib/quiz-engine/types';

// ============================================
// TYPES
// ============================================

interface SessionsResponse {
  sessions: SessionSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// ============================================
// HOOKS
// ============================================

/**
 * Query hook for fetching session history
 */
export function useSessionsQuery(params: PaginationParams = {}) {
  const { data: session, status } = useSession();
  const { board, classLevel, subject } = useContextStore();
  const { limit = 20, offset = 0 } = params;

  return useQuery({
    queryKey: [...queryKeys.sessions.list(board, classLevel, subject), { limit, offset }],
    queryFn: async (): Promise<SessionsResponse> => {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      const result = await api.get<SessionsResponse>(
        `${ENDPOINTS.SESSIONS}?${queryParams.toString()}`
      );
      return result;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
  });
}

/**
 * Query hook for fetching a single session detail
 */
export function useSessionDetailQuery(sessionId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.sessions.detail(sessionId || ''),
    queryFn: async () => {
      const result = await api.get<{ session: unknown }>(ENDPOINTS.SESSION(sessionId!));
      return result.session;
    },
    enabled: status === 'authenticated' && !!session?.accessToken && !!sessionId,
  });
}

/**
 * Query hook for fetching session summary
 */
export function useSessionSummaryQuery(sessionId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: [...queryKeys.sessions.detail(sessionId || ''), 'summary'],
    queryFn: async () => {
      const result = await api.get<{ summary: SessionSummary }>(
        ENDPOINTS.SESSION_SUMMARY(sessionId!)
      );
      return result.summary;
    },
    enabled: status === 'authenticated' && !!session?.accessToken && !!sessionId,
  });
}

// ============================================
// COMBINED HOOK
// ============================================

/**
 * Combined hook for session history
 */
export function useSessions(params: PaginationParams = {}) {
  const query = useSessionsQuery(params);

  return {
    sessions: query.data?.sessions || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
