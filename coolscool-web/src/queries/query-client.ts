/**
 * React Query Client Configuration
 *
 * Configures the QueryClient with default options.
 */

import { QueryClient } from '@tanstack/react-query';
import { APIError } from '@/lib/api';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,

        // Keep in cache for 30 minutes
        gcTime: 30 * 60 * 1000,

        // Retry logic
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (APIError.isAuthError(error)) {
            return false;
          }
          // Don't retry on client errors (4xx)
          if (error instanceof Error && 'status' in error) {
            const status = (error as APIError).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },

        // Exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Don't refetch on window focus by default
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Don't retry mutations by default
        retry: false,
      },
    },
  });
}

// Browser-side query client (singleton)
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  // Server-side: always create a new client
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  // Browser-side: reuse the same client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
