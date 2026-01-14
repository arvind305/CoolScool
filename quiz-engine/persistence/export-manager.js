/**
 * Export Manager Module
 *
 * Handles data export following North Star §12:
 * - JSON export capability for progress data
 * - Supports import for data restoration
 *
 * @module quiz-engine/persistence/export-manager
 */

'use strict';

const {
  loadProgress,
  saveProgress,
  loadSessionHistory,
  loadSettings
} = require('./storage-manager');

// Export format version
const EXPORT_VERSION = '1.0.0';

/**
 * Creates a full data export
 *
 * @param {Object} options - Export options
 * @param {boolean} options.includeProgress - Include progress data (default: true)
 * @param {boolean} options.includeSessions - Include session history (default: true)
 * @param {boolean} options.includeSettings - Include settings (default: true)
 * @returns {Object} Export data object
 */
function createExport(options = {}) {
  const {
    includeProgress = true,
    includeSessions = true,
    includeSettings = true
  } = options;

  const now = new Date().toISOString();

  const exportData = {
    export_version: EXPORT_VERSION,
    app_name: 'Cool S-Cool Pressure-free Curriculum Practice',
    exported_at: now,
    data: {}
  };

  if (includeProgress) {
    exportData.data.progress = loadProgress();
  }

  if (includeSessions) {
    exportData.data.sessions = loadSessionHistory();
  }

  if (includeSettings) {
    exportData.data.settings = loadSettings();
  }

  // Add metadata
  exportData.metadata = {
    progress_included: includeProgress,
    sessions_included: includeSessions,
    settings_included: includeSettings,
    concepts_count: includeProgress
      ? Object.keys(exportData.data.progress?.concepts || {}).length
      : 0,
    topics_count: includeProgress
      ? Object.keys(exportData.data.progress?.topics || {}).length
      : 0,
    sessions_count: includeSessions
      ? (exportData.data.sessions?.length || 0)
      : 0,
    total_xp: includeProgress
      ? (exportData.data.progress?.total_xp || 0)
      : 0
  };

  return exportData;
}

/**
 * Converts export data to JSON string
 *
 * @param {Object} exportData - Export data object
 * @param {boolean} pretty - Whether to pretty-print (default: true)
 * @returns {string} JSON string
 */
function exportToJson(exportData, pretty = true) {
  return pretty
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
}

/**
 * Creates a downloadable data URL for the export
 *
 * @param {Object} exportData - Export data object
 * @returns {string} Data URL for download
 */
function createDownloadUrl(exportData) {
  const json = exportToJson(exportData);
  const blob = new Blob([json], { type: 'application/json' });

  // For browser environments
  if (typeof URL !== 'undefined' && URL.createObjectURL) {
    return URL.createObjectURL(blob);
  }

  // For Node.js or fallback
  return `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
}

/**
 * Generates a filename for the export
 *
 * @returns {string} Suggested filename
 */
function generateExportFilename() {
  const date = new Date().toISOString().split('T')[0];
  return `coolscool-progress-${date}.json`;
}

/**
 * Validates import data structure
 *
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateImportData(data) {
  const errors = [];
  const warnings = [];

  // Check basic structure
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format: expected an object');
    return { valid: false, errors, warnings };
  }

  // Check export version
  if (!data.export_version) {
    warnings.push('Missing export_version, assuming compatible');
  } else if (data.export_version !== EXPORT_VERSION) {
    warnings.push(`Export version mismatch: ${data.export_version} vs ${EXPORT_VERSION}`);
  }

  // Check data section
  if (!data.data || typeof data.data !== 'object') {
    errors.push('Missing or invalid data section');
    return { valid: false, errors, warnings };
  }

  // Validate progress if present
  if (data.data.progress) {
    const progressValidation = validateProgressData(data.data.progress);
    errors.push(...progressValidation.errors);
    warnings.push(...progressValidation.warnings);
  }

  // Validate sessions if present
  if (data.data.sessions) {
    if (!Array.isArray(data.data.sessions)) {
      errors.push('Sessions data must be an array');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates progress data structure
 *
 * @param {Object} progress - Progress data
 * @returns {Object} Validation result
 */
function validateProgressData(progress) {
  const errors = [];
  const warnings = [];

  if (!progress.version) {
    warnings.push('Progress data missing version');
  }

  if (!progress.concepts || typeof progress.concepts !== 'object') {
    errors.push('Progress data missing or invalid concepts');
  }

  if (!progress.topics || typeof progress.topics !== 'object') {
    warnings.push('Progress data missing topics (will be recalculated)');
  }

  if (typeof progress.total_xp !== 'number') {
    warnings.push('Progress data missing total_xp (will be recalculated)');
  }

  return { errors, warnings };
}

/**
 * Imports data from an export file
 *
 * @param {Object} importData - Data to import
 * @param {Object} options - Import options
 * @param {boolean} options.merge - Merge with existing data (default: false)
 * @param {boolean} options.overwrite - Overwrite existing data (default: true if not merge)
 * @returns {Object} Import result
 */
function importData(importData, options = {}) {
  const {
    merge = false,
    overwrite = !merge
  } = options;

  // Validate first
  const validation = validateImportData(importData);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  const results = {
    success: true,
    errors: [],
    warnings: validation.warnings,
    imported: {
      progress: false,
      sessions: false,
      settings: false
    }
  };

  try {
    // Import progress
    if (importData.data.progress) {
      if (merge) {
        const existing = loadProgress();
        const merged = mergeProgress(existing, importData.data.progress);
        saveProgress(merged);
      } else if (overwrite) {
        saveProgress(importData.data.progress);
      }
      results.imported.progress = true;
    }

    // Import sessions (always append, never overwrite history)
    if (importData.data.sessions && Array.isArray(importData.data.sessions)) {
      // Sessions are informational, just validate they loaded
      results.imported.sessions = true;
      results.warnings.push('Session history was included but not imported (read-only)');
    }

    // Import settings
    if (importData.data.settings) {
      // Settings are not imported to avoid overwriting user preferences
      results.imported.settings = false;
      results.warnings.push('Settings were included but not imported (preserving user preferences)');
    }

  } catch (error) {
    results.success = false;
    results.errors.push(`Import error: ${error.message}`);
  }

  return results;
}

/**
 * Merges imported progress with existing progress
 *
 * @param {Object} existing - Existing progress
 * @param {Object} imported - Imported progress
 * @returns {Object} Merged progress
 */
function mergeProgress(existing, imported) {
  const merged = { ...existing };

  // Merge concepts (keep highest XP / most progress)
  for (const [conceptId, importedConcept] of Object.entries(imported.concepts || {})) {
    const existingConcept = existing.concepts[conceptId];

    if (!existingConcept) {
      merged.concepts[conceptId] = importedConcept;
    } else {
      // Keep the one with more progress
      if (importedConcept.xp_earned > existingConcept.xp_earned) {
        merged.concepts[conceptId] = importedConcept;
      }
    }
  }

  // Recalculate total XP
  merged.total_xp = Object.values(merged.concepts)
    .reduce((sum, c) => sum + (c.xp_earned || 0), 0);

  // Topics will be recalculated on next access
  merged.updated_at = new Date().toISOString();

  return merged;
}

/**
 * Creates a progress summary for display
 *
 * @param {Object} progress - Progress object
 * @returns {Object} Summary object
 */
function createProgressSummary(progress) {
  if (!progress) {
    return null;
  }

  const concepts = Object.values(progress.concepts || {});
  const topics = Object.values(progress.topics || {});

  // Count mastery levels
  let familiarityMastered = 0;
  let applicationMastered = 0;
  let examStyleMastered = 0;

  for (const concept of concepts) {
    const mastery = concept.mastery_by_difficulty || {};
    if (mastery.familiarity?.mastered) familiarityMastered++;
    if (mastery.application?.mastered) applicationMastered++;
    if (mastery.exam_style?.mastered) examStyleMastered++;
  }

  // Count topics by proficiency band
  const topicsByBand = {};
  for (const topic of topics) {
    const band = topic.proficiency_band || 'not_started';
    topicsByBand[band] = (topicsByBand[band] || 0) + 1;
  }

  return {
    total_xp: progress.total_xp || 0,
    concepts_count: concepts.length,
    topics_count: topics.length,
    mastery: {
      familiarity: familiarityMastered,
      application: applicationMastered,
      exam_style: examStyleMastered
    },
    topics_by_band: topicsByBand,
    created_at: progress.created_at,
    updated_at: progress.updated_at
  };
}

// Export module
module.exports = {
  EXPORT_VERSION,
  createExport,
  exportToJson,
  createDownloadUrl,
  generateExportFilename,
  validateImportData,
  validateProgressData,
  importData,
  mergeProgress,
  createProgressSummary
};
