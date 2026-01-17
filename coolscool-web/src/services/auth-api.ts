// Auth API service for communicating with the backend

import type { BackendAuthResponse, BackendRefreshResponse } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coolscool.onrender.com';

/**
 * Exchange Google ID token for backend JWT tokens
 */
export async function authenticateWithGoogle(idToken: string): Promise<BackendAuthResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idToken,
      deviceInfo: {
        platform: 'web',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to authenticate with backend');
  }

  return response.json();
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<BackendRefreshResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

/**
 * Logout from backend
 */
export async function logout(accessToken: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
