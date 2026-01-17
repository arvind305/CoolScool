/**
 * Auth Token Hook
 *
 * Provides access token from NextAuth session and handles expiration.
 */

'use client';

import { useSession, signOut } from 'next-auth/react';
import { useCallback, useEffect } from 'react';
import { configureAPIClient } from '@/lib/api';

// ============================================
// HOOK
// ============================================

interface UseAuthTokenReturn {
  accessToken: string | null;
  isAuthenticated: boolean;
  isExpired: boolean;
  handleExpired: () => void;
}

export function useAuthToken(): UseAuthTokenReturn {
  const { data: session, status } = useSession();

  const accessToken = session?.accessToken || null;
  const expiresAt = session?.accessTokenExpires || 0;
  const isExpired = expiresAt > 0 && Date.now() >= expiresAt;
  const isAuthenticated = status === 'authenticated' && !!accessToken && !isExpired;

  const handleExpired = useCallback(() => {
    signOut({ callbackUrl: '/login?error=SessionExpired' });
  }, []);

  // Configure API client when token changes
  useEffect(() => {
    configureAPIClient({
      getAccessToken: () => accessToken,
      onUnauthorized: handleExpired,
    });
  }, [accessToken, handleExpired]);

  // Check for session error (token refresh failed)
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      handleExpired();
    }
  }, [session?.error, handleExpired]);

  return {
    accessToken,
    isAuthenticated,
    isExpired,
    handleExpired,
  };
}

// ============================================
// API CLIENT INITIALIZER COMPONENT
// ============================================

/**
 * Component to initialize the API client with auth token.
 * Should be placed inside SessionProvider.
 */
export function APIClientInitializer({ children }: { children: React.ReactNode }) {
  useAuthToken(); // This sets up the API client configuration
  return <>{children}</>;
}
