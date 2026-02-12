/**
 * Quiz Engine - Main API
 *
 * Primary entry point for the Quiz Engine module.
 * Provides a unified API for:
 * - Creating and managing quiz sessions
 * - Tracking mastery and proficiency
 * - Persisting and exporting progress
 *
 * Complies with North Star document:
 * - §8: Quiz Session Rules (time modes, one question at a time, no negative marking)
 * - §9: Proficiency System (bands, not percentages/scores)
 * - §10: Question Selection (CAM-allowed, mastery threshold)
 * - §11: Core Logic (no live generation, CAM-validated only)
 * - §12: Persistence (localStorage, JSON export)
 *
 * @module quiz-engine
 * @version 1.0.0
 */

'use strict';

// Core modules
const masteryTracker = require('./core/mastery-tracker');
const proficiencyCalculator = require('./core/proficiency-calculator');
const questionSelector = require('./core/question-selector');
const sessionManager = require('./core/session-manager');

// Persistence modules
const storageManager = require('./persistence/storage-manager');
const exportManager = require('./persistence/export-manager');

/**
 * Quiz Engine class - Main interface
 */
class QuizEngine {
  /**
   * Creates a new QuizEngine instance
   *
   * @param {Object} options - Engine options
   * @param {string} options.userId - User identifier (default: 'default')
   * @param {Object} options.cam - CAM data (required for full functionality)
   */
  constructor(options = {}) {
    this.userId = options.userId || 'default';
    this.cam = options.cam || null;
    this.questionBanks = new Map();
    this.currentSession = null;

    // Load progress on initialization
    this.progress = storageManager.loadProgress(this.userId);
  }

  // ============================================================
  // CAM & Question Bank Management
  // ============================================================

  /**
   * Sets the CAM data
   *
   * @param {Object} cam - CAM data object
   */
  setCAM(cam) {
    this.cam = cam;
  }

  /**
   * Registers a question bank for a topic
   *
   * @param {string} topicId - Topic ID
   * @param {Object} questionBank - Question bank data
   */
  registerQuestionBank(topicId, questionBank) {
    this.questionBanks.set(topicId, questionBank);
  }

  /**
   * Gets a question bank by topic ID
   *
   * @param {string} topicId - Topic ID
   * @returns {Object|null} Question bank or null
   */
  getQuestionBank(topicId) {
    return this.questionBanks.get(topicId) || null;
  }

  /**
   * Gets a CAM topic by ID
   *
   * @param {string} topicId - Topic ID
   * @returns {Object|null} CAM topic or null
   */
  getCAMTopic(topicId) {
    if (!this.cam || !this.cam.themes) {
      return null;
    }

    for (const theme of this.cam.themes) {
      for (const topic of theme.topics || []) {
        if (topic.topic_id === topicId) {
          return topic;
        }
      }
    }

    return null;
  }

  /**
   * Gets all topics from CAM
   *
   * @returns {Object[]} Array of topics with theme info
   */
  getAllTopics() {
    if (!this.cam || !this.cam.themes) {
      return [];
    }

    const topics = [];
    for (const theme of this.cam.themes) {
      for (const topic of theme.topics || []) {
        topics.push({
          ...topic,
          theme_id: theme.theme_id,
          theme_name: theme.theme_name
        });
      }
    }

    return topics;
  }

  // ============================================================
  // Session Management
  // ============================================================

  /**
   * Creates a new quiz session
   *
   * @param {Object} params - Session parameters
   * @param {string} params.topicId - Topic ID
   * @param {string} params.timeMode - Time mode (unlimited, 10min, 5min, 3min)
   * @param {number} params.questionCount - Number of questions (optional)
   * @param {string} params.strategy - Selection strategy (optional)
   * @returns {Object} New session object
   */
  createSession(params) {
    const { topicId, timeMode = 'unlimited', questionCount, strategy } = params;

    const questionBank = this.getQuestionBank(topicId);
    if (!questionBank) {
      throw new Error(`Question bank not found for topic: ${topicId}`);
    }

    const camTopic = this.getCAMTopic(topicId);
    if (!camTopic) {
      throw new Error(`CAM topic not found: ${topicId}`);
    }

    // Get current progress for concepts in this topic
    const conceptProgresses = {};
    for (const concept of camTopic.concepts || []) {
      if (this.progress.concepts[concept.concept_id]) {
        conceptProgresses[concept.concept_id] = this.progress.concepts[concept.concept_id];
      }
    }

    this.currentSession = sessionManager.createSession({
      topicId,
      topicName: camTopic.topic_name,
      timeMode,
      questionBank,
      camTopic,
      conceptProgresses,
      questionCount,
      strategy
    });

    return this.currentSession;
  }

  /**
   * Starts the current session
   *
   * @returns {Object} Updated session
   */
  startSession() {
    if (!this.currentSession) {
      throw new Error('No active session to start');
    }

    this.currentSession = sessionManager.startSession(this.currentSession);
    return this.currentSession;
  }

  /**
   * Gets the current question
   *
   * @returns {Object|null} Current question or null
   */
  getCurrentQuestion() {
    return this.currentSession?.current_question || null;
  }

  /**
   * Submits an answer for the current question
   *
   * @param {*} userAnswer - User's answer
   * @param {number} timeTakenMs - Time taken in milliseconds
   * @returns {Object} Result with correctness, XP, etc.
   */
  submitAnswer(userAnswer, timeTakenMs = 0) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const currentQuestion = this.currentSession.current_question;
    if (!currentQuestion) {
      throw new Error('No current question');
    }

    // Get or create concept progress
    const conceptId = currentQuestion.concept_id;
    const camTopic = this.getCAMTopic(this.currentSession.config.topic_id);
    const camConcept = camTopic?.concepts?.find(c => c.concept_id === conceptId);
    const allowedDifficulties = camConcept?.difficulty_levels || ['familiarity'];

    const conceptProgress = storageManager.getOrCreateConceptProgress(
      this.progress,
      conceptId,
      allowedDifficulties
    );

    // Submit answer
    const result = sessionManager.submitAnswer(
      this.currentSession,
      { userAnswer, timeTakenMs },
      conceptProgress
    );

    // Update session
    this.currentSession = result.session;

    // Update and save progress
    this.progress = storageManager.updateConceptProgress(
      this.progress,
      result.conceptProgress,
      camTopic
    );
    storageManager.saveProgress(this.progress);

    // Return result for display
    return {
      isCorrect: result.answer.is_correct,
      xpEarned: result.answer.xp_earned,
      correctAnswer: currentQuestion.correct_answer,
      explanation: this.getQuestionBank(this.currentSession.config.topic_id)?.canonical_explanation,
      masteryAchieved: result.masteryResult?.masteryAchieved || false,
      isSessionComplete: result.isSessionComplete,
      sessionProgress: {
        answered: this.currentSession.progress.questions_answered,
        total: this.currentSession.questions.length,
        correct: this.currentSession.progress.questions_correct,
        xp: this.currentSession.progress.xp_earned
      }
    };
  }

  /**
   * Skips the current question
   *
   * @returns {Object} Updated session info
   */
  skipQuestion() {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession = sessionManager.skipQuestion(this.currentSession);

    return {
      skipped: true,
      isSessionComplete: this.currentSession.status === 'completed',
      nextQuestion: this.currentSession.current_question
    };
  }

  /**
   * Pauses the current session
   *
   * @param {number} elapsedMs - Time elapsed so far
   * @returns {Object} Updated session
   */
  pauseSession(elapsedMs) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession = sessionManager.pauseSession(this.currentSession, elapsedMs);
    return this.currentSession;
  }

  /**
   * Resumes a paused session
   *
   * @returns {Object} Updated session
   */
  resumeSession() {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession = sessionManager.resumeSession(this.currentSession);
    return this.currentSession;
  }

  /**
   * Ends the current session
   *
   * @param {boolean} completed - Whether completed normally
   * @returns {Object} Session summary
   */
  endSession(completed = false) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession = sessionManager.endSession(this.currentSession, completed);
    const summary = sessionManager.getSessionSummary(this.currentSession);

    // Save to session history
    storageManager.saveSessionToHistory(summary);

    return summary;
  }

  /**
   * Gets the current session
   *
   * @returns {Object|null} Current session or null
   */
  getSession() {
    return this.currentSession;
  }

  // ============================================================
  // Progress & Proficiency
  // ============================================================

  /**
   * Gets progress for a specific concept
   *
   * @param {string} conceptId - Concept ID
   * @returns {Object|null} Concept progress or null
   */
  getConceptProgress(conceptId) {
    return this.progress.concepts[conceptId] || null;
  }

  /**
   * Gets progress for a specific topic
   *
   * @param {string} topicId - Topic ID
   * @returns {Object|null} Topic progress or null
   */
  getTopicProgress(topicId) {
    // If cached, return it
    if (this.progress.topics[topicId]) {
      return this.progress.topics[topicId];
    }

    // Calculate on demand
    const camTopic = this.getCAMTopic(topicId);
    if (!camTopic) {
      return null;
    }

    const concepts = camTopic.concepts || [];
    const conceptProgresses = concepts
      .map(c => this.progress.concepts[c.concept_id])
      .filter(Boolean);

    return proficiencyCalculator.createTopicProgress(topicId, conceptProgresses, concepts);
  }

  /**
   * Gets proficiency band for a topic
   *
   * @param {string} topicId - Topic ID
   * @returns {Object} Proficiency result
   */
  getTopicProficiency(topicId) {
    const camTopic = this.getCAMTopic(topicId);
    if (!camTopic) {
      return {
        band: proficiencyCalculator.PROFICIENCY_BANDS.NOT_STARTED,
        label: proficiencyCalculator.BAND_LABELS.not_started,
        level: 0
      };
    }

    const concepts = camTopic.concepts || [];
    const conceptProgresses = concepts
      .map(c => this.progress.concepts[c.concept_id])
      .filter(Boolean);

    return proficiencyCalculator.calculateTopicProficiency(conceptProgresses, concepts);
  }

  /**
   * Gets mastery status for a concept
   *
   * @param {string} conceptId - Concept ID
   * @returns {Object|null} Mastery status or null
   */
  getConceptMastery(conceptId) {
    const conceptProgress = this.progress.concepts[conceptId];
    if (!conceptProgress) {
      return null;
    }

    return masteryTracker.getMasteryStatus(conceptProgress);
  }

  /**
   * Gets total XP earned
   *
   * @returns {number} Total XP
   */
  getTotalXP() {
    return this.progress.total_xp || 0;
  }

  /**
   * Gets overall progress summary
   *
   * @returns {Object} Progress summary
   */
  getProgressSummary() {
    return exportManager.createProgressSummary(this.progress);
  }

  // ============================================================
  // Persistence & Export
  // ============================================================

  /**
   * Saves current progress
   *
   * @returns {boolean} Success status
   */
  saveProgress() {
    return storageManager.saveProgress(this.progress);
  }

  /**
   * Reloads progress from storage
   *
   * @returns {Object} Reloaded progress
   */
  reloadProgress() {
    this.progress = storageManager.loadProgress(this.userId);
    return this.progress;
  }

  /**
   * Exports all data as JSON
   *
   * @param {Object} options - Export options
   * @returns {Object} Export data
   */
  exportData(options = {}) {
    return exportManager.createExport(options);
  }

  /**
   * Exports data as JSON string
   *
   * @param {boolean} pretty - Pretty print
   * @returns {string} JSON string
   */
  exportToJson(pretty = true) {
    const data = this.exportData();
    return exportManager.exportToJson(data, pretty);
  }

  /**
   * Imports data from export
   *
   * @param {Object} data - Import data
   * @param {Object} options - Import options
   * @returns {Object} Import result
   */
  importData(data, options = {}) {
    const result = exportManager.importData(data, options);

    if (result.success && result.imported.progress) {
      this.progress = storageManager.loadProgress(this.userId);
    }

    return result;
  }

  /**
   * Gets session history
   *
   * @returns {Object[]} Session history
   */
  getSessionHistory() {
    return storageManager.loadSessionHistory();
  }

  /**
   * Clears all data (for testing/reset)
   *
   * @returns {boolean} Success status
   */
  clearAllData() {
    const result = storageManager.clearAllData();
    if (result) {
      this.progress = storageManager.createEmptyProgress(this.userId);
      this.currentSession = null;
    }
    return result;
  }

  /**
   * Gets storage statistics
   *
   * @returns {Object} Storage stats
   */
  getStorageStats() {
    return storageManager.getStorageStats();
  }
}

// ============================================================
// Factory Function & Constants Export
// ============================================================

/**
 * Creates a new QuizEngine instance
 *
 * @param {Object} options - Engine options
 * @returns {QuizEngine} New engine instance
 */
function createQuizEngine(options = {}) {
  return new QuizEngine(options);
}

// Export class, factory, and constants
module.exports = {
  QuizEngine,
  createQuizEngine,

  // Constants
  TIME_MODES: sessionManager.TIME_MODES,
  SESSION_STATUS: sessionManager.SESSION_STATUS,
  PROFICIENCY_BANDS: proficiencyCalculator.PROFICIENCY_BANDS,
  BAND_LABELS: proficiencyCalculator.BAND_LABELS,
  XP_VALUES: masteryTracker.XP_VALUES,
  MASTERY_THRESHOLD: masteryTracker.MASTERY_THRESHOLD,
  DIFFICULTY_ORDER: masteryTracker.DIFFICULTY_ORDER,
  SELECTION_STRATEGIES: questionSelector.SELECTION_STRATEGIES,

  // Utility functions
  getBandMessage: proficiencyCalculator.getBandMessage,
  generateExportFilename: exportManager.generateExportFilename
};
