/**
 * Access Control Hook
 *
 * Centralizes access control logic for the freemium model.
 * - Authenticated users get unlimited access
 * - Anonymous users get limited free samples per topic
 */

'use client';

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import {
  getSamplesRemaining,
  hasFreeSamples as checkFreeSamples,
  recordSampleUsed as trackSampleUsed,
  SAMPLE_LIMIT,
} from '@/services/sample-tracker';

// ============================================
// TYPES
// ============================================

export interface UseAccessControlReturn {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the auth status is still loading */
  isLoading: boolean;
  /** Check if topic has free samples remaining (always true for authenticated users) */
  hasFreeSamples: (topicId: string) => boolean;
  /** Get remaining samples for a topic (Infinity for authenticated users) */
  samplesRemaining: (topicId: string) => number;
  /** Record a sample used and return new count (no-op for authenticated users, returns Infinity) */
  recordSampleUsed: (topicId: string) => number;
  /** Whether user needs to sign in for full access */
  requiresAuth: boolean;
  /** Whether to show login prompt for a topic (no samples left and not authenticated) */
  showLoginPrompt: (topicId: string) => boolean;
  /** The sample limit constant */
  sampleLimit: number;
}

// ============================================
// HOOK
// ============================================

export function useAccessControl(): UseAccessControlReturn {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // For authenticated users, always return unlimited access
  const hasFreeSamplesForTopic = useCallback(
    (topicId: string): boolean => {
      if (isAuthenticated) {
        return true;
      }
      return checkFreeSamples(topicId);
    },
    [isAuthenticated]
  );

  const samplesRemainingForTopic = useCallback(
    (topicId: string): number => {
      if (isAuthenticated) {
        return Infinity;
      }
      return getSamplesRemaining(topicId);
    },
    [isAuthenticated]
  );

  const recordSampleUsedForTopic = useCallback(
    (topicId: string): number => {
      if (isAuthenticated) {
        // Authenticated users don't track samples - unlimited access
        return Infinity;
      }
      return trackSampleUsed(topicId);
    },
    [isAuthenticated]
  );

  const showLoginPromptForTopic = useCallback(
    (topicId: string): boolean => {
      if (isAuthenticated) {
        return false;
      }
      return !checkFreeSamples(topicId);
    },
    [isAuthenticated]
  );

  // User requires auth if they're not authenticated
  const requiresAuth = !isAuthenticated;

  return {
    isAuthenticated,
    isLoading,
    hasFreeSamples: hasFreeSamplesForTopic,
    samplesRemaining: samplesRemainingForTopic,
    recordSampleUsed: recordSampleUsedForTopic,
    requiresAuth,
    showLoginPrompt: showLoginPromptForTopic,
    sampleLimit: SAMPLE_LIMIT,
  };
}

// Export as both default and named export
export default useAccessControl;
