/**
 * API Storage Adapter
 *
 * Storage adapter that syncs data with the backend API.
 * Used for authenticated users.
 */

import type {
  UserProgress,
  SessionSummary,
  UserSettings,
  StorageStats,
  ConceptProgress,
  TopicProgress,
} from '../types';

import { BaseStorageAdapter, createEmptyProgress } from './base-adapter';

// Backend API base URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://coolscool.onrender.com';

/**
 * API response types
 */
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface APIProgressResponse {
  user_id: string;
  total_xp: number;
  concepts: Record<string, ConceptProgress>;
  topics: Record<string, TopicProgress>;
  created_at: string;
  updated_at: string;
}

interface APISessionsResponse {
  sessions: SessionSummary[];
  total: number;
}

/**
 * API Storage Adapter implementation
 */
export class APIStorageAdapter extends BaseStorageAdapter {
  private accessToken: string | null = null;
  private userId: string;
  private board: string;
  private classLevel: number;
  private subject: string;

  constructor(options: {
    userId: string;
    accessToken?: string;
    board?: string;
    classLevel?: number;
    subject?: string;
  }) {
    super();
    this.userId = options.userId;
    this.accessToken = options.accessToken || null;
    this.board = options.board || 'icse';
    this.classLevel = options.classLevel || 5;
    this.subject = options.subject || 'mathematics';
  }

  /**
   * Sets the access token for API requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Makes an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    if (!this.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async loadProgress(userId: string): Promise<UserProgress | null> {
    const result = await this.apiRequest<APIProgressResponse>(
      `/api/v1/progress?board=${this.board}&class=${this.classLevel}&subject=${this.subject}`
    );

    if (!result.success || !result.data) {
      return createEmptyProgress(userId, {
        board: this.board,
        class_level: this.classLevel,
        subject: this.subject,
      });
    }

    // Transform API response to UserProgress format
    return {
      version: '1.0.0',
      user_id: result.data.user_id || userId,
      cam_reference: {
        cam_version: '1.0.0',
        board: this.board,
        class_level: this.classLevel,
        subject: this.subject,
      },
      concepts: result.data.concepts || {},
      topics: result.data.topics || {},
      total_xp: result.data.total_xp || 0,
      created_at: result.data.created_at || new Date().toISOString(),
      updated_at: result.data.updated_at || new Date().toISOString(),
    };
  }

  async saveProgress(progress: UserProgress): Promise<boolean> {
    const result = await this.apiRequest('/api/v1/progress', {
      method: 'POST',
      body: JSON.stringify({
        board: this.board,
        class_level: this.classLevel,
        subject: this.subject,
        concepts: progress.concepts,
        topics: progress.topics,
        total_xp: progress.total_xp,
      }),
    });

    return result.success;
  }

  /**
   * Saves progress for a single concept (more efficient for real-time updates)
   */
  async saveConceptProgress(conceptProgress: ConceptProgress): Promise<boolean> {
    const result = await this.apiRequest('/api/v1/progress/concept', {
      method: 'POST',
      body: JSON.stringify({
        board: this.board,
        class_level: this.classLevel,
        subject: this.subject,
        concept_id: conceptProgress.concept_id,
        progress: conceptProgress,
      }),
    });

    return result.success;
  }

  async loadSessionHistory(): Promise<SessionSummary[]> {
    const result = await this.apiRequest<APISessionsResponse>(
      `/api/v1/sessions?board=${this.board}&class=${this.classLevel}&subject=${this.subject}&limit=100`
    );

    if (!result.success || !result.data) {
      return [];
    }

    return result.data.sessions || [];
  }

  async saveSessionToHistory(summary: SessionSummary): Promise<boolean> {
    const result = await this.apiRequest('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({
        ...summary,
        board: this.board,
        class_level: this.classLevel,
        subject: this.subject,
      }),
    });

    return result.success;
  }

  async loadSettings(): Promise<UserSettings | null> {
    const result = await this.apiRequest<UserSettings>('/api/v1/settings');

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  }

  async saveSettings(settings: UserSettings): Promise<boolean> {
    const result = await this.apiRequest('/api/v1/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });

    return result.success;
  }

  async clearAllData(): Promise<boolean> {
    const result = await this.apiRequest('/api/v1/progress', {
      method: 'DELETE',
      body: JSON.stringify({
        board: this.board,
        class_level: this.classLevel,
        subject: this.subject,
      }),
    });

    return result.success;
  }

  async getStorageStats(): Promise<StorageStats> {
    const progress = await this.loadProgress(this.userId);
    const sessions = await this.loadSessionHistory();

    return {
      has_progress: progress ? Object.keys(progress.concepts).length > 0 : false,
      concepts_tracked: progress ? Object.keys(progress.concepts).length : 0,
      topics_tracked: progress ? Object.keys(progress.topics).length : 0,
      total_xp: progress?.total_xp || 0,
      sessions_count: sessions.length,
      storage_available: !!this.accessToken,
    };
  }

  /**
   * Sets the board/class context for future requests
   */
  setContext(options: {
    board?: string;
    classLevel?: number;
    subject?: string;
  }): void {
    if (options.board) this.board = options.board;
    if (options.classLevel) this.classLevel = options.classLevel;
    if (options.subject) this.subject = options.subject;
  }
}
