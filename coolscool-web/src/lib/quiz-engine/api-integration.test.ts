/**
 * API Integration Tests
 *
 * These tests verify the API adapter configuration and structure.
 * For full integration testing, run with a live backend.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIStorageAdapter } from './storage/api-adapter';
import { createEmptyProgress } from './storage/base-adapter';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Storage Adapter', () => {
  let adapter: APIStorageAdapter;

  beforeEach(() => {
    adapter = new APIStorageAdapter({
      userId: 'test-user-123',
      accessToken: 'test-token',
      board: 'icse',
      classLevel: 5,
      subject: 'mathematics',
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadProgress', () => {
    it('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user_id: 'test-user-123',
          concepts: {},
          topics: {},
          total_xp: 0,
        }),
      });

      await adapter.loadProgress('test-user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/progress'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should include board/class/subject in query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await adapter.loadProgress('test-user-123');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('board=icse');
      expect(url).toContain('class=5');
      expect(url).toContain('subject=mathematics');
    });

    it('should return empty progress on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Not found',
      });

      const result = await adapter.loadProgress('test-user-123');

      expect(result).not.toBeNull();
      expect(result?.user_id).toBe('test-user-123');
      expect(result?.concepts).toEqual({});
    });

    it('should handle missing token', async () => {
      const noTokenAdapter = new APIStorageAdapter({
        userId: 'test-user',
        board: 'icse',
        classLevel: 5,
        subject: 'mathematics',
      });

      const result = await noTokenAdapter.loadProgress('test-user');

      // Should return empty progress without making API call
      expect(result).not.toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('saveProgress', () => {
    it('should POST progress to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const progress = createEmptyProgress('test-user-123');
      await adapter.saveProgress(progress);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/progress'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
  });

  describe('saveSessionToHistory', () => {
    it('should POST session to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await adapter.saveSessionToHistory({
        session_id: 'sess_test',
        topic_id: 'T01.01',
        topic_name: 'Test Topic',
        time_mode: 'unlimited',
        status: 'completed',
        total_questions: 10,
        questions_answered: 10,
        questions_correct: 8,
        questions_skipped: 0,
        xp_earned: 100,
        time_elapsed_ms: 60000,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/sessions'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('setContext', () => {
    it('should update board/class/subject context', async () => {
      adapter.setContext({
        board: 'cbse',
        classLevel: 6,
        subject: 'science',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await adapter.loadProgress('test-user-123');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('board=cbse');
      expect(url).toContain('class=6');
      expect(url).toContain('subject=science');
    });
  });

  describe('getStorageStats', () => {
    it('should return storage stats', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            concepts: { C01: {}, C02: {} },
            topics: { T01: {} },
            total_xp: 100,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sessions: [{}, {}, {}],
          }),
        });

      const stats = await adapter.getStorageStats();

      expect(stats.concepts_tracked).toBe(2);
      expect(stats.topics_tracked).toBe(1);
      expect(stats.total_xp).toBe(100);
      expect(stats.sessions_count).toBe(3);
      expect(stats.storage_available).toBe(true);
    });
  });
});

describe('Backend API Contract', () => {
  // These tests document the expected API contract
  // They don't actually call the API but verify our adapter matches expectations

  it('should expect progress endpoint at /api/v1/progress', () => {
    const adapter = new APIStorageAdapter({
      userId: 'test',
      accessToken: 'token',
    });

    // This documents the expected endpoint structure
    expect(typeof adapter.loadProgress).toBe('function');
    expect(typeof adapter.saveProgress).toBe('function');
  });

  it('should expect sessions endpoint at /api/v1/sessions', () => {
    const adapter = new APIStorageAdapter({
      userId: 'test',
      accessToken: 'token',
    });

    expect(typeof adapter.loadSessionHistory).toBe('function');
    expect(typeof adapter.saveSessionToHistory).toBe('function');
  });

  it('should support concept-level progress updates', () => {
    const adapter = new APIStorageAdapter({
      userId: 'test',
      accessToken: 'token',
    });

    expect(typeof adapter.saveConceptProgress).toBe('function');
  });
});

/**
 * Manual Integration Testing Guide
 *
 * To test with the live backend:
 *
 * 1. Get a valid JWT token from authentication
 * 2. Run in browser console or Node with fetch:
 *
 * ```javascript
 * import { APIStorageAdapter } from './storage/api-adapter';
 *
 * const adapter = new APIStorageAdapter({
 *   userId: 'your-user-id',
 *   accessToken: 'your-jwt-token',
 *   board: 'icse',
 *   classLevel: 5,
 *   subject: 'mathematics',
 * });
 *
 * // Test loading progress
 * const progress = await adapter.loadProgress('your-user-id');
 * console.log('Progress:', progress);
 *
 * // Test saving a session
 * await adapter.saveSessionToHistory({
 *   session_id: 'test-session',
 *   topic_id: 'T01.01',
 *   // ... other session fields
 * });
 *
 * // Test loading session history
 * const sessions = await adapter.loadSessionHistory();
 * console.log('Sessions:', sessions);
 * ```
 */
