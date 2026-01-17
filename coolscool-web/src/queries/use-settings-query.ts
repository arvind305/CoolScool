/**
 * Settings Query Hooks
 *
 * React Query hooks for user settings.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from './keys';
import { api, ENDPOINTS, type UserSettings } from '@/lib/api';

// ============================================
// HOOKS
// ============================================

/**
 * Query hook for fetching user settings
 */
export function useSettingsQuery() {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async (): Promise<UserSettings> => {
      const result = await api.get<{ settings: UserSettings }>(ENDPOINTS.SETTINGS);
      return result.settings;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
    staleTime: 10 * 60 * 1000, // Settings don't change often
  });
}

/**
 * Mutation hook for updating user settings
 */
export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>): Promise<UserSettings> => {
      const result = await api.put<{ settings: UserSettings }>(ENDPOINTS.SETTINGS, updates);
      return result.settings;
    },
    onSuccess: (data) => {
      // Update cache with new settings
      queryClient.setQueryData(queryKeys.settings.all, data);
    },
  });
}

// ============================================
// COMBINED HOOK
// ============================================

/**
 * Combined hook for settings with query and mutation
 */
export function useSettings() {
  const query = useSettingsQuery();
  const mutation = useUpdateSettingsMutation();

  return {
    // Query state
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,

    // Mutation
    updateSettings: mutation.mutate,
    updateSettingsAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
