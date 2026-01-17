/**
 * Settings Service
 *
 * Manages user settings and preferences.
 */

import { query } from '../db/index.js';

// ============================================
// INTERFACES
// ============================================

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  sound_enabled: boolean;
  preferred_time_mode: 'unlimited' | '10min' | '5min' | '3min';
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsInput {
  theme?: 'light' | 'dark' | 'system';
  sound_enabled?: boolean;
  preferred_time_mode?: 'unlimited' | '10min' | '5min' | '3min';
}

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  sound_enabled: true,
  preferred_time_mode: 'unlimited' as const,
};

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Gets user settings, creating defaults if none exist
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  // Try to get existing settings
  const result = await query<UserSettings>(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [userId]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  // Create default settings
  const createResult = await query<UserSettings>(
    `INSERT INTO user_settings (user_id, theme, sound_enabled, preferred_time_mode)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, DEFAULT_SETTINGS.theme, DEFAULT_SETTINGS.sound_enabled, DEFAULT_SETTINGS.preferred_time_mode]
  );

  return createResult.rows[0]!;
}

/**
 * Updates user settings (upsert)
 */
export async function updateUserSettings(
  userId: string,
  updates: UpdateSettingsInput
): Promise<UserSettings> {
  // Get current settings or defaults
  const current = await getUserSettings(userId);

  // Merge updates with current
  const newTheme = updates.theme ?? current.theme;
  const newSoundEnabled = updates.sound_enabled ?? current.sound_enabled;
  const newTimeMode = updates.preferred_time_mode ?? current.preferred_time_mode;

  // Update
  const result = await query<UserSettings>(
    `UPDATE user_settings
     SET theme = $1, sound_enabled = $2, preferred_time_mode = $3
     WHERE user_id = $4
     RETURNING *`,
    [newTheme, newSoundEnabled, newTimeMode, userId]
  );

  return result.rows[0]!;
}
