/**
 * Quiz Engine Type Definitions
 *
 * Core types for the quiz engine including mastery tracking,
 * proficiency calculation, question selection, and session management.
 */

// ============================================================
// Difficulty & Mastery Types
// ============================================================

export type Difficulty = 'familiarity' | 'application' | 'exam_style';

export interface XPConfig {
  familiarity: number;
  application: number;
  exam_style: number;
}

export interface MasteryThreshold {
  required_correct: number;
  window_size: number;
}

export interface DifficultyMastery {
  attempts: number;
  correct: number;
  streak: number;
  mastered: boolean;
  mastered_at: string | null;
  recent_attempts: boolean[];
}

export interface QuestionHistoryEntry {
  question_id: string;
  difficulty: Difficulty;
  is_correct: boolean;
  xp_earned: number;
  attempted_at: string;
  time_taken_ms: number;
}

export interface ConceptProgress {
  concept_id: string;
  current_difficulty: Difficulty;
  mastery_by_difficulty: Record<Difficulty, DifficultyMastery>;
  total_attempts: number;
  total_correct: number;
  xp_earned: number;
  last_attempted_at: string | null;
  question_history: QuestionHistoryEntry[];
}

export interface AttemptInput {
  questionId: string;
  difficulty: Difficulty;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface AttemptResult {
  conceptProgress: ConceptProgress;
  xpEarned: number;
  masteryAchieved: boolean;
  newDifficulty: Difficulty;
}

// ============================================================
// Proficiency Band Types
// ============================================================

export type ProficiencyBand =
  | 'not_started'
  | 'building_familiarity'
  | 'growing_confidence'
  | 'consistent_understanding'
  | 'exam_ready';

export interface ProficiencyStats {
  conceptsStarted: number;
  familiarityMastered: number;
  familiarityMasteredPct: number;
  applicationMastered: number;
  applicationMasteredPct: number;
  applicationStarted: number;
  applicationStartedPct: number;
  examStyleMastered: number;
  examStyleMasteredPct: number;
  examStyleStarted: number;
  examStyleStartedPct: number;
}

export interface TopicProficiency {
  band: ProficiencyBand;
  label: string;
  level: number;
  stats: {
    concepts_total: number;
    concepts_started: number;
  } | null;
}

export interface TopicProgress {
  topic_id: string;
  proficiency_band: ProficiencyBand;
  proficiency_label: string;
  proficiency_level: number;
  concepts_count: number;
  concepts_started: number;
  total_attempts: number;
  total_correct: number;
  xp_earned: number;
  last_attempted_at: string | null;
}

export interface DifficultyStatus {
  mastered: boolean;
  progress: string;
  attempts: number;
  correct: number;
  streak: number;
}

export interface MasteryStatus {
  concept_id: string;
  current_difficulty: Difficulty;
  total_xp: number;
  difficulties: Record<string, DifficultyStatus>;
}

// ============================================================
// Question Types
// ============================================================

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'ordering';

export interface Question {
  question_id: string;
  concept_id: string;
  difficulty: Difficulty;
  type: QuestionType;
  question_text: string;
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
}

export interface EnrichedQuestion extends Question {
  eligible: boolean;
  is_recommended: boolean;
  priority_score: number;
  concept_progress: ConceptProgress | null;
  order_in_session?: number;
  status?: 'pending' | 'answered' | 'skipped';
}

export interface QuestionBank {
  topic_id: string;
  questions: Question[];
  canonical_explanation?: string;
}

// ============================================================
// CAM (Curriculum Aligned Map) Types
// ============================================================

export interface CAMConcept {
  concept_id: string;
  concept_name: string;
  difficulty_levels: Difficulty[];
}

export interface CAMTopic {
  topic_id: string;
  topic_name: string;
  topic_order: number;
  concepts: CAMConcept[];
}

export interface CAMTheme {
  theme_id: string;
  theme_name: string;
  theme_order: number;
  topics: CAMTopic[];
}

export interface CAM {
  cam_version: string;
  board: string;
  class_level: number;
  subject: string;
  themes: CAMTheme[];
}

// ============================================================
// Session Types
// ============================================================

export type SessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'abandoned';

export type TimeMode = 'unlimited' | '10min' | '5min' | '3min';

export interface SessionConfig {
  time_mode: TimeMode;
  time_limit_ms: number | null;
  topic_id: string;
  topic_name: string;
  question_count: number;
  // Board/class context
  board?: string;
  class_level?: number;
  subject?: string;
}

export interface SessionProgress {
  questions_answered: number;
  questions_correct: number;
  xp_earned: number;
  current_question_index: number;
  time_elapsed_ms: number;
  time_remaining_ms: number | null;
}

export interface SessionAnswer {
  question_id: string;
  user_answer: string | string[];
  is_correct: boolean;
  xp_earned: number;
  time_taken_ms: number;
  answered_at: string;
}

export interface QuizSession {
  version: string;
  session_id: string;
  status: SessionStatus;
  config: SessionConfig;
  progress: SessionProgress;
  questions: EnrichedQuestion[];
  current_question: EnrichedQuestion | null;
  answers: SessionAnswer[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
}

export interface SessionSummary {
  session_id: string;
  topic_id: string;
  topic_name: string;
  time_mode: TimeMode;
  status: SessionStatus;
  total_questions: number;
  questions_answered: number;
  questions_correct: number;
  questions_skipped: number;
  xp_earned: number;
  time_elapsed_ms: number;
  started_at: string | null;
  completed_at: string | null;
  // Board/class context
  board?: string;
  class_level?: number;
  subject?: string;
}

export interface AnswerInput {
  userAnswer: string | string[];
  timeTakenMs?: number;
}

export interface SubmitAnswerResult {
  session: QuizSession;
  answer: SessionAnswer;
  conceptProgress: ConceptProgress;
  masteryResult: AttemptResult | null;
  isSessionComplete: boolean;
}

// ============================================================
// Selection Strategy Types
// ============================================================

export type SelectionStrategy = 'adaptive' | 'sequential' | 'random' | 'review';

export interface SelectQuestionsParams {
  questionBank: QuestionBank;
  camTopic: CAMTopic;
  conceptProgresses?: Record<string, ConceptProgress>;
  count?: number | null;
  strategy?: SelectionStrategy;
}

export interface NextQuestionResult {
  question: EnrichedQuestion;
  index: number;
  remaining: number;
}

// ============================================================
// Storage Types
// ============================================================

export interface CAMReference {
  cam_version: string;
  board: string;
  class_level: number;
  subject: string;
}

export interface UserProgress {
  version: string;
  user_id: string;
  cam_reference: CAMReference;
  concepts: Record<string, ConceptProgress>;
  topics: Record<string, TopicProgress>;
  total_xp: number;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  sound_enabled?: boolean;
  preferred_time_mode?: TimeMode;
}

export interface StorageStats {
  has_progress: boolean;
  concepts_tracked: number;
  topics_tracked: number;
  total_xp: number;
  sessions_count: number;
  storage_available: boolean;
}

// ============================================================
// Export/Import Types
// ============================================================

export interface ExportData {
  export_version: string;
  app_name: string;
  exported_at: string;
  data: {
    progress?: UserProgress;
    sessions?: SessionSummary[];
    settings?: UserSettings;
  };
  metadata: {
    concepts_count: number;
    total_xp: number;
  };
}

export interface ExportOptions {
  includeProgress?: boolean;
  includeSessions?: boolean;
  includeSettings?: boolean;
}

export interface ImportOptions {
  overwrite?: boolean;
}

export interface ImportResult {
  success: boolean;
  errors?: string[];
  imported?: {
    progress?: boolean;
    sessions?: boolean;
    settings?: boolean;
  };
}

// ============================================================
// Storage Adapter Interface
// ============================================================

export interface StorageAdapter {
  // Progress operations
  loadProgress(userId: string): Promise<UserProgress | null>;
  saveProgress(progress: UserProgress): Promise<boolean>;

  // Session history operations
  loadSessionHistory(): Promise<SessionSummary[]>;
  saveSessionToHistory(summary: SessionSummary): Promise<boolean>;

  // Settings operations
  loadSettings(): Promise<UserSettings | null>;
  saveSettings(settings: UserSettings): Promise<boolean>;

  // Clear operations
  clearAllData(): Promise<boolean>;

  // Stats
  getStorageStats(): Promise<StorageStats>;
}

// ============================================================
// Quiz Engine Options
// ============================================================

export interface QuizEngineOptions {
  userId?: string;
  cam?: CAM | null;
  storageAdapter?: StorageAdapter;
  // Board/class context
  board?: string;
  classLevel?: number;
  subject?: string;
}

export interface CreateSessionParams {
  topicId: string;
  timeMode?: TimeMode;
  questionCount?: number;
  strategy?: SelectionStrategy;
}

export interface AnswerSubmitResult {
  isCorrect: boolean;
  xpEarned: number;
  correctAnswer: string | string[];
  explanation?: string;
  masteryAchieved: boolean;
  isSessionComplete: boolean;
  sessionProgress: {
    answered: number;
    total: number;
    correct: number;
    xp: number;
  };
}

export interface SkipResult {
  skipped: boolean;
  isSessionComplete: boolean;
  nextQuestion: EnrichedQuestion | null;
}
