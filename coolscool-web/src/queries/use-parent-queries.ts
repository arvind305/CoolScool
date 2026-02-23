/**
 * Parent Query Hooks
 *
 * React Query hooks for parent dashboard and child management.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from './keys';
import {
  api,
  ENDPOINTS,
  type LinkedChild,
  type ChildFullProgress,
  type ActivityItem,
  type ChildSession,
  type PaginationParams,
  type WeeklySummary,
  type SubjectBreakdownItem,
  type AreaOfConcern,
  type SessionDetail,
  type NotificationPreferences,
} from '@/lib/api';

// ============================================
// CHILDREN HOOKS
// ============================================

/**
 * Query hook for fetching linked children
 */
export function useChildrenQuery() {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.children(),
    queryFn: async (): Promise<LinkedChild[]> => {
      const result = await api.get<{ children: LinkedChild[] }>(ENDPOINTS.PARENT_CHILDREN);
      return result.children;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent',
  });
}

/**
 * Mutation hook for linking a child
 */
export function useLinkChildMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childEmail: string): Promise<LinkedChild> => {
      const result = await api.post<{ child: LinkedChild }>(ENDPOINTS.PARENT_CHILDREN, {
        childEmail,
      });
      return result.child;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parent.children() });
    },
  });
}

/**
 * Mutation hook for unlinking a child
 */
export function useUnlinkChildMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string): Promise<void> => {
      await api.delete(ENDPOINTS.PARENT_CHILD(childId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parent.children() });
    },
  });
}

/**
 * Mutation hook for granting parental consent
 */
export function useGrantConsentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string): Promise<void> => {
      await api.post(ENDPOINTS.PARENT_CHILD_CONSENT(childId));
    },
    onSuccess: (_, childId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parent.children() });
      queryClient.invalidateQueries({ queryKey: queryKeys.parent.child(childId) });
    },
  });
}

/**
 * Mutation hook for revoking parental consent
 */
export function useRevokeConsentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string): Promise<void> => {
      await api.delete(ENDPOINTS.PARENT_CHILD_CONSENT(childId));
    },
    onSuccess: (_, childId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parent.children() });
      queryClient.invalidateQueries({ queryKey: queryKeys.parent.child(childId) });
    },
  });
}

// ============================================
// CHILD PROGRESS HOOKS
// ============================================

/**
 * Query hook for fetching child's full progress
 */
export function useChildProgressQuery(childId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.childProgress(childId || ''),
    queryFn: async (): Promise<ChildFullProgress> => {
      const result = await api.get<{ progress: ChildFullProgress }>(
        ENDPOINTS.PARENT_CHILD_PROGRESS(childId!)
      );
      return result.progress;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent' && !!childId,
  });
}

/**
 * Query hook for fetching child's session history
 */
export function useChildSessionsQuery(childId: string | null, params: PaginationParams = {}) {
  const { data: session, status } = useSession();
  const { limit = 20, offset = 0 } = params;

  return useQuery({
    queryKey: [...queryKeys.parent.childSessions(childId || ''), { limit, offset }],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      const result = await api.get<{
        sessions: ChildSession[];
        pagination: { limit: number; offset: number; total: number };
      }>(`${ENDPOINTS.PARENT_CHILD_SESSIONS(childId!)}?${queryParams.toString()}`);
      return result;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent' && !!childId,
  });
}

// ============================================
// ACTIVITY HOOKS
// ============================================

/**
 * Query hook for fetching activity feed
 */
export function useActivityQuery(childId?: string, limit: number = 20) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.activity(childId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const queryParams = new URLSearchParams({ limit: limit.toString() });
      if (childId) {
        queryParams.set('childId', childId);
      }
      const result = await api.get<{ activities: ActivityItem[] }>(
        `${ENDPOINTS.PARENT_ACTIVITY}?${queryParams.toString()}`
      );
      return result.activities;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent',
  });
}

// ============================================
// WEEKLY SUMMARY HOOKS
// ============================================

/**
 * Query hook for fetching child's weekly summary
 */
export function useChildWeeklySummary(childId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.childWeeklySummary(childId || ''),
    queryFn: async (): Promise<WeeklySummary> => {
      const result = await api.get<{ summary: WeeklySummary }>(
        ENDPOINTS.PARENT_CHILD_WEEKLY_SUMMARY(childId!)
      );
      return result.summary;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent' && !!childId,
  });
}

// ============================================
// SUBJECT BREAKDOWN HOOKS
// ============================================

/**
 * Query hook for fetching child's subject breakdown
 */
export function useChildSubjectBreakdown(childId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.childSubjectBreakdown(childId || ''),
    queryFn: async (): Promise<SubjectBreakdownItem[]> => {
      const result = await api.get<{ subjects: SubjectBreakdownItem[] }>(
        ENDPOINTS.PARENT_CHILD_SUBJECT_BREAKDOWN(childId!)
      );
      return result.subjects;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent' && !!childId,
  });
}

// ============================================
// CONCERNS HOOKS
// ============================================

/**
 * Query hook for fetching child's areas of concern
 */
export function useChildConcerns(childId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.childConcerns(childId || ''),
    queryFn: async (): Promise<AreaOfConcern[]> => {
      const result = await api.get<{ concerns: AreaOfConcern[] }>(
        ENDPOINTS.PARENT_CHILD_CONCERNS(childId!)
      );
      return result.concerns;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent' && !!childId,
  });
}

// ============================================
// SESSION DETAIL HOOKS
// ============================================

/**
 * Query hook for fetching a specific session's detail
 */
export function useSessionDetail(childId: string | null, sessionId: string | null) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.childSessionDetail(childId || '', sessionId || ''),
    queryFn: async (): Promise<SessionDetail> => {
      const result = await api.get<{ session: SessionDetail }>(
        ENDPOINTS.PARENT_CHILD_SESSION_DETAIL(childId!, sessionId!)
      );
      return result.session;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent' && !!childId && !!sessionId,
  });
}

// ============================================
// NOTIFICATION PREFERENCES HOOKS
// ============================================

/**
 * Query hook for fetching notification preferences
 */
export function useNotificationPreferences() {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.parent.notifications(),
    queryFn: async (): Promise<NotificationPreferences> => {
      const result = await api.get<{ preferences: NotificationPreferences }>(
        ENDPOINTS.PARENT_NOTIFICATIONS
      );
      return result.preferences;
    },
    enabled: status === 'authenticated' && session?.user?.role === 'parent',
  });
}

/**
 * Mutation hook for updating notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
      const result = await api.put<{ preferences: NotificationPreferences }>(
        ENDPOINTS.PARENT_NOTIFICATIONS,
        updates
      );
      return result.preferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.parent.notifications(), data);
    },
  });
}

// ============================================
// COMBINED HOOKS
// ============================================

/**
 * Combined hook for parent dashboard
 */
export function useParentDashboard() {
  const childrenQuery = useChildrenQuery();
  const activityQuery = useActivityQuery();

  return {
    // Children
    children: childrenQuery.data || [],
    isLoadingChildren: childrenQuery.isLoading,
    childrenError: childrenQuery.error,

    // Activity
    activities: activityQuery.data || [],
    isLoadingActivity: activityQuery.isLoading,
    activityError: activityQuery.error,

    // Combined loading state
    isLoading: childrenQuery.isLoading || activityQuery.isLoading,

    // Refetch
    refetch: () => {
      childrenQuery.refetch();
      activityQuery.refetch();
    },
  };
}

/**
 * Combined hook for child management
 */
export function useChildManagement() {
  const childrenQuery = useChildrenQuery();
  const linkMutation = useLinkChildMutation();
  const unlinkMutation = useUnlinkChildMutation();
  const grantConsentMutation = useGrantConsentMutation();
  const revokeConsentMutation = useRevokeConsentMutation();

  return {
    // Children
    children: childrenQuery.data || [],
    isLoading: childrenQuery.isLoading,
    error: childrenQuery.error,

    // Link
    linkChild: linkMutation.mutateAsync,
    isLinking: linkMutation.isPending,
    linkError: linkMutation.error,

    // Unlink
    unlinkChild: unlinkMutation.mutateAsync,
    isUnlinking: unlinkMutation.isPending,

    // Consent
    grantConsent: grantConsentMutation.mutateAsync,
    revokeConsent: revokeConsentMutation.mutateAsync,
    isUpdatingConsent: grantConsentMutation.isPending || revokeConsentMutation.isPending,
  };
}

/**
 * Combined hook for viewing a specific child's data
 */
export function useChildView(childId: string | null) {
  const progressQuery = useChildProgressQuery(childId);
  const activityQuery = useActivityQuery(childId || undefined);
  const weeklySummaryQuery = useChildWeeklySummary(childId);
  const subjectBreakdownQuery = useChildSubjectBreakdown(childId);
  const concernsQuery = useChildConcerns(childId);

  return {
    // Progress
    progress: progressQuery.data,
    isLoadingProgress: progressQuery.isLoading,
    progressError: progressQuery.error,

    // Activity
    activities: activityQuery.data || [],
    isLoadingActivity: activityQuery.isLoading,

    // Weekly summary
    weeklySummary: weeklySummaryQuery.data,
    isLoadingWeeklySummary: weeklySummaryQuery.isLoading,

    // Subject breakdown
    subjectBreakdown: subjectBreakdownQuery.data || [],
    isLoadingSubjectBreakdown: subjectBreakdownQuery.isLoading,

    // Concerns
    concerns: concernsQuery.data || [],
    isLoadingConcerns: concernsQuery.isLoading,

    // Child info
    child: progressQuery.data?.child,

    // Combined
    isLoading: progressQuery.isLoading || activityQuery.isLoading,

    // Refetch
    refetch: () => {
      progressQuery.refetch();
      activityQuery.refetch();
      weeklySummaryQuery.refetch();
      subjectBreakdownQuery.refetch();
      concernsQuery.refetch();
    },
  };
}
