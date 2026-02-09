// Mock for next-auth/react
import type { Session } from 'next-auth';

// Default mock session - can be overridden in tests
export const mockSession: Session = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: null,
    role: 'child',
    firstName: 'Test',
    lastName: 'User',
  },
  accessToken: 'mock-access-token',
  accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

// Mock session state
let currentSession: Session | null = mockSession;
let currentStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'authenticated';

// Helper functions to control mock state in tests
export const mockUseSession = {
  setSession: (session: Session | null) => {
    currentSession = session;
    currentStatus = session ? 'authenticated' : 'unauthenticated';
  },
  setStatus: (status: 'loading' | 'authenticated' | 'unauthenticated') => {
    currentStatus = status;
  },
  reset: () => {
    currentSession = mockSession;
    currentStatus = 'authenticated';
  },
};

// useSession hook mock
export const useSession = jest.fn(() => ({
  data: currentSession,
  status: currentStatus,
  update: jest.fn(),
}));

// signIn mock
export const signIn = jest.fn((provider?: string, options?: { callbackUrl?: string; redirect?: boolean }) => {
  return Promise.resolve({
    error: undefined,
    status: 200,
    ok: true,
    url: options?.callbackUrl || '/',
  });
});

// signOut mock
export const signOut = jest.fn((options?: { callbackUrl?: string; redirect?: boolean }) => {
  currentSession = null;
  currentStatus = 'unauthenticated';
  return Promise.resolve({
    url: options?.callbackUrl || '/',
  });
});

// getSession mock
export const getSession = jest.fn(() => Promise.resolve(currentSession));

// getCsrfToken mock
export const getCsrfToken = jest.fn(() => Promise.resolve('mock-csrf-token'));

// getProviders mock
export const getProviders = jest.fn(() =>
  Promise.resolve({
    google: {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      signinUrl: '/api/auth/signin/google',
      callbackUrl: '/api/auth/callback/google',
    },
  })
);

// SessionProvider mock - just renders children
export const SessionProvider = jest.fn(({ children }: { children: React.ReactNode }) => children);
