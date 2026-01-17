/**
 * Sample Tracker Service
 *
 * Tracks free sample question usage per topic for the freemium model.
 * Anonymous users get a limited number of free samples per topic.
 * Data is persisted in localStorage.
 */

// ============================================
// CONSTANTS
// ============================================

/** Default number of free samples per topic */
export const SAMPLE_LIMIT = 3;

/** Prefix for localStorage keys */
const STORAGE_KEY_PREFIX = 'coolscool_samples_';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Gets the localStorage key for a topic
 */
function getStorageKey(topicId: string): string {
  return `${STORAGE_KEY_PREFIX}${topicId}`;
}

/**
 * Safely checks if localStorage is available (client-side only)
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const testKey = '__test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// PUBLIC FUNCTIONS
// ============================================

/**
 * Gets the number of remaining free samples for a topic
 * @param topicId - The topic identifier
 * @returns Number of remaining samples (default SAMPLE_LIMIT if not tracked)
 */
export function getSamplesRemaining(topicId: string): number {
  if (!isLocalStorageAvailable()) {
    return SAMPLE_LIMIT;
  }

  const key = getStorageKey(topicId);
  const stored = window.localStorage.getItem(key);

  if (stored === null) {
    return SAMPLE_LIMIT;
  }

  const remaining = parseInt(stored, 10);
  return isNaN(remaining) ? SAMPLE_LIMIT : Math.max(0, remaining);
}

/**
 * Records that a sample was used for a topic
 * @param topicId - The topic identifier
 * @returns The new remaining count after decrement
 */
export function recordSampleUsed(topicId: string): number {
  if (!isLocalStorageAvailable()) {
    return SAMPLE_LIMIT - 1;
  }

  const current = getSamplesRemaining(topicId);
  const newCount = Math.max(0, current - 1);

  const key = getStorageKey(topicId);
  window.localStorage.setItem(key, newCount.toString());

  return newCount;
}

/**
 * Checks if there are free samples remaining for a topic
 * @param topicId - The topic identifier
 * @returns True if samples > 0
 */
export function hasFreeSamples(topicId: string): boolean {
  return getSamplesRemaining(topicId) > 0;
}

/**
 * Resets sample usage for one topic or all topics
 * @param topicId - Optional topic to reset. If omitted, resets all topics.
 */
export function resetSamples(topicId?: string): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  if (topicId) {
    // Reset specific topic
    const key = getStorageKey(topicId);
    window.localStorage.removeItem(key);
  } else {
    // Reset all topics - find and remove all sample keys
    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key);
    });
  }
}

/**
 * Gets all sample usage data
 * @returns Record mapping topicId to remaining samples
 */
export function getAllSampleUsage(): Record<string, number> {
  if (!isLocalStorageAvailable()) {
    return {};
  }

  const usage: Record<string, number> = {};

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      const topicId = key.slice(STORAGE_KEY_PREFIX.length);
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        const remaining = parseInt(value, 10);
        if (!isNaN(remaining)) {
          usage[topicId] = remaining;
        }
      }
    }
  }

  return usage;
}
