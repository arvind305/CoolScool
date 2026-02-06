/**
 * Quiz Engine Class
 *
 * Main orchestrator class that provides a high-level API for quiz functionality.
 * Manages CAM data, question banks, sessions, and progress.
 */

import type {
  CAM,
  CAMTopic,
  CAMTheme,
  QuestionBank,
  QuizSession,
  UserProgress,
  ConceptProgress,
  TopicProficiency,
  SessionSummary,
  TimeMode,
  SelectionStrategy,
  ExportData,
  ExportOptions,
  ImportResult,
  StorageAdapter,
  QuizEngineOptions,
  CreateSessionParams,
  AnswerSubmitResult,
  SkipResult,
  Difficulty,
} from './types';

import {
  createConceptProgress,
  getOrCreateConceptProgress,
} from './mastery-tracker';
import {
  calculateTopicProficiency,
  createTopicProgress,
  getBandMessage,
  PROFICIENCY_BANDS,
  BAND_LABELS,
} from './proficiency-calculator';
import {
  createSession,
  startSession,
  submitAnswer,
  skipQuestion,
  endSession,
  getSessionSummary,
  isSessionTimedOut,
  updateSessionTime,
  TIME_MODES,
  SESSION_STATUS,
} from './session-manager';
import { LocalStorageAdapter, APIStorageAdapter } from './storage';
import { createExport, importData as importExportData, downloadExport } from './export-manager';

/**
 * Gets or creates concept progress from user progress
 */
function getOrCreateConceptProgressFromUser(
  progress: UserProgress,
  conceptId: string,
  allowedDifficulties: Difficulty[]
): ConceptProgress {
  if (progress.concepts[conceptId]) {
    return progress.concepts[conceptId];
  }
  const newProgress = createConceptProgress(conceptId, allowedDifficulties);
  progress.concepts[conceptId] = newProgress;
  return newProgress;
}

/**
 * Updates concept progress and recalculates topic progress
 */
function updateConceptProgressInUser(
  progress: UserProgress,
  conceptProgress: ConceptProgress,
  camTopic: CAMTopic | null
): UserProgress {
  const conceptId = conceptProgress.concept_id;
  const topicId = conceptId.substring(0, 6); // Extract topic ID from concept ID

  progress.concepts[conceptId] = conceptProgress;
  progress.total_xp = Object.values(progress.concepts).reduce(
    (sum, c) => sum + (c.xp_earned || 0),
    0
  );

  // Recalculate topic progress if CAM topic is available
  if (camTopic) {
    const topicConcepts = camTopic.concepts || [];
    const topicConceptProgresses = topicConcepts
      .map((c) => progress.concepts[c.concept_id])
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
 * Main Quiz Engine class
 */
export class QuizEngine {
  private userId: string;
  private cam: CAM | null = null;
  private questionBanks: Map<string, QuestionBank> = new Map();
  private currentSession: QuizSession | null = null;
  private progress: UserProgress | null = null;
  private storageAdapter: StorageAdapter;
  private initialized: boolean = false;

  // Board/class context
  private board: string;
  private classLevel: number;
  private subject: string;

  constructor(options: QuizEngineOptions = {}) {
    this.userId = options.userId || 'anonymous';
    this.cam = options.cam || null;
    this.board = options.board || 'icse';
    this.classLevel = options.classLevel || 5;
    this.subject = options.subject || 'mathematics';

    // Use provided adapter or create appropriate one
    if (options.storageAdapter) {
      this.storageAdapter = options.storageAdapter;
    } else if (this.userId === 'anonymous') {
      this.storageAdapter = new LocalStorageAdapter(this.userId, {
        board: this.board,
        class_level: this.classLevel,
        subject: this.subject,
      });
    } else {
      this.storageAdapter = new APIStorageAdapter({
        userId: this.userId,
        board: this.board,
        classLevel: this.classLevel,
        subject: this.subject,
      });
    }
  }

  /**
   * Initializes the engine by loading progress
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.progress = await this.storageAdapter.loadProgress(this.userId);
    this.initialized = true;
  }

  /**
   * Ensures the engine is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ============================================================
  // CAM & Question Bank Management
  // ============================================================

  /**
   * Sets the Curriculum Aligned Map
   */
  setCAM(cam: CAM): void {
    this.cam = cam;
  }

  /**
   * Gets the current CAM
   */
  getCAM(): CAM | null {
    return this.cam;
  }

  /**
   * Registers a question bank for a topic
   */
  registerQuestionBank(topicId: string, questionBank: QuestionBank): void {
    this.questionBanks.set(topicId, questionBank);
  }

  /**
   * Gets a question bank by topic ID
   */
  getQuestionBank(topicId: string): QuestionBank | null {
    return this.questionBanks.get(topicId) || null;
  }

  /**
   * Gets a CAM topic by ID
   */
  getCAMTopic(topicId: string): CAMTopic | null {
    if (!this.cam?.themes) return null;

    for (const theme of this.cam.themes) {
      for (const topic of theme.topics || []) {
        if (topic.topic_id === topicId) return topic;
      }
    }
    return null;
  }

  /**
   * Gets all topics from the CAM
   */
  getAllTopics(): (CAMTopic & { theme_id: string; theme_name: string })[] {
    if (!this.cam?.themes) return [];

    const topics: (CAMTopic & { theme_id: string; theme_name: string })[] = [];
    for (const theme of this.cam.themes) {
      for (const topic of theme.topics || []) {
        topics.push({
          ...topic,
          theme_id: theme.theme_id,
          theme_name: theme.theme_name,
        });
      }
    }
    return topics;
  }

  /**
   * Gets all themes from the CAM
   */
  getAllThemes(): CAMTheme[] {
    if (!this.cam?.themes) return [];
    return this.cam.themes.map((theme) => ({
      theme_id: theme.theme_id,
      theme_name: theme.theme_name,
      theme_order: theme.theme_order,
      topics: theme.topics || [],
    }));
  }

  // ============================================================
  // Session Management
  // ============================================================

  /**
   * Creates a new quiz session
   */
  async createSession(params: CreateSessionParams): Promise<QuizSession> {
    await this.ensureInitialized();

    const { topicId, timeMode = 'unlimited', questionCount, strategy } = params;

    const questionBank = this.getQuestionBank(topicId);
    if (!questionBank) {
      throw new Error(`Question bank not found for topic: ${topicId}`);
    }

    const camTopic = this.getCAMTopic(topicId);
    if (!camTopic) {
      throw new Error(`CAM topic not found: ${topicId}`);
    }

    // Gather concept progresses for this topic
    const conceptProgresses: Record<string, ConceptProgress> = {};
    for (const concept of camTopic.concepts || []) {
      if (this.progress?.concepts[concept.concept_id]) {
        conceptProgresses[concept.concept_id] =
          this.progress.concepts[concept.concept_id];
      }
    }

    this.currentSession = createSession({
      topicId,
      topicName: camTopic.topic_name,
      timeMode,
      questionBank,
      camTopic,
      conceptProgresses,
      questionCount,
      strategy,
      board: this.board,
      classLevel: this.classLevel,
      subject: this.subject,
    });

    return this.currentSession;
  }

  /**
   * Starts the current session
   */
  startSession(): QuizSession {
    if (!this.currentSession) {
      throw new Error('No active session to start');
    }
    this.currentSession = startSession(this.currentSession);
    return this.currentSession;
  }

  /**
   * Gets the current question
   */
  getCurrentQuestion() {
    return this.currentSession?.current_question || null;
  }

  /**
   * Submits an answer for the current question
   */
  async submitAnswer(
    userAnswer: string | string[] | Record<string, string>,
    timeTakenMs: number = 0
  ): Promise<AnswerSubmitResult> {
    await this.ensureInitialized();

    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const currentQuestion = this.currentSession.current_question;
    if (!currentQuestion) {
      throw new Error('No current question');
    }

    const conceptId = currentQuestion.concept_id;
    const camTopic = this.getCAMTopic(this.currentSession.config.topic_id);
    const camConcept = camTopic?.concepts?.find((c) => c.concept_id === conceptId);
    const allowedDifficulties = camConcept?.difficulty_levels || ['familiarity'];

    const conceptProgress = getOrCreateConceptProgressFromUser(
      this.progress!,
      conceptId,
      allowedDifficulties
    );

    const result = submitAnswer(
      this.currentSession,
      { userAnswer, timeTakenMs },
      conceptProgress
    );

    this.currentSession = result.session;
    this.progress = updateConceptProgressInUser(
      this.progress!,
      result.conceptProgress,
      camTopic
    );

    // Persist progress in background (non-blocking)
    // Progress is kept in memory and will be saved; this prevents slow API from blocking UI
    this.storageAdapter.saveProgress(this.progress!).catch((error) => {
      console.error('Failed to save progress:', error);
    });

    return {
      isCorrect: result.answer.is_correct,
      xpEarned: result.answer.xp_earned,
      correctAnswer: currentQuestion.correct_answer,
      explanation: result.answer.is_correct
        ? currentQuestion.explanation_correct || this.getQuestionBank(this.currentSession.config.topic_id)?.canonical_explanation
        : currentQuestion.explanation_incorrect || this.getQuestionBank(this.currentSession.config.topic_id)?.canonical_explanation,
      masteryAchieved: result.masteryResult?.masteryAchieved || false,
      isSessionComplete: result.isSessionComplete,
      sessionProgress: {
        answered: this.currentSession.progress.questions_answered,
        total: this.currentSession.questions.length,
        correct: this.currentSession.progress.questions_correct,
        xp: this.currentSession.progress.xp_earned,
      },
    };
  }

  /**
   * Skips the current question
   */
  skipQuestion(): SkipResult {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession = skipQuestion(this.currentSession);

    return {
      skipped: true,
      isSessionComplete: this.currentSession.status === 'completed',
      nextQuestion: this.currentSession.current_question,
    };
  }

  /**
   * Ends the current session
   * Note: Session history is saved in the background (non-blocking) to ensure
   * fast result display even with slow network/cold server starts.
   */
  async endSession(completed: boolean = false): Promise<SessionSummary> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession = endSession(this.currentSession, completed);
    const summary = getSessionSummary(this.currentSession);

    // Save to session history in background (non-blocking)
    // This prevents slow API responses from blocking the results display
    this.storageAdapter.saveSessionToHistory(summary).catch((error) => {
      console.error('Failed to save session to history:', error);
    });

    return summary;
  }

  /**
   * Gets the current session
   */
  getSession(): QuizSession | null {
    return this.currentSession;
  }

  /**
   * Checks if the session has timed out
   */
  isSessionTimedOut(currentElapsedMs: number): boolean {
    if (!this.currentSession) return false;
    return isSessionTimedOut(this.currentSession, currentElapsedMs);
  }

  /**
   * Updates the session's elapsed time
   */
  updateSessionTime(elapsedMs: number): void {
    if (!this.currentSession) return;
    this.currentSession = updateSessionTime(this.currentSession, elapsedMs);
  }

  // ============================================================
  // Progress & Proficiency
  // ============================================================

  /**
   * Gets the proficiency for a topic
   */
  async getTopicProficiency(topicId: string): Promise<TopicProficiency> {
    await this.ensureInitialized();

    const camTopic = this.getCAMTopic(topicId);
    if (!camTopic) {
      return {
        band: 'not_started',
        label: BAND_LABELS['not_started'],
        level: 0,
        stats: null,
      };
    }

    const concepts = camTopic.concepts || [];
    const conceptProgresses = concepts
      .map((c) => this.progress?.concepts[c.concept_id])
      .filter(Boolean) as ConceptProgress[];

    return calculateTopicProficiency(conceptProgresses, concepts);
  }

  /**
   * Gets the total XP
   */
  async getTotalXP(): Promise<number> {
    await this.ensureInitialized();
    return this.progress?.total_xp || 0;
  }

  /**
   * Gets the user progress
   */
  async getProgress(): Promise<UserProgress | null> {
    await this.ensureInitialized();
    return this.progress;
  }

  /**
   * Saves progress manually
   */
  async saveProgress(): Promise<boolean> {
    if (!this.progress) return false;
    return this.storageAdapter.saveProgress(this.progress);
  }

  /**
   * Reloads progress from storage
   */
  async reloadProgress(): Promise<UserProgress | null> {
    this.progress = await this.storageAdapter.loadProgress(this.userId);
    return this.progress;
  }

  // ============================================================
  // Session History
  // ============================================================

  /**
   * Gets the session history
   */
  async getSessionHistory(): Promise<SessionSummary[]> {
    return this.storageAdapter.loadSessionHistory();
  }

  // ============================================================
  // Export/Import
  // ============================================================

  /**
   * Creates an export of the data
   */
  async exportData(options: ExportOptions = {}): Promise<ExportData> {
    return createExport(this.storageAdapter, this.userId, options);
  }

  /**
   * Downloads the export as a JSON file
   */
  async downloadExport(filename?: string): Promise<void> {
    const exportData = await this.exportData();
    downloadExport(exportData, filename);
  }

  /**
   * Imports data
   */
  async importData(
    data: unknown,
    options: { overwrite?: boolean } = {}
  ): Promise<ImportResult> {
    const result = await importExportData(this.storageAdapter, data, options);
    if (result.success) {
      // Reload progress after import
      await this.reloadProgress();
    }
    return result;
  }

  // ============================================================
  // Storage Stats & Clear
  // ============================================================

  /**
   * Gets storage statistics
   */
  async getStorageStats() {
    return this.storageAdapter.getStorageStats();
  }

  /**
   * Clears all data
   */
  async clearAllData(): Promise<boolean> {
    const result = await this.storageAdapter.clearAllData();
    if (result) {
      this.progress = await this.storageAdapter.loadProgress(this.userId);
      this.currentSession = null;
    }
    return result;
  }

  // ============================================================
  // Context Management
  // ============================================================

  /**
   * Sets the board/class context
   */
  setContext(options: {
    board?: string;
    classLevel?: number;
    subject?: string;
  }): void {
    if (options.board) this.board = options.board;
    if (options.classLevel) this.classLevel = options.classLevel;
    if (options.subject) this.subject = options.subject;

    // Update API adapter context if applicable
    if (this.storageAdapter instanceof APIStorageAdapter) {
      this.storageAdapter.setContext(options);
    }

    // Reset initialized to reload progress for new context
    this.initialized = false;
  }

  /**
   * Gets the current context
   */
  getContext(): { board: string; classLevel: number; subject: string } {
    return {
      board: this.board,
      classLevel: this.classLevel,
      subject: this.subject,
    };
  }
}

// ============================================================
// Factory Function
// ============================================================

/**
 * Creates a new QuizEngine instance
 */
export function createQuizEngine(options: QuizEngineOptions = {}): QuizEngine {
  return new QuizEngine(options);
}

// ============================================================
// Re-export Constants
// ============================================================

export { TIME_MODES, SESSION_STATUS, PROFICIENCY_BANDS, BAND_LABELS, getBandMessage };
