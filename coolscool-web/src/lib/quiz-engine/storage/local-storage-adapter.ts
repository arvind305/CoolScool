/**
 * LocalStorage Adapter
 *
 * Storage adapter that persists data to browser localStorage.
 * Used for anonymous users and offline support.
 */

import type {
  UserProgress,
  SessionSummary,
  UserSettings,
  StorageStats,
  CAMReference,
} from '../types';

import {
  BaseStorageAdapter,
  STORAGE_KEYS,
  createEmptyProgress,
} from './base-adapter';

const MAX_SESSION_HISTORY = 100;

/**
 * Checks if localStorage is available in the current environment
 */
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// In-memory fallback storage for SSR or when localStorage is unavailable
let memoryStorage: Record<string, string> = {};

/**
 * Gets an item from storage (localStorage or memory fallback)
 */
function getItem<T>(key: string): T | null {
  try {
    const value = isLocalStorageAvailable()
      ? localStorage.getItem(key)
      : memoryStorage[key];

    if (value === null || value === undefined) return null;
    return JSON.parse(value) as T;
  } catch (e) {
    console.error(`Error reading from storage: ${key}`, e);
    return null;
  }
}

/**
 * Sets an item in storage
 */
function setItem<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, serialized);
    } else {
      memoryStorage[key] = serialized;
    }
    return true;
  } catch (e) {
    console.error(`Error writing to storage: ${key}`, e);
    return false;
  }
}

/**
 * Removes an item from storage
 */
function removeItem(key: string): boolean {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    } else {
      delete memoryStorage[key];
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * LocalStorage adapter implementation
 */
export class LocalStorageAdapter extends BaseStorageAdapter {
  private defaultUserId: string;
  private camReference?: Partial<CAMReference>;

  constructor(
    defaultUserId: string = 'anonymous',
    camReference?: Partial<CAMReference>
  ) {
    super();
    this.defaultUserId = defaultUserId;
    this.camReference = camReference;
  }

  async loadProgress(userId: string): Promise<UserProgress | null> {
    const stored = getItem<UserProgress>(STORAGE_KEYS.PROGRESS);

    if (!stored) {
      return createEmptyProgress(userId || this.defaultUserId, this.camReference);
    }

    // Check if stored progress belongs to a different user
    if (stored.user_id && stored.user_id !== userId) {
      return createEmptyProgress(userId, this.camReference);
    }

    return stored;
  }

  async saveProgress(progress: UserProgress): Promise<boolean> {
    progress.updated_at = new Date().toISOString();
    return setItem(STORAGE_KEYS.PROGRESS, progress);
  }

  async loadSessionHistory(): Promise<SessionSummary[]> {
    return getItem<SessionSummary[]>(STORAGE_KEYS.SESSIONS) || [];
  }

  async saveSessionToHistory(summary: SessionSummary): Promise<boolean> {
    const history = await this.loadSessionHistory();
    history.unshift(summary);
    return setItem(STORAGE_KEYS.SESSIONS, history.slice(0, MAX_SESSION_HISTORY));
  }

  async loadSettings(): Promise<UserSettings | null> {
    return getItem<UserSettings>(STORAGE_KEYS.SETTINGS);
  }

  async saveSettings(settings: UserSettings): Promise<boolean> {
    return setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  async clearAllData(): Promise<boolean> {
    removeItem(STORAGE_KEYS.PROGRESS);
    removeItem(STORAGE_KEYS.SESSIONS);
    removeItem(STORAGE_KEYS.SETTINGS);
    memoryStorage = {};
    return true;
  }

  async getStorageStats(): Promise<StorageStats> {
    const progress = await this.loadProgress(this.defaultUserId);
    const sessions = await this.loadSessionHistory();

    return {
      has_progress: progress ? Object.keys(progress.concepts).length > 0 : false,
      concepts_tracked: progress ? Object.keys(progress.concepts).length : 0,
      topics_tracked: progress ? Object.keys(progress.topics).length : 0,
      total_xp: progress?.total_xp || 0,
      sessions_count: sessions.length,
      storage_available: isLocalStorageAvailable(),
    };
  }

  /**
   * Exports all data from localStorage
   */
  async exportAll(): Promise<{
    progress: UserProgress | null;
    sessions: SessionSummary[];
    settings: UserSettings | null;
  }> {
    return {
      progress: await this.loadProgress(this.defaultUserId),
      sessions: await this.loadSessionHistory(),
      settings: await this.loadSettings(),
    };
  }

  /**
   * Imports data to localStorage
   */
  async importAll(data: {
    progress?: UserProgress;
    sessions?: SessionSummary[];
    settings?: UserSettings;
  }): Promise<boolean> {
    try {
      if (data.progress) {
        await this.saveProgress(data.progress);
      }
      if (data.sessions) {
        setItem(STORAGE_KEYS.SESSIONS, data.sessions);
      }
      if (data.settings) {
        await this.saveSettings(data.settings);
      }
      return true;
    } catch {
      return false;
    }
  }
}
