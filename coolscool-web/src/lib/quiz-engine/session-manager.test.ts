/**
 * Session Manager Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
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
  checkAnswer,
  SESSION_STATUS,
  TIME_MODES,
  TIME_LIMITS,
} from './session-manager';
import { createConceptProgress } from './mastery-tracker';
import type { QuestionBank, CAMTopic, EnrichedQuestion } from './types';

// Mock data helpers
function createMockQuestionBank(): QuestionBank {
  return {
    topic_id: 'T01.01',
    questions: [
      {
        question_id: 'Q001',
        concept_id: 'T01.01C01',
        difficulty: 'familiarity',
        type: 'mcq',
        question_text: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correct_answer: 'B',
      },
      {
        question_id: 'Q002',
        concept_id: 'T01.01C01',
        difficulty: 'familiarity',
        type: 'true_false',
        question_text: 'Is 2 + 2 = 4?',
        correct_answer: 'true',
      },
      {
        question_id: 'Q003',
        concept_id: 'T01.01C02',
        difficulty: 'application',
        type: 'fill_blank',
        question_text: 'The sum of 2 and 2 is ___',
        correct_answer: '4',
      },
    ],
    canonical_explanation: 'Basic addition',
  };
}

function createMockCAMTopic(): CAMTopic {
  return {
    topic_id: 'T01.01',
    topic_name: 'Addition Basics',
    topic_order: 1,
    concepts: [
      {
        concept_id: 'T01.01C01',
        concept_name: 'Simple Addition',
        difficulty_levels: ['familiarity', 'application'],
      },
      {
        concept_id: 'T01.01C02',
        concept_name: 'Addition Properties',
        difficulty_levels: ['familiarity', 'application'],
      },
    ],
  };
}

describe('Session Manager', () => {
  describe('createSession', () => {
    it('should create a session with default options', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      expect(session.session_id).toMatch(/^sess_/);
      expect(session.status).toBe('not_started');
      expect(session.config.topic_id).toBe('T01.01');
      expect(session.config.time_mode).toBe('unlimited');
      expect(session.questions.length).toBeGreaterThan(0);
      expect(session.current_question).not.toBeNull();
    });

    it('should create a session with time limit', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        timeMode: '5min',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      expect(session.config.time_mode).toBe('5min');
      expect(session.config.time_limit_ms).toBe(TIME_LIMITS['5min']);
      expect(session.progress.time_remaining_ms).toBe(TIME_LIMITS['5min']);
    });

    it('should create a session with limited question count', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionCount: 2,
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      expect(session.questions).toHaveLength(2);
    });

    it('should include board/class context in session config', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
        board: 'icse',
        classLevel: 5,
        subject: 'mathematics',
      });

      expect(session.config.board).toBe('icse');
      expect(session.config.class_level).toBe(5);
      expect(session.config.subject).toBe('mathematics');
    });
  });

  describe('Session State Transitions', () => {
    it('should start a session', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);

      expect(started.status).toBe('in_progress');
      expect(started.started_at).not.toBeNull();
    });

    it('should throw when starting non-NOT_STARTED session', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);

      expect(() => startSession(started)).toThrow();
    });

    it('should pause an in-progress session', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const paused = pauseSession(started);

      expect(paused.status).toBe('paused');
      expect(paused.paused_at).not.toBeNull();
    });

    it('should resume a paused session', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const paused = pauseSession(started);
      const resumed = resumeSession(paused);

      expect(resumed.status).toBe('in_progress');
      expect(resumed.paused_at).toBeNull();
    });

    it('should end a session as completed', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const ended = endSession(started, true);

      expect(ended.status).toBe('completed');
      expect(ended.completed_at).not.toBeNull();
    });

    it('should end a session as abandoned', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const ended = endSession(started, false);

      expect(ended.status).toBe('abandoned');
    });
  });

  describe('checkAnswer', () => {
    it('should check MCQ answers correctly', () => {
      const question: EnrichedQuestion = {
        question_id: 'Q001',
        concept_id: 'C01',
        difficulty: 'familiarity',
        type: 'mcq',
        question_text: 'Test?',
        correct_answer: 'B',
        eligible: true,
        is_recommended: true,
        priority_score: 100,
        concept_progress: null,
      };

      expect(checkAnswer('B', question)).toBe(true);
      expect(checkAnswer('b', question)).toBe(true); // Case insensitive
      expect(checkAnswer('A', question)).toBe(false);
    });

    it('should check true/false answers correctly', () => {
      const question: EnrichedQuestion = {
        question_id: 'Q001',
        concept_id: 'C01',
        difficulty: 'familiarity',
        type: 'true_false',
        question_text: 'Test?',
        correct_answer: 'true',
        eligible: true,
        is_recommended: true,
        priority_score: 100,
        concept_progress: null,
      };

      expect(checkAnswer('true', question)).toBe(true);
      expect(checkAnswer('TRUE', question)).toBe(true);
      expect(checkAnswer('false', question)).toBe(false);
    });

    it('should check fill_blank answers with trimming', () => {
      const question: EnrichedQuestion = {
        question_id: 'Q001',
        concept_id: 'C01',
        difficulty: 'familiarity',
        type: 'fill_blank',
        question_text: 'Test?',
        correct_answer: 'answer',
        eligible: true,
        is_recommended: true,
        priority_score: 100,
        concept_progress: null,
      };

      expect(checkAnswer('answer', question)).toBe(true);
      expect(checkAnswer('  answer  ', question)).toBe(true);
      expect(checkAnswer('ANSWER', question)).toBe(true);
      expect(checkAnswer('wrong', question)).toBe(false);
    });

    it('should check ordering answers correctly', () => {
      const question: EnrichedQuestion = {
        question_id: 'Q001',
        concept_id: 'C01',
        difficulty: 'familiarity',
        type: 'ordering',
        question_text: 'Test?',
        correct_answer: ['A', 'B', 'C'],
        eligible: true,
        is_recommended: true,
        priority_score: 100,
        concept_progress: null,
      };

      expect(checkAnswer(['A', 'B', 'C'], question)).toBe(true);
      expect(checkAnswer(['A', 'C', 'B'], question)).toBe(false);
      expect(checkAnswer(['A', 'B'], question)).toBe(false);
    });
  });

  describe('submitAnswer', () => {
    it('should process a correct answer', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const conceptProgress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      const currentQuestion = started.current_question!;
      const result = submitAnswer(
        started,
        { userAnswer: currentQuestion.correct_answer as string, timeTakenMs: 5000 },
        conceptProgress
      );

      expect(result.answer.is_correct).toBe(true);
      expect(result.answer.xp_earned).toBeGreaterThan(0);
      expect(result.session.progress.questions_answered).toBe(1);
      expect(result.session.progress.questions_correct).toBe(1);
    });

    it('should process an incorrect answer', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const conceptProgress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      const result = submitAnswer(
        started,
        { userAnswer: 'wrong_answer', timeTakenMs: 5000 },
        conceptProgress
      );

      expect(result.answer.is_correct).toBe(false);
      expect(result.answer.xp_earned).toBe(0);
      expect(result.session.progress.questions_correct).toBe(0);
    });

    it('should advance to next question after answering', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const firstQuestion = started.current_question;

      const conceptProgress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);
      const result = submitAnswer(
        started,
        { userAnswer: 'any', timeTakenMs: 5000 },
        conceptProgress
      );

      expect(result.session.current_question).not.toBe(firstQuestion);
      expect(result.session.progress.current_question_index).toBe(1);
    });

    it('should complete session when last question is answered', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionCount: 1,
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const conceptProgress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      const result = submitAnswer(
        started,
        { userAnswer: 'any', timeTakenMs: 5000 },
        conceptProgress
      );

      expect(result.isSessionComplete).toBe(true);
      expect(result.session.status).toBe('completed');
      expect(result.session.current_question).toBeNull();
    });
  });

  describe('skipQuestion', () => {
    it('should skip current question and advance', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const firstQuestion = started.current_question;

      const skipped = skipQuestion(started);

      expect(skipped.current_question).not.toBe(firstQuestion);
      expect(skipped.questions[0].status).toBe('skipped');
    });

    it('should complete session when skipping last question', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionCount: 1,
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const skipped = skipQuestion(started);

      expect(skipped.status).toBe('completed');
      expect(skipped.current_question).toBeNull();
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary with correct stats', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionCount: 2,
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);

      // Answer one correctly
      const conceptProgress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);
      const currentQuestion = started.current_question!;
      const afterAnswer = submitAnswer(
        started,
        { userAnswer: currentQuestion.correct_answer as string, timeTakenMs: 5000 },
        conceptProgress
      );

      // Skip the second
      const afterSkip = skipQuestion(afterAnswer.session);

      const summary = getSessionSummary(afterSkip);

      expect(summary.session_id).toBe(afterSkip.session_id);
      expect(summary.total_questions).toBe(2);
      expect(summary.questions_answered).toBe(1);
      expect(summary.questions_correct).toBe(1);
      expect(summary.questions_skipped).toBe(1);
    });
  });

  describe('Timing Functions', () => {
    it('should detect session timeout', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        timeMode: '3min',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);

      expect(isSessionTimedOut(started, 0)).toBe(false);
      expect(isSessionTimedOut(started, TIME_LIMITS['3min']! - 1)).toBe(false);
      expect(isSessionTimedOut(started, TIME_LIMITS['3min']!)).toBe(true);
      expect(isSessionTimedOut(started, TIME_LIMITS['3min']! + 1)).toBe(true);
    });

    it('should not timeout unlimited sessions', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        timeMode: 'unlimited',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);

      expect(isSessionTimedOut(started, 999999999)).toBe(false);
    });

    it('should update session time', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        timeMode: '5min',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      const updated = updateSessionTime(started, 60000);

      expect(updated.progress.time_elapsed_ms).toBe(60000);
      expect(updated.progress.time_remaining_ms).toBe(TIME_LIMITS['5min']! - 60000);
    });
  });

  describe('getSessionAccuracy', () => {
    it('should calculate accuracy correctly', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionCount: 3,
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      let current = startSession(session);
      const conceptProgress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      // Answer 2 correct, 1 incorrect
      const q1 = current.current_question!;
      const result1 = submitAnswer(
        current,
        { userAnswer: q1.correct_answer as string, timeTakenMs: 5000 },
        conceptProgress
      );
      current = result1.session;

      const q2 = current.current_question!;
      const result2 = submitAnswer(
        current,
        { userAnswer: q2.correct_answer as string, timeTakenMs: 5000 },
        conceptProgress
      );
      current = result2.session;

      const result3 = submitAnswer(
        current,
        { userAnswer: 'wrong', timeTakenMs: 5000 },
        conceptProgress
      );
      current = result3.session;

      const accuracy = getSessionAccuracy(current);
      expect(accuracy).toBe(67); // 2/3 = 66.67% rounded to 67
    });

    it('should return 0 for no answers', () => {
      const session = createSession({
        topicId: 'T01.01',
        topicName: 'Addition Basics',
        questionBank: createMockQuestionBank(),
        camTopic: createMockCAMTopic(),
      });

      const started = startSession(session);
      expect(getSessionAccuracy(started)).toBe(0);
    });
  });

  describe('Constants', () => {
    it('should have all time limits defined', () => {
      expect(TIME_LIMITS['unlimited']).toBeNull();
      expect(TIME_LIMITS['10min']).toBe(10 * 60 * 1000);
      expect(TIME_LIMITS['5min']).toBe(5 * 60 * 1000);
      expect(TIME_LIMITS['3min']).toBe(3 * 60 * 1000);
    });

    it('should have all session statuses defined', () => {
      expect(SESSION_STATUS.NOT_STARTED).toBe('not_started');
      expect(SESSION_STATUS.IN_PROGRESS).toBe('in_progress');
      expect(SESSION_STATUS.PAUSED).toBe('paused');
      expect(SESSION_STATUS.COMPLETED).toBe('completed');
      expect(SESSION_STATUS.ABANDONED).toBe('abandoned');
    });
  });
});
