/**
 * Quiz Engine - Browser Bundle
 *
 * Self-contained browser version of the Quiz Engine.
 * Combines all modules into a single file for use without bundlers.
 *
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  // ============================================================
  // Mastery Tracker Module
  // ============================================================

  const XP_VALUES = {
    familiarity: 10,
    application: 20,
    exam_style: 30
  };

  const MASTERY_THRESHOLD = {
    required_correct: 4,
    window_size: 5
  };

  const DIFFICULTY_ORDER = ['familiarity', 'application', 'exam_style'];

  function createConceptProgress(conceptId, allowedDifficulties) {
    const masteryByDifficulty = {};

    for (const difficulty of DIFFICULTY_ORDER) {
      if (allowedDifficulties.includes(difficulty)) {
        masteryByDifficulty[difficulty] = {
          attempts: 0,
          correct: 0,
          streak: 0,
          mastered: false,
          mastered_at: null,
          recent_attempts: []
        };
      }
    }

    const startingDifficulty = DIFFICULTY_ORDER.find(d => allowedDifficulties.includes(d)) || 'familiarity';

    return {
      concept_id: conceptId,
      current_difficulty: startingDifficulty,
      mastery_by_difficulty: masteryByDifficulty,
      total_attempts: 0,
      total_correct: 0,
      xp_earned: 0,
      last_attempted_at: null,
      question_history: []
    };
  }

  function recordAttempt(conceptProgress, attempt) {
    const { questionId, difficulty, isCorrect, timeTakenMs } = attempt;
    const now = new Date().toISOString();

    const xpEarned = isCorrect ? (XP_VALUES[difficulty] || 0) : 0;

    conceptProgress.total_attempts++;
    if (isCorrect) {
      conceptProgress.total_correct++;
    }
    conceptProgress.xp_earned += xpEarned;
    conceptProgress.last_attempted_at = now;

    const difficultyMastery = conceptProgress.mastery_by_difficulty[difficulty];
    if (difficultyMastery) {
      difficultyMastery.attempts++;
      if (isCorrect) {
        difficultyMastery.correct++;
        difficultyMastery.streak++;
      } else {
        difficultyMastery.streak = 0;
      }

      difficultyMastery.recent_attempts.push(isCorrect);
      if (difficultyMastery.recent_attempts.length > MASTERY_THRESHOLD.window_size) {
        difficultyMastery.recent_attempts.shift();
      }

      if (!difficultyMastery.mastered) {
        const recentCorrect = difficultyMastery.recent_attempts.filter(Boolean).length;
        if (difficultyMastery.recent_attempts.length >= MASTERY_THRESHOLD.window_size &&
            recentCorrect >= MASTERY_THRESHOLD.required_correct) {
          difficultyMastery.mastered = true;
          difficultyMastery.mastered_at = now;
          advanceDifficulty(conceptProgress);
        }
      }
    }

    conceptProgress.question_history.push({
      question_id: questionId,
      difficulty,
      is_correct: isCorrect,
      xp_earned: xpEarned,
      attempted_at: now,
      time_taken_ms: timeTakenMs
    });

    return {
      conceptProgress,
      xpEarned,
      masteryAchieved: difficultyMastery?.mastered && difficultyMastery?.mastered_at === now,
      newDifficulty: conceptProgress.current_difficulty
    };
  }

  function advanceDifficulty(conceptProgress) {
    const currentIndex = DIFFICULTY_ORDER.indexOf(conceptProgress.current_difficulty);

    for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
      const nextDifficulty = DIFFICULTY_ORDER[i];
      if (conceptProgress.mastery_by_difficulty[nextDifficulty]) {
        conceptProgress.current_difficulty = nextDifficulty;
        return;
      }
    }
  }

  function getMasteryStatus(conceptProgress) {
    const status = {
      concept_id: conceptProgress.concept_id,
      current_difficulty: conceptProgress.current_difficulty,
      total_xp: conceptProgress.xp_earned,
      difficulties: {}
    };

    for (const [difficulty, data] of Object.entries(conceptProgress.mastery_by_difficulty)) {
      const recentCorrect = data.recent_attempts.filter(Boolean).length;
      const recentTotal = data.recent_attempts.length;

      status.difficulties[difficulty] = {
        mastered: data.mastered,
        progress: `${recentCorrect}/${recentTotal}`,
        attempts: data.attempts,
        correct: data.correct,
        streak: data.streak
      };
    }

    return status;
  }

  function getRecommendedDifficulty(conceptProgress) {
    const currentMastery = conceptProgress.mastery_by_difficulty[conceptProgress.current_difficulty];

    if (currentMastery && currentMastery.mastered) {
      const currentIndex = DIFFICULTY_ORDER.indexOf(conceptProgress.current_difficulty);
      for (let i = currentIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
        if (conceptProgress.mastery_by_difficulty[DIFFICULTY_ORDER[i]]) {
          return DIFFICULTY_ORDER[i];
        }
      }
    }

    return conceptProgress.current_difficulty;
  }

  // ============================================================
  // Proficiency Calculator Module
  // ============================================================

  const PROFICIENCY_BANDS = {
    NOT_STARTED: 'not_started',
    BUILDING_FAMILIARITY: 'building_familiarity',
    GROWING_CONFIDENCE: 'growing_confidence',
    CONSISTENT_UNDERSTANDING: 'consistent_understanding',
    EXAM_READY: 'exam_ready'
  };

  const BAND_LABELS = {
    [PROFICIENCY_BANDS.NOT_STARTED]: 'Not Started',
    [PROFICIENCY_BANDS.BUILDING_FAMILIARITY]: 'Building Familiarity',
    [PROFICIENCY_BANDS.GROWING_CONFIDENCE]: 'Growing Confidence',
    [PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING]: 'Consistent Understanding',
    [PROFICIENCY_BANDS.EXAM_READY]: 'Exam Ready'
  };

  const BAND_ORDER = [
    PROFICIENCY_BANDS.NOT_STARTED,
    PROFICIENCY_BANDS.BUILDING_FAMILIARITY,
    PROFICIENCY_BANDS.GROWING_CONFIDENCE,
    PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING,
    PROFICIENCY_BANDS.EXAM_READY
  ];

  const BAND_THRESHOLDS = {
    BUILDING_FAMILIARITY: { min_concepts_started: 1, min_familiarity_mastered_pct: 0 },
    GROWING_CONFIDENCE: { min_familiarity_mastered_pct: 50, min_application_started_pct: 25 },
    CONSISTENT_UNDERSTANDING: { min_familiarity_mastered_pct: 100, min_application_mastered_pct: 75, min_exam_style_started_pct: 25 },
    EXAM_READY: { min_familiarity_mastered_pct: 100, min_application_mastered_pct: 100, min_exam_style_mastered_pct: 100 }
  };

  function calculateMasteryStats(conceptProgresses, camConcepts) {
    let conceptsStarted = 0;
    let familiarityMastered = 0, familiarityTotal = 0;
    let applicationMastered = 0, applicationTotal = 0, applicationStarted = 0;
    let examStyleMastered = 0, examStyleTotal = 0, examStyleStarted = 0;

    const progressMap = new Map();
    for (const progress of conceptProgresses) {
      progressMap.set(progress.concept_id, progress);
    }

    for (const concept of camConcepts) {
      const progress = progressMap.get(concept.concept_id);
      const allowedDifficulties = concept.difficulty_levels || [];

      if (allowedDifficulties.includes('familiarity')) familiarityTotal++;
      if (allowedDifficulties.includes('application')) applicationTotal++;
      if (allowedDifficulties.includes('exam_style')) examStyleTotal++;

      if (!progress || progress.total_attempts === 0) continue;

      conceptsStarted++;
      const masteryData = progress.mastery_by_difficulty || {};

      if (masteryData.familiarity?.mastered) familiarityMastered++;
      if (masteryData.application?.attempts > 0) applicationStarted++;
      if (masteryData.application?.mastered) applicationMastered++;
      if (masteryData.exam_style?.attempts > 0) examStyleStarted++;
      if (masteryData.exam_style?.mastered) examStyleMastered++;
    }

    const safePct = (num, denom) => denom > 0 ? Math.round((num / denom) * 100) : 0;

    return {
      conceptsStarted,
      familiarityMastered,
      familiarityMasteredPct: safePct(familiarityMastered, familiarityTotal),
      applicationMastered,
      applicationMasteredPct: safePct(applicationMastered, applicationTotal),
      applicationStarted,
      applicationStartedPct: safePct(applicationStarted, applicationTotal),
      examStyleMastered,
      examStyleMasteredPct: safePct(examStyleMastered, examStyleTotal),
      examStyleStarted,
      examStyleStartedPct: safePct(examStyleStarted, examStyleTotal)
    };
  }

  function calculateTopicProficiency(conceptProgresses, camConcepts) {
    const totalConcepts = camConcepts.length;

    if (totalConcepts === 0) {
      return { band: PROFICIENCY_BANDS.NOT_STARTED, label: BAND_LABELS[PROFICIENCY_BANDS.NOT_STARTED], level: 0, stats: null };
    }

    const stats = calculateMasteryStats(conceptProgresses, camConcepts);
    let band = PROFICIENCY_BANDS.NOT_STARTED;

    if (stats.familiarityMasteredPct >= 100 && stats.applicationMasteredPct >= 100 && stats.examStyleMasteredPct >= 100) {
      band = PROFICIENCY_BANDS.EXAM_READY;
    } else if (stats.familiarityMasteredPct >= 100 && stats.applicationMasteredPct >= 75 && stats.examStyleStartedPct >= 25) {
      band = PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING;
    } else if (stats.familiarityMasteredPct >= 50 && stats.applicationStartedPct >= 25) {
      band = PROFICIENCY_BANDS.GROWING_CONFIDENCE;
    } else if (stats.conceptsStarted >= 1) {
      band = PROFICIENCY_BANDS.BUILDING_FAMILIARITY;
    }

    return {
      band,
      label: BAND_LABELS[band],
      level: BAND_ORDER.indexOf(band),
      stats: { concepts_total: totalConcepts, concepts_started: stats.conceptsStarted }
    };
  }

  function createTopicProgress(topicId, conceptProgresses, camConcepts) {
    const proficiency = calculateTopicProficiency(conceptProgresses, camConcepts);

    let totalAttempts = 0, totalCorrect = 0, totalXp = 0, lastAttemptedAt = null;

    for (const progress of conceptProgresses) {
      totalAttempts += progress.total_attempts || 0;
      totalCorrect += progress.total_correct || 0;
      totalXp += progress.xp_earned || 0;
      if (progress.last_attempted_at && (!lastAttemptedAt || progress.last_attempted_at > lastAttemptedAt)) {
        lastAttemptedAt = progress.last_attempted_at;
      }
    }

    return {
      topic_id: topicId,
      proficiency_band: proficiency.band,
      proficiency_label: proficiency.label,
      proficiency_level: proficiency.level,
      concepts_count: camConcepts.length,
      concepts_started: proficiency.stats?.concepts_started || 0,
      total_attempts: totalAttempts,
      total_correct: totalCorrect,
      xp_earned: totalXp,
      last_attempted_at: lastAttemptedAt
    };
  }

  function getBandMessage(band) {
    const messages = {
      [PROFICIENCY_BANDS.NOT_STARTED]: 'Ready to start exploring this topic!',
      [PROFICIENCY_BANDS.BUILDING_FAMILIARITY]: 'You\'re getting to know these concepts!',
      [PROFICIENCY_BANDS.GROWING_CONFIDENCE]: 'Your understanding is growing stronger!',
      [PROFICIENCY_BANDS.CONSISTENT_UNDERSTANDING]: 'You\'re showing consistent understanding!',
      [PROFICIENCY_BANDS.EXAM_READY]: 'You\'re well prepared for this topic!'
    };
    return messages[band] || messages[PROFICIENCY_BANDS.NOT_STARTED];
  }

  // ============================================================
  // Question Selector Module
  // ============================================================

  const SELECTION_STRATEGIES = {
    ADAPTIVE: 'adaptive',
    SEQUENTIAL: 'sequential',
    RANDOM: 'random',
    REVIEW: 'review'
  };

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function calculatePriorityScore(question, progress, isRecommended) {
    let score = 0;
    if (isRecommended) score += 100;

    if (!progress) {
      score += 50;
    } else {
      score += Math.max(0, 20 - progress.total_attempts);
      const difficultyMastery = progress.mastery_by_difficulty?.[question.difficulty];
      if (difficultyMastery && !difficultyMastery.mastered) score += 30;
      if (difficultyMastery?.streak > 0) score += Math.min(10, difficultyMastery.streak * 2);
    }

    score += Math.random() * 10;
    return score;
  }

  function buildQuestionPool(questions, concepts, conceptProgresses) {
    const conceptMap = new Map();
    for (const concept of concepts) {
      conceptMap.set(concept.concept_id, concept);
    }

    return questions.map(question => {
      const concept = conceptMap.get(question.concept_id);
      const progress = conceptProgresses[question.concept_id];
      const allowedDifficulties = concept?.difficulty_levels || [];
      const isDifficultyAllowed = allowedDifficulties.includes(question.difficulty);
      const recommendedDifficulty = progress ? getRecommendedDifficulty(progress) : 'familiarity';
      const isRecommended = question.difficulty === recommendedDifficulty;
      const priorityScore = calculatePriorityScore(question, progress, isRecommended);

      return {
        ...question,
        eligible: isDifficultyAllowed,
        is_recommended: isRecommended,
        priority_score: priorityScore,
        concept_progress: progress || null
      };
    }).filter(q => q.eligible);
  }

  function groupAndInterleave(questions, key) {
    const groups = new Map();
    for (const q of questions) {
      const groupKey = q[key];
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(q);
    }

    const result = [];
    const groupArrays = Array.from(groups.values());
    const indices = groupArrays.map(() => 0);

    let added = true;
    while (added) {
      added = false;
      for (let i = 0; i < groupArrays.length; i++) {
        if (indices[i] < groupArrays[i].length) {
          result.push(groupArrays[i][indices[i]]);
          indices[i]++;
          added = true;
        }
      }
    }

    return result;
  }

  function selectQuestions(params) {
    const { questionBank, camTopic, conceptProgresses = {}, count = null, strategy = SELECTION_STRATEGIES.ADAPTIVE } = params;
    const allQuestions = questionBank.questions || [];
    const concepts = camTopic.concepts || [];

    if (allQuestions.length === 0) return [];

    const questionPool = buildQuestionPool(allQuestions, concepts, conceptProgresses);
    let selectedQuestions;

    switch (strategy) {
      case SELECTION_STRATEGIES.SEQUENTIAL:
        selectedQuestions = [...questionPool].sort((a, b) => {
          if (a.concept_id !== b.concept_id) return a.concept_id.localeCompare(b.concept_id);
          return DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty);
        });
        break;
      case SELECTION_STRATEGIES.RANDOM:
        selectedQuestions = shuffleArray([...questionPool]);
        break;
      case SELECTION_STRATEGIES.ADAPTIVE:
      default:
        const sorted = [...questionPool].sort((a, b) => b.priority_score - a.priority_score);
        selectedQuestions = groupAndInterleave(sorted, 'concept_id');
        break;
    }

    const limit = count || selectedQuestions.length;
    return selectedQuestions.slice(0, limit).map((q, index) => ({
      ...q,
      order_in_session: index,
      status: 'pending'
    }));
  }

  function getNextQuestion(sessionQuestions, currentIndex) {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionQuestions.length) return null;
    return { question: sessionQuestions[nextIndex], index: nextIndex, remaining: sessionQuestions.length - nextIndex - 1 };
  }

  // ============================================================
  // Session Manager Module
  // ============================================================

  const SESSION_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ABANDONED: 'abandoned'
  };

  const TIME_MODES = {
    UNLIMITED: 'unlimited',
    TEN_MIN: '10min',
    FIVE_MIN: '5min',
    THREE_MIN: '3min'
  };

  const TIME_LIMITS = {
    [TIME_MODES.UNLIMITED]: null,
    [TIME_MODES.TEN_MIN]: 10 * 60 * 1000,
    [TIME_MODES.FIVE_MIN]: 5 * 60 * 1000,
    [TIME_MODES.THREE_MIN]: 3 * 60 * 1000
  };

  function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `sess_${timestamp}_${random}`;
  }

  function createSession(params) {
    const { topicId, topicName, timeMode = TIME_MODES.UNLIMITED, questionBank, camTopic, conceptProgresses = {}, questionCount = null, strategy = 'adaptive' } = params;
    const now = new Date().toISOString();

    const questions = selectQuestions({ questionBank, camTopic, conceptProgresses, count: questionCount, strategy });

    return {
      version: '1.0.0',
      session_id: generateSessionId(),
      status: SESSION_STATUS.NOT_STARTED,
      config: {
        time_mode: timeMode,
        time_limit_ms: TIME_LIMITS[timeMode],
        topic_id: topicId,
        topic_name: topicName,
        question_count: questions.length
      },
      progress: {
        questions_answered: 0,
        questions_correct: 0,
        xp_earned: 0,
        current_question_index: 0,
        time_elapsed_ms: 0,
        time_remaining_ms: TIME_LIMITS[timeMode]
      },
      questions,
      current_question: questions.length > 0 ? questions[0] : null,
      answers: [],
      created_at: now,
      started_at: null,
      completed_at: null,
      paused_at: null
    };
  }

  function startSession(session) {
    if (session.status !== SESSION_STATUS.NOT_STARTED) {
      throw new Error(`Cannot start session in status: ${session.status}`);
    }
    return { ...session, status: SESSION_STATUS.IN_PROGRESS, started_at: new Date().toISOString() };
  }

  function checkAnswer(userAnswer, question) {
    const correctAnswer = question.correct_answer;

    switch (question.type) {
      case 'mcq':
      case 'true_false':
        return String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase();
      case 'fill_blank':
        return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
      case 'ordering':
        if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) return false;
        if (userAnswer.length !== correctAnswer.length) return false;
        return userAnswer.every((item, i) => item === correctAnswer[i]);
      default:
        return userAnswer === correctAnswer;
    }
  }

  function submitAnswer(session, answer, conceptProgress) {
    if (session.status !== SESSION_STATUS.IN_PROGRESS) {
      throw new Error(`Cannot submit answer in status: ${session.status}`);
    }

    const currentQuestion = session.current_question;
    if (!currentQuestion) throw new Error('No current question to answer');

    const { userAnswer, timeTakenMs = 0 } = answer;
    const now = new Date().toISOString();
    const isCorrect = checkAnswer(userAnswer, currentQuestion);
    const xpEarned = isCorrect ? (XP_VALUES[currentQuestion.difficulty] || 0) : 0;

    const sessionAnswer = {
      question_id: currentQuestion.question_id,
      user_answer: userAnswer,
      is_correct: isCorrect,
      xp_earned: xpEarned,
      time_taken_ms: timeTakenMs,
      answered_at: now
    };

    let updatedConceptProgress = conceptProgress;
    let masteryResult = null;

    if (conceptProgress) {
      masteryResult = recordAttempt(conceptProgress, {
        questionId: currentQuestion.question_id,
        difficulty: currentQuestion.difficulty,
        isCorrect,
        timeTakenMs
      });
      updatedConceptProgress = masteryResult.conceptProgress;
    }

    const newAnswers = [...session.answers, sessionAnswer];
    const newQuestionsAnswered = session.progress.questions_answered + 1;
    const newQuestionsCorrect = session.progress.questions_correct + (isCorrect ? 1 : 0);
    const newXpEarned = session.progress.xp_earned + xpEarned;
    const newQuestionIndex = session.progress.current_question_index + 1;

    const updatedQuestions = session.questions.map((q, i) =>
      i === session.progress.current_question_index ? { ...q, status: 'answered' } : q
    );

    const nextQuestionResult = getNextQuestion(session.questions, session.progress.current_question_index);
    const isComplete = !nextQuestionResult;

    return {
      session: {
        ...session,
        status: isComplete ? SESSION_STATUS.COMPLETED : SESSION_STATUS.IN_PROGRESS,
        progress: {
          ...session.progress,
          questions_answered: newQuestionsAnswered,
          questions_correct: newQuestionsCorrect,
          xp_earned: newXpEarned,
          current_question_index: isComplete ? newQuestionIndex : nextQuestionResult.index
        },
        questions: updatedQuestions,
        current_question: nextQuestionResult?.question || null,
        answers: newAnswers,
        completed_at: isComplete ? now : null
      },
      answer: sessionAnswer,
      conceptProgress: updatedConceptProgress,
      masteryResult,
      isSessionComplete: isComplete
    };
  }

  function skipQuestion(session) {
    if (session.status !== SESSION_STATUS.IN_PROGRESS) {
      throw new Error(`Cannot skip question in status: ${session.status}`);
    }

    const currentQuestion = session.current_question;
    if (!currentQuestion) throw new Error('No current question to skip');

    const updatedQuestions = session.questions.map((q, i) =>
      i === session.progress.current_question_index ? { ...q, status: 'skipped' } : q
    );

    const nextQuestionResult = getNextQuestion(session.questions, session.progress.current_question_index);
    const isComplete = !nextQuestionResult;

    return {
      ...session,
      status: isComplete ? SESSION_STATUS.COMPLETED : SESSION_STATUS.IN_PROGRESS,
      progress: {
        ...session.progress,
        current_question_index: isComplete ? session.progress.current_question_index + 1 : nextQuestionResult.index
      },
      questions: updatedQuestions,
      current_question: nextQuestionResult?.question || null,
      completed_at: isComplete ? new Date().toISOString() : null
    };
  }

  function endSession(session, completed = false) {
    return {
      ...session,
      status: completed ? SESSION_STATUS.COMPLETED : SESSION_STATUS.ABANDONED,
      completed_at: new Date().toISOString()
    };
  }

  function getSessionSummary(session) {
    const totalQuestions = session.questions.length;
    const answered = session.answers.length;
    const correct = session.progress.questions_correct;
    const skipped = session.questions.filter(q => q.status === 'skipped').length;

    return {
      session_id: session.session_id,
      topic_id: session.config.topic_id,
      topic_name: session.config.topic_name,
      time_mode: session.config.time_mode,
      status: session.status,
      total_questions: totalQuestions,
      questions_answered: answered,
      questions_correct: correct,
      questions_skipped: skipped,
      xp_earned: session.progress.xp_earned,
      time_elapsed_ms: session.progress.time_elapsed_ms,
      started_at: session.started_at,
      completed_at: session.completed_at
    };
  }

  function isSessionTimedOut(session, currentElapsedMs) {
    if (!session.config.time_limit_ms) return false;
    return currentElapsedMs >= session.config.time_limit_ms;
  }

  // ============================================================
  // Storage Manager Module
  // ============================================================

  const STORAGE_KEYS = {
    PROGRESS: 'coolscool_progress',
    SESSIONS: 'coolscool_sessions',
    SETTINGS: 'coolscool_settings'
  };

  const DATA_VERSION = '1.0.0';

  function isLocalStorageAvailable() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  let memoryStorage = {};

  function getItem(key) {
    try {
      let value = isLocalStorageAvailable() ? localStorage.getItem(key) : memoryStorage[key];
      if (value === null || value === undefined) return null;
      return JSON.parse(value);
    } catch (e) {
      console.error(`Error reading from storage: ${key}`, e);
      return null;
    }
  }

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

  function removeItem(key) {
    try {
      if (isLocalStorageAvailable()) {
        localStorage.removeItem(key);
      } else {
        delete memoryStorage[key];
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function createEmptyProgress(userId) {
    return {
      version: DATA_VERSION,
      user_id: userId,
      cam_reference: { cam_version: '1.0.0', board: 'ICSE', class: 5, subject: 'Mathematics' },
      concepts: {},
      topics: {},
      total_xp: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function loadProgress(userId = 'default') {
    const stored = getItem(STORAGE_KEYS.PROGRESS);
    if (!stored) return createEmptyProgress(userId);
    if (stored.user_id && stored.user_id !== userId) return createEmptyProgress(userId);
    return stored;
  }

  function saveProgress(progress) {
    progress.updated_at = new Date().toISOString();
    return setItem(STORAGE_KEYS.PROGRESS, progress);
  }

  function updateConceptProgress(progress, conceptProgress, camTopic) {
    const conceptId = conceptProgress.concept_id;
    const topicId = conceptId.substring(0, 6);

    progress.concepts[conceptId] = conceptProgress;
    progress.total_xp = Object.values(progress.concepts).reduce((sum, c) => sum + (c.xp_earned || 0), 0);

    if (camTopic) {
      const topicConcepts = camTopic.concepts || [];
      const topicConceptProgresses = topicConcepts.map(c => progress.concepts[c.concept_id]).filter(Boolean);
      progress.topics[topicId] = createTopicProgress(topicId, topicConceptProgresses, topicConcepts);
    }

    return progress;
  }

  function getOrCreateConceptProgress(progress, conceptId, allowedDifficulties) {
    if (progress.concepts[conceptId]) return progress.concepts[conceptId];
    const newProgress = createConceptProgress(conceptId, allowedDifficulties);
    progress.concepts[conceptId] = newProgress;
    return newProgress;
  }

  function loadSessionHistory() {
    return getItem(STORAGE_KEYS.SESSIONS) || [];
  }

  function saveSessionToHistory(sessionSummary) {
    const history = loadSessionHistory();
    history.unshift(sessionSummary);
    return setItem(STORAGE_KEYS.SESSIONS, history.slice(0, 100));
  }

  function clearAllData() {
    removeItem(STORAGE_KEYS.PROGRESS);
    removeItem(STORAGE_KEYS.SESSIONS);
    removeItem(STORAGE_KEYS.SETTINGS);
    memoryStorage = {};
    return true;
  }

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

  // ============================================================
  // Export Manager Module
  // ============================================================

  const EXPORT_VERSION = '1.0.0';

  function createExport(options = {}) {
    const { includeProgress = true, includeSessions = true, includeSettings = true } = options;
    const exportData = {
      export_version: EXPORT_VERSION,
      app_name: 'Cool S-Cool Pressure-free Curriculum Practice',
      exported_at: new Date().toISOString(),
      data: {}
    };

    if (includeProgress) exportData.data.progress = loadProgress();
    if (includeSessions) exportData.data.sessions = loadSessionHistory();

    exportData.metadata = {
      concepts_count: includeProgress ? Object.keys(exportData.data.progress?.concepts || {}).length : 0,
      total_xp: includeProgress ? (exportData.data.progress?.total_xp || 0) : 0
    };

    return exportData;
  }

  function exportToJson(exportData, pretty = true) {
    return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
  }

  function generateExportFilename() {
    const date = new Date().toISOString().split('T')[0];
    return `coolscool-progress-${date}.json`;
  }

  function importData(importData, options = {}) {
    const { overwrite = true } = options;

    if (!importData || !importData.data) {
      return { success: false, errors: ['Invalid import data format'] };
    }

    try {
      if (importData.data.progress && overwrite) {
        saveProgress(importData.data.progress);
      }
      return { success: true, imported: { progress: true } };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  // ============================================================
  // Main Quiz Engine Class
  // ============================================================

  class QuizEngine {
    constructor(options = {}) {
      this.userId = options.userId || 'default';
      this.cam = options.cam || null;
      this.questionBanks = new Map();
      this.currentSession = null;
      this.progress = loadProgress(this.userId);
    }

    setCAM(cam) {
      this.cam = cam;
    }

    registerQuestionBank(topicId, questionBank) {
      this.questionBanks.set(topicId, questionBank);
    }

    getQuestionBank(topicId) {
      return this.questionBanks.get(topicId) || null;
    }

    getCAMTopic(topicId) {
      if (!this.cam || !this.cam.themes) return null;
      for (const theme of this.cam.themes) {
        for (const topic of theme.topics || []) {
          if (topic.topic_id === topicId) return topic;
        }
      }
      return null;
    }

    getAllTopics() {
      if (!this.cam || !this.cam.themes) return [];
      const topics = [];
      for (const theme of this.cam.themes) {
        for (const topic of theme.topics || []) {
          topics.push({ ...topic, theme_id: theme.theme_id, theme_name: theme.theme_name });
        }
      }
      return topics;
    }

    getAllThemes() {
      if (!this.cam || !this.cam.themes) return [];
      return this.cam.themes.map(theme => ({
        theme_id: theme.theme_id,
        theme_name: theme.theme_name,
        theme_order: theme.theme_order,
        topics: theme.topics || []
      }));
    }

    createSession(params) {
      const { topicId, timeMode = 'unlimited', questionCount, strategy } = params;

      const questionBank = this.getQuestionBank(topicId);
      if (!questionBank) throw new Error(`Question bank not found for topic: ${topicId}`);

      const camTopic = this.getCAMTopic(topicId);
      if (!camTopic) throw new Error(`CAM topic not found: ${topicId}`);

      const conceptProgresses = {};
      for (const concept of camTopic.concepts || []) {
        if (this.progress.concepts[concept.concept_id]) {
          conceptProgresses[concept.concept_id] = this.progress.concepts[concept.concept_id];
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
        strategy
      });

      return this.currentSession;
    }

    startSession() {
      if (!this.currentSession) throw new Error('No active session to start');
      this.currentSession = startSession(this.currentSession);
      return this.currentSession;
    }

    getCurrentQuestion() {
      return this.currentSession?.current_question || null;
    }

    submitAnswer(userAnswer, timeTakenMs = 0) {
      if (!this.currentSession) throw new Error('No active session');

      const currentQuestion = this.currentSession.current_question;
      if (!currentQuestion) throw new Error('No current question');

      const conceptId = currentQuestion.concept_id;
      const camTopic = this.getCAMTopic(this.currentSession.config.topic_id);
      const camConcept = camTopic?.concepts?.find(c => c.concept_id === conceptId);
      const allowedDifficulties = camConcept?.difficulty_levels || ['familiarity'];

      const conceptProgress = getOrCreateConceptProgress(this.progress, conceptId, allowedDifficulties);

      const result = submitAnswer(
        this.currentSession,
        { userAnswer, timeTakenMs },
        conceptProgress
      );

      this.currentSession = result.session;
      this.progress = updateConceptProgress(this.progress, result.conceptProgress, camTopic);
      saveProgress(this.progress);

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

    skipQuestion() {
      if (!this.currentSession) throw new Error('No active session');

      this.currentSession = skipQuestion(this.currentSession);

      return {
        skipped: true,
        isSessionComplete: this.currentSession.status === 'completed',
        nextQuestion: this.currentSession.current_question
      };
    }

    endSession(completed = false) {
      if (!this.currentSession) throw new Error('No active session');

      this.currentSession = endSession(this.currentSession, completed);
      const summary = getSessionSummary(this.currentSession);
      saveSessionToHistory(summary);

      return summary;
    }

    getSession() {
      return this.currentSession;
    }

    getTopicProficiency(topicId) {
      const camTopic = this.getCAMTopic(topicId);
      if (!camTopic) {
        return { band: PROFICIENCY_BANDS.NOT_STARTED, label: BAND_LABELS.not_started, level: 0 };
      }

      const concepts = camTopic.concepts || [];
      const conceptProgresses = concepts.map(c => this.progress.concepts[c.concept_id]).filter(Boolean);

      return calculateTopicProficiency(conceptProgresses, concepts);
    }

    getTotalXP() {
      return this.progress.total_xp || 0;
    }

    saveProgress() {
      return saveProgress(this.progress);
    }

    reloadProgress() {
      this.progress = loadProgress(this.userId);
      return this.progress;
    }

    exportData(options = {}) {
      return createExport(options);
    }

    exportToJson(pretty = true) {
      return exportToJson(this.exportData(), pretty);
    }

    importData(data, options = {}) {
      const result = importData(data, options);
      if (result.success) {
        this.progress = loadProgress(this.userId);
      }
      return result;
    }

    getSessionHistory() {
      return loadSessionHistory();
    }

    clearAllData() {
      const result = clearAllData();
      if (result) {
        this.progress = createEmptyProgress(this.userId);
        this.currentSession = null;
      }
      return result;
    }

    getStorageStats() {
      return getStorageStats();
    }

    isSessionTimedOut(currentElapsedMs) {
      if (!this.currentSession) return false;
      return isSessionTimedOut(this.currentSession, currentElapsedMs);
    }

    updateSessionTime(elapsedMs) {
      if (!this.currentSession) return;
      this.currentSession.progress.time_elapsed_ms = elapsedMs;
      if (this.currentSession.config.time_limit_ms) {
        this.currentSession.progress.time_remaining_ms = Math.max(0, this.currentSession.config.time_limit_ms - elapsedMs);
      }
    }
  }

  // ============================================================
  // Factory Function
  // ============================================================

  function createQuizEngine(options = {}) {
    return new QuizEngine(options);
  }

  // ============================================================
  // Export to Global
  // ============================================================

  global.QuizEngine = {
    QuizEngine,
    createQuizEngine,
    TIME_MODES,
    SESSION_STATUS,
    PROFICIENCY_BANDS,
    BAND_LABELS,
    XP_VALUES,
    MASTERY_THRESHOLD,
    DIFFICULTY_ORDER,
    SELECTION_STRATEGIES,
    getBandMessage,
    generateExportFilename
  };

})(typeof window !== 'undefined' ? window : global);
