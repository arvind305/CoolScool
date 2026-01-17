/**
 * Base Storage Adapter
 *
 * Abstract base class for storage adapters.
 * Provides common utilities and defines the interface.
 */

import type {
  StorageAdapter,
  UserProgress,
  SessionSummary,
  UserSettings,
  StorageStats,
  CAMReference,
} from '../types';

export const STORAGE_KEYS = {
  PROGRESS: 'coolscool_progress',
  SESSIONS: 'coolscool_sessions',
  SETTINGS: 'coolscool_settings',
};

export const DATA_VERSION = '1.0.0';

/**
 * Creates an empty progress object for a new user
 */
export function createEmptyProgress(
  userId: string,
  camReference?: Partial<CAMReference>
): UserProgress {
  return {
    version: DATA_VERSION,
    user_id: userId,
    cam_reference: {
      cam_version: camReference?.cam_version || '1.0.0',
      board: camReference?.board || 'icse',
      class_level: camReference?.class_level || 5,
      subject: camReference?.subject || 'mathematics',
    },
    concepts: {},
    topics: {},
    total_xp: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Abstract base class for storage adapters
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  abstract loadProgress(userId: string): Promise<UserProgress | null>;
  abstract saveProgress(progress: UserProgress): Promise<boolean>;
  abstract loadSessionHistory(): Promise<SessionSummary[]>;
  abstract saveSessionToHistory(summary: SessionSummary): Promise<boolean>;
  abstract loadSettings(): Promise<UserSettings | null>;
  abstract saveSettings(settings: UserSettings): Promise<boolean>;
  abstract clearAllData(): Promise<boolean>;
  abstract getStorageStats(): Promise<StorageStats>;
}
