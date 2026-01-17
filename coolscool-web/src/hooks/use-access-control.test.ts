/**
 * useAccessControl Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useAccessControl } from './use-access-control';
import * as sampleTracker from '@/services/sample-tracker';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock sample-tracker service
jest.mock('@/services/sample-tracker', () => ({
  getSamplesRemaining: jest.fn(),
  hasFreeSamples: jest.fn(),
  recordSampleUsed: jest.fn(),
  SAMPLE_LIMIT: 3,
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockGetSamplesRemaining = sampleTracker.getSamplesRemaining as jest.MockedFunction<typeof sampleTracker.getSamplesRemaining>;
const mockHasFreeSamples = sampleTracker.hasFreeSamples as jest.MockedFunction<typeof sampleTracker.hasFreeSamples>;
const mockRecordSampleUsed = sampleTracker.recordSampleUsed as jest.MockedFunction<typeof sampleTracker.recordSampleUsed>;

// Helper to create a valid mock user matching BackendUser type
const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  role: 'child' as const,
  ...overrides,
});

// Helper to create a valid mock session
const createMockSession = (userOverrides = {}) => ({
  user: createMockUser(userOverrides),
  accessToken: 'mock-token',
  accessTokenExpires: Date.now() + 3600000,
  expires: '2024-12-31',
});

describe('useAccessControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to unauthenticated
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });
  });

  describe('authentication status', () => {
    it('returns isAuthenticated=true when session exists', () => {
      mockUseSession.mockReturnValue({
        data: createMockSession(),
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('returns isAuthenticated=false when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('returns isLoading=true when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading=false when session loaded', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('authenticated users - unlimited access', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: createMockSession(),
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('returns Infinity for samplesRemaining', () => {
      const { result } = renderHook(() => useAccessControl());

      expect(result.current.samplesRemaining('any-topic')).toBe(Infinity);
    });

    it('returns true for hasFreeSamples', () => {
      const { result } = renderHook(() => useAccessControl());

      expect(result.current.hasFreeSamples('any-topic')).toBe(true);
    });

    it('returns Infinity for recordSampleUsed (no decrement)', () => {
      const { result } = renderHook(() => useAccessControl());

      expect(result.current.recordSampleUsed('any-topic')).toBe(Infinity);
      expect(mockRecordSampleUsed).not.toHaveBeenCalled();
    });

    it('returns requiresAuth=false', () => {
      const { result } = renderHook(() => useAccessControl());

      expect(result.current.requiresAuth).toBe(false);
    });

    it('returns showLoginPrompt=false for any topic', () => {
      const { result } = renderHook(() => useAccessControl());

      expect(result.current.showLoginPrompt('topic-123')).toBe(false);
    });
  });

  describe('anonymous users - tracked samples', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });
    });

    it('tracks samples for anonymous users', () => {
      mockGetSamplesRemaining.mockReturnValue(2);

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.samplesRemaining('topic-123')).toBe(2);
      expect(mockGetSamplesRemaining).toHaveBeenCalledWith('topic-123');
    });

    it('returns correct hasFreeSamples from tracker', () => {
      mockHasFreeSamples.mockReturnValue(true);

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.hasFreeSamples('topic-123')).toBe(true);
      expect(mockHasFreeSamples).toHaveBeenCalledWith('topic-123');
    });

    it('returns false for hasFreeSamples when exhausted', () => {
      mockHasFreeSamples.mockReturnValue(false);

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.hasFreeSamples('topic-123')).toBe(false);
    });

    it('calls recordSampleUsed on tracker', () => {
      mockRecordSampleUsed.mockReturnValue(1);

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.recordSampleUsed('topic-123')).toBe(1);
      expect(mockRecordSampleUsed).toHaveBeenCalledWith('topic-123');
    });

    it('returns requiresAuth=true', () => {
      const { result } = renderHook(() => useAccessControl());

      expect(result.current.requiresAuth).toBe(true);
    });
  });

  describe('showLoginPrompt', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });
    });

    it('returns true when samples exhausted', () => {
      mockHasFreeSamples.mockReturnValue(false);

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.showLoginPrompt('topic-123')).toBe(true);
    });

    it('returns false when samples remaining', () => {
      mockHasFreeSamples.mockReturnValue(true);

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.showLoginPrompt('topic-123')).toBe(false);
    });

    it('returns false for authenticated users even with no samples', () => {
      mockUseSession.mockReturnValue({
        data: createMockSession(),
        status: 'authenticated',
        update: jest.fn(),
      });
      mockHasFreeSamples.mockReturnValue(false);

      const { result } = renderHook(() => useAccessControl());

      expect(result.current.showLoginPrompt('topic-123')).toBe(false);
    });
  });

  describe('sampleLimit constant', () => {
    it('returns the SAMPLE_LIMIT constant', () => {
      const { result } = renderHook(() => useAccessControl());

      expect(result.current.sampleLimit).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('handles session with no user object', () => {
      mockUseSession.mockReturnValue({
        data: { expires: '2024-12-31' } as any,
        status: 'authenticated',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useAccessControl());

      // Should be unauthenticated because user is missing
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('memoizes callback functions', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useAccessControl());

      const firstHasFreeSamples = result.current.hasFreeSamples;
      const firstSamplesRemaining = result.current.samplesRemaining;
      const firstRecordSampleUsed = result.current.recordSampleUsed;
      const firstShowLoginPrompt = result.current.showLoginPrompt;

      rerender();

      // Functions should be memoized (same reference)
      expect(result.current.hasFreeSamples).toBe(firstHasFreeSamples);
      expect(result.current.samplesRemaining).toBe(firstSamplesRemaining);
      expect(result.current.recordSampleUsed).toBe(firstRecordSampleUsed);
      expect(result.current.showLoginPrompt).toBe(firstShowLoginPrompt);
    });

    it('updates memoized functions when auth status changes', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useAccessControl());

      const unauthHasFreeSamples = result.current.hasFreeSamples;

      // Change to authenticated
      mockUseSession.mockReturnValue({
        data: createMockSession(),
        status: 'authenticated',
        update: jest.fn(),
      });

      rerender();

      // Functions should be new references because isAuthenticated changed
      expect(result.current.hasFreeSamples).not.toBe(unauthHasFreeSamples);
    });
  });
});
