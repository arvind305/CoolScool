/**
 * Export Manager Module
 *
 * Handles data export and import functionality for backup/restore.
 */

import type {
  ExportData,
  ExportOptions,
  ImportOptions,
  ImportResult,
  UserProgress,
  SessionSummary,
  UserSettings,
  StorageAdapter,
} from './types';

// ============================================================
// Constants
// ============================================================

export const EXPORT_VERSION = '1.0.0';
export const APP_NAME = 'Cool S-Cool Pressure-free Curriculum Practice';

// ============================================================
// Export Functions
// ============================================================

/**
 * Creates an export data object from the storage adapter
 *
 * @param adapter - Storage adapter to export from
 * @param userId - User ID for loading progress
 * @param options - Export options
 * @returns Export data object
 */
export async function createExport(
  adapter: StorageAdapter,
  userId: string,
  options: ExportOptions = {}
): Promise<ExportData> {
  const {
    includeProgress = true,
    includeSessions = true,
    includeSettings = true,
  } = options;

  const exportData: ExportData = {
    export_version: EXPORT_VERSION,
    app_name: APP_NAME,
    exported_at: new Date().toISOString(),
    data: {},
    metadata: {
      concepts_count: 0,
      total_xp: 0,
    },
  };

  if (includeProgress) {
    const progress = await adapter.loadProgress(userId);
    if (progress) {
      exportData.data.progress = progress;
      exportData.metadata.concepts_count = Object.keys(progress.concepts).length;
      exportData.metadata.total_xp = progress.total_xp;
    }
  }

  if (includeSessions) {
    exportData.data.sessions = await adapter.loadSessionHistory();
  }

  if (includeSettings) {
    const settings = await adapter.loadSettings();
    if (settings) {
      exportData.data.settings = settings;
    }
  }

  return exportData;
}

/**
 * Converts export data to a JSON string
 *
 * @param exportData - Export data object
 * @param pretty - Whether to pretty-print the JSON
 * @returns JSON string
 */
export function exportToJson(exportData: ExportData, pretty: boolean = true): string {
  return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * Generates a filename for the export
 *
 * @returns Filename with date
 */
export function generateExportFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `coolscool-progress-${date}.json`;
}

/**
 * Triggers a browser download of the export data
 *
 * @param exportData - Export data object
 * @param filename - Optional custom filename
 */
export function downloadExport(
  exportData: ExportData,
  filename?: string
): void {
  if (typeof window === 'undefined') {
    throw new Error('Download is only available in browser environment');
  }

  const json = exportToJson(exportData);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || generateExportFilename();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================================
// Import Functions
// ============================================================

/**
 * Validates import data structure
 *
 * @param data - Data to validate
 * @returns Validation result with errors if any
 */
export function validateImportData(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid data format: expected object'] };
  }

  const exportData = data as Partial<ExportData>;

  if (!exportData.export_version) {
    errors.push('Missing export_version field');
  }

  if (!exportData.data) {
    errors.push('Missing data field');
  }

  if (exportData.data?.progress) {
    const progress = exportData.data.progress;
    if (!progress.user_id) {
      errors.push('Missing user_id in progress data');
    }
    if (typeof progress.concepts !== 'object') {
      errors.push('Invalid concepts data in progress');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Imports data into the storage adapter
 *
 * @param adapter - Storage adapter to import into
 * @param importData - Data to import
 * @param options - Import options
 * @returns Import result
 */
export async function importData(
  adapter: StorageAdapter,
  importData: unknown,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const { overwrite = true } = options;

  // Validate the import data
  const validation = validateImportData(importData);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const exportData = importData as ExportData;

  try {
    const imported: ImportResult['imported'] = {};

    // Import progress
    if (exportData.data.progress && overwrite) {
      const saved = await adapter.saveProgress(exportData.data.progress);
      if (saved) {
        imported.progress = true;
      }
    }

    // Import sessions (append to existing)
    if (exportData.data.sessions) {
      for (const session of exportData.data.sessions) {
        await adapter.saveSessionToHistory(session);
      }
      imported.sessions = true;
    }

    // Import settings
    if (exportData.data.settings && overwrite) {
      const saved = await adapter.saveSettings(exportData.data.settings);
      if (saved) {
        imported.settings = true;
      }
    }

    return { success: true, imported };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown import error'],
    };
  }
}

/**
 * Parses a JSON file from a File input
 *
 * @param file - File to parse
 * @returns Parsed data or error
 */
export async function parseImportFile(
  file: File
): Promise<{ data: unknown; error: string | null }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        resolve({ data, error: null });
      } catch {
        resolve({ data: null, error: 'Invalid JSON file' });
      }
    };

    reader.onerror = () => {
      resolve({ data: null, error: 'Error reading file' });
    };

    reader.readAsText(file);
  });
}

// ============================================================
// Merge Functions
// ============================================================

/**
 * Merges two progress objects, keeping the more advanced state
 *
 * @param existing - Existing progress
 * @param imported - Imported progress
 * @returns Merged progress
 */
export function mergeProgress(
  existing: UserProgress,
  imported: UserProgress
): UserProgress {
  const merged = { ...existing };

  // Merge concepts - keep the one with more XP/attempts
  for (const [conceptId, importedConcept] of Object.entries(imported.concepts)) {
    const existingConcept = existing.concepts[conceptId];

    if (
      !existingConcept ||
      importedConcept.xp_earned > existingConcept.xp_earned
    ) {
      merged.concepts[conceptId] = importedConcept;
    }
  }

  // Recalculate total XP
  merged.total_xp = Object.values(merged.concepts).reduce(
    (sum, c) => sum + (c.xp_earned || 0),
    0
  );

  merged.updated_at = new Date().toISOString();

  return merged;
}
