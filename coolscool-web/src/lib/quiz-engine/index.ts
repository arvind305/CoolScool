/**
 * Quiz Engine Module
 *
 * Main exports for the quiz engine functionality.
 */

// Main class and factory
export { QuizEngine, createQuizEngine } from './quiz-engine';

// Types
export type {
  // Difficulty & Mastery
  Difficulty,
  XPConfig,
  MasteryThreshold,
  DifficultyMastery,
  QuestionHistoryEntry,
  ConceptProgress,
  AttemptInput,
  AttemptResult,
  MasteryStatus,
  DifficultyStatus,

  // Proficiency
  ProficiencyBand,
  ProficiencyStats,
  TopicProficiency,
  TopicProgress,

  // Questions
  QuestionType,
  Question,
  EnrichedQuestion,
  QuestionBank,

  // CAM
  CAMConcept,
  CAMTopic,
  CAMTheme,
  CAM,

  // Session
  SessionStatus,
  TimeMode,
  SessionConfig,
  SessionProgress,
  SessionAnswer,
  QuizSession,
  SessionSummary,
  AnswerInput,
  SubmitAnswerResult,

  // Selection
  SelectionStrategy,
  SelectQuestionsParams,
  NextQuestionResult,

  // Storage
  CAMReference,
  UserProgress,
  UserSettings,
  StorageStats,
  StorageAdapter,

  // Export/Import
  ExportData,
  ExportOptions,
  ImportOptions,
  ImportResult,

  // Engine options
  QuizEngineOptions,
  CreateSessionParams,
  AnswerSubmitResult,
  SkipResult,
} from './types';

// Mastery Tracker
export {
  XP_VALUES,
  MASTERY_THRESHOLD,
  DIFFICULTY_ORDER,
  createConceptProgress,
  recordAttempt,
  getMasteryStatus,
  getRecommendedDifficulty,
  isConceptFullyMastered,
  getConceptMasteryPercentage,
  getOrCreateConceptProgress,
} from './mastery-tracker';

// Proficiency Calculator
export {
  PROFICIENCY_BANDS,
  BAND_LABELS,
  BAND_ORDER,
  calculateMasteryStats,
  calculateTopicProficiency,
  createTopicProgress,
  getBandMessage,
  getNextBand,
  getAdvancementRequirements,
} from './proficiency-calculator';

// Question Selector
export {
  SELECTION_STRATEGIES,
  selectQuestions,
  getNextQuestion,
  getPreviousQuestion,
  getQuestionsByDifficulty,
  getQuestionsByConcept,
  getQuestionStatusCounts,
} from './question-selector';

// Session Manager
export {
  SESSION_STATUS,
  TIME_MODES,
  TIME_LIMITS,
  checkAnswer,
  createSession,
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  submitAnswer,
  skipQuestion,
  getSessionSummary,
  isSessionTimedOut,
  updateSessionTime,
  getSessionAccuracy,
  getAverageTimePerQuestion,
} from './session-manager';

// Storage Adapters
export {
  LocalStorageAdapter,
  APIStorageAdapter,
  STORAGE_KEYS,
  DATA_VERSION,
  createEmptyProgress,
} from './storage';

// Export Manager
export {
  EXPORT_VERSION,
  createExport,
  exportToJson,
  generateExportFilename,
  downloadExport,
  validateImportData,
  importData,
  parseImportFile,
  mergeProgress,
} from './export-manager';
