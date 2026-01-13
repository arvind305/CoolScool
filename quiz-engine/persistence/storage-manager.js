/**
 * Storage Manager Module
 *
 * Handles persistence using localStorage following North Star §12:
 * - localStorage for progress (MVP)
 * - Supports browser and Node.js environments
 *
 * @module quiz-engine/persistence/storage-manager
 */

'use strict';

const { createConceptProgress } = require('../core/mastery-tracker');
const { createTopicProgress } = require('../core/proficiency-calculator');

// Storage keys
const STORAGE_KEYS = {
  PROGRESS: 'qming_kids_progress',
  SESSIONS: 'qming_kids_sessions',
  SETTINGS: 'qming_kids_settings'
};

// Current data version (for migrations)
const DATA_VERSION = '1.0.0';

/**
 * In-memory storage fallback for Node.js or when localStorage unavailable
 */
let memoryStorage = {};

/**
 * Checks if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
function isLocalStorageAvailable() {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Gets a value from storage
 *
 * @param {string} key - Storage key
 * @returns {*} Parsed value or null
 */
function getItem(key) {
  try {
    let value;
    if (isLocalStorageAvailable()) {
      value = localStorage.getItem(key);
    } else {
      value = memoryStorage[key];
    }

    if (value === null || value === undefined) {
      return null;
    }

    return JSON.parse(value);
  } catch (e) {
    console.error(`Error reading from storage: ${key}`, e);
    return null;
  }
}

/**
 * Sets a value in storage
 *
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} True if successful
 */
function setItem(key, value) {
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
 * Removes a value from storage
 *
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
function removeItem(key) {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    } else {
      delete memoryStorage[key];
    }
    return true;
  } catch (e) {
    console.error(`Error removing from storage: ${key}`, e);
    return false;
  }
}

/**
 * Creates an empty progress object
 *
 * @param {string} userId - User ID
 * @returns {Object} Empty progress object
 */
function createEmptyProgress(userId) {
  const now = new Date().toISOString();

  return {
    version: DATA_VERSION,
    user_id: userId,
    cam_reference: {
      cam_version: '1.0.0',
      board: 'ICSE',
      class: 5,
      subject: 'Mathematics'
    },
    concepts: {},
    topics: {},
    total_xp: 0,
    created_at: now,
    updated_at: now
  };
}

/**
 * Loads user progress from storage
 *
 * @param {string} userId - User ID (optional, defaults to 'default')
 * @returns {Object} Progress object
 */
function loadProgress(userId = 'default') {
  const stored = getItem(STORAGE_KEYS.PROGRESS);

  if (!stored) {
    return createEmptyProgress(userId);
  }

  // Handle multi-user storage
  if (stored.user_id && stored.user_id !== userId) {
    // Different user, create new
    return createEmptyProgress(userId);
  }

  // Migrate if needed
  if (stored.version !== DATA_VERSION) {
    return migrateProgress(stored, userId);
  }

  return stored;
}

/**
 * Saves user progress to storage
 *
 * @param {Object} progress - Progress object
 * @returns {boolean} True if successful
 */
function saveProgress(progress) {
  progress.updated_at = new Date().toISOString();
  return setItem(STORAGE_KEYS.PROGRESS, progress);
}

/**
 * Updates concept progress and recalculates topic progress
 *
 * @param {Object} progress - Current progress object
 * @param {Object} conceptProgress - Updated concept progress
 * @param {Object} camTopic - CAM topic (for proficiency calculation)
 * @returns {Object} Updated progress object
 */
function updateConceptProgress(progress, conceptProgress, camTopic) {
  const conceptId = conceptProgress.concept_id;
  const topicId = conceptId.substring(0, 6); // Extract T01.01 from T01.01.C01

  // Update concept
  progress.concepts[conceptId] = conceptProgress;

  // Recalculate total XP
  progress.total_xp = Object.values(progress.concepts)
    .reduce((sum, c) => sum + (c.xp_earned || 0), 0);

  // Recalculate topic progress if CAM topic provided
  if (camTopic) {
    const topicConcepts = camTopic.concepts || [];
    const topicConceptProgresses = topicConcepts
      .map(c => progress.concepts[c.concept_id])
      .filter(Boolean);

    progress.topics[topicId] = createTopicProgress(
      topicId,
      topicConceptProgresses,
      topicConcepts
    );
  }

  return progress;
}

/**
 * Gets or creates concept progress
 *
 * @param {Object} progress - User progress object
 * @param {string} conceptId - Concept ID
 * @param {string[]} allowedDifficulties - Allowed difficulties from CAM
 * @returns {Object} Concept progress
 */
function getOrCreateConceptProgress(progress, conceptId, allowedDifficulties) {
  if (progress.concepts[conceptId]) {
    return progress.concepts[conceptId];
  }

  const newProgress = createConceptProgress(conceptId, allowedDifficulties);
  progress.concepts[conceptId] = newProgress;
  return newProgress;
}

/**
 * Loads session history from storage
 *
 * @returns {Object[]} Array of session summaries
 */
function loadSessionHistory() {
  return getItem(STORAGE_KEYS.SESSIONS) || [];
}

/**
 * Saves a session summary to history
 *
 * @param {Object} sessionSummary - Session summary object
 * @returns {boolean} True if successful
 */
function saveSessionToHistory(sessionSummary) {
  const history = loadSessionHistory();

  // Add new session
  history.unshift(sessionSummary);

  // Keep only last 100 sessions
  const trimmed = history.slice(0, 100);

  return setItem(STORAGE_KEYS.SESSIONS, trimmed);
}

/**
 * Clears session history
 *
 * @returns {boolean} True if successful
 */
function clearSessionHistory() {
  return setItem(STORAGE_KEYS.SESSIONS, []);
}

/**
 * Loads user settings
 *
 * @returns {Object} Settings object
 */
function loadSettings() {
  return getItem(STORAGE_KEYS.SETTINGS) || {
    default_time_mode: 'unlimited',
    sound_enabled: true,
    theme: 'light'
  };
}

/**
 * Saves user settings
 *
 * @param {Object} settings - Settings object
 * @returns {boolean} True if successful
 */
function saveSettings(settings) {
  return setItem(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Migrates progress data from older versions
 *
 * @param {Object} oldProgress - Old progress object
 * @param {string} userId - User ID
 * @returns {Object} Migrated progress
 */
function migrateProgress(oldProgress, userId) {
  // For now, just return new empty progress
  // Future versions can add actual migration logic
  console.log(`Migrating progress from version ${oldProgress.version} to ${DATA_VERSION}`);

  const newProgress = createEmptyProgress(userId);

  // Preserve what we can
  if (oldProgress.concepts) {
    newProgress.concepts = oldProgress.concepts;
  }
  if (oldProgress.topics) {
    newProgress.topics = oldProgress.topics;
  }
  if (oldProgress.total_xp) {
    newProgress.total_xp = oldProgress.total_xp;
  }
  if (oldProgress.created_at) {
    newProgress.created_at = oldProgress.created_at;
  }

  return newProgress;
}

/**
 * Clears all stored data (for testing or reset)
 *
 * @returns {boolean} True if successful
 */
function clearAllData() {
  try {
    removeItem(STORAGE_KEYS.PROGRESS);
    removeItem(STORAGE_KEYS.SESSIONS);
    removeItem(STORAGE_KEYS.SETTINGS);
    memoryStorage = {};
    return true;
  } catch (e) {
    console.error('Error clearing all data', e);
    return false;
  }
}

/**
 * Gets storage statistics
 *
 * @returns {Object} Storage stats
 */
function getStorageStats() {
  const progress = loadProgress();
  const sessions = loadSessionHistory();

  return {
    has_progress: Object.keys(progress.concepts).length > 0,
    concepts_tracked: Object.keys(progress.concepts).length,
    topics_tracked: Object.keys(progress.topics).length,
    total_xp: progress.total_xp,
    sessions_count: sessions.length,
    storage_available: isLocalStorageAvailable()
  };
}

// Export module
module.exports = {
  STORAGE_KEYS,
  DATA_VERSION,
  isLocalStorageAvailable,
  getItem,
  setItem,
  removeItem,
  createEmptyProgress,
  loadProgress,
  saveProgress,
  updateConceptProgress,
  getOrCreateConceptProgress,
  loadSessionHistory,
  saveSessionToHistory,
  clearSessionHistory,
  loadSettings,
  saveSettings,
  clearAllData,
  getStorageStats
};
