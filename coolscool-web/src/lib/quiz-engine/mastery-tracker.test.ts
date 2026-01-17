/**
 * Mastery Tracker Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConceptProgress,
  recordAttempt,
  getMasteryStatus,
  getRecommendedDifficulty,
  isConceptFullyMastered,
  getConceptMasteryPercentage,
  getOrCreateConceptProgress,
  XP_VALUES,
  MASTERY_THRESHOLD,
  DIFFICULTY_ORDER,
} from './mastery-tracker';
import type { ConceptProgress, Difficulty } from './types';

describe('Mastery Tracker', () => {
  describe('createConceptProgress', () => {
    it('should create progress with all allowed difficulties', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
        'exam_style',
      ]);

      expect(progress.concept_id).toBe('T01.01C01');
      expect(progress.current_difficulty).toBe('familiarity');
      expect(progress.total_attempts).toBe(0);
      expect(progress.total_correct).toBe(0);
      expect(progress.xp_earned).toBe(0);
      expect(Object.keys(progress.mastery_by_difficulty)).toHaveLength(3);
    });

    it('should create progress with subset of difficulties', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      expect(Object.keys(progress.mastery_by_difficulty)).toHaveLength(2);
      expect(progress.mastery_by_difficulty['exam_style']).toBeUndefined();
    });

    it('should set starting difficulty to first available', () => {
      const progress = createConceptProgress('T01.01C01', [
        'application',
        'exam_style',
      ]);

      expect(progress.current_difficulty).toBe('application');
    });

    it('should initialize all difficulty masteries to not mastered', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      expect(progress.mastery_by_difficulty['familiarity'].mastered).toBe(false);
      expect(progress.mastery_by_difficulty['application'].mastered).toBe(false);
    });
  });

  describe('recordAttempt', () => {
    let progress: ConceptProgress;

    beforeEach(() => {
      progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
        'exam_style',
      ]);
    });

    it('should increment attempt counts on correct answer', () => {
      const result = recordAttempt(progress, {
        questionId: 'Q001',
        difficulty: 'familiarity',
        isCorrect: true,
        timeTakenMs: 5000,
      });

      expect(result.conceptProgress.total_attempts).toBe(1);
      expect(result.conceptProgress.total_correct).toBe(1);
      expect(result.xpEarned).toBe(XP_VALUES.familiarity);
    });

    it('should increment attempt count but not correct on wrong answer', () => {
      const result = recordAttempt(progress, {
        questionId: 'Q001',
        difficulty: 'familiarity',
        isCorrect: false,
        timeTakenMs: 5000,
      });

      expect(result.conceptProgress.total_attempts).toBe(1);
      expect(result.conceptProgress.total_correct).toBe(0);
      expect(result.xpEarned).toBe(0);
    });

    it('should update difficulty-specific mastery', () => {
      recordAttempt(progress, {
        questionId: 'Q001',
        difficulty: 'familiarity',
        isCorrect: true,
        timeTakenMs: 5000,
      });

      const mastery = progress.mastery_by_difficulty['familiarity'];
      expect(mastery.attempts).toBe(1);
      expect(mastery.correct).toBe(1);
      expect(mastery.streak).toBe(1);
    });

    it('should reset streak on wrong answer', () => {
      // Build up a streak
      for (let i = 0; i < 3; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      expect(progress.mastery_by_difficulty['familiarity'].streak).toBe(3);

      // Break the streak
      recordAttempt(progress, {
        questionId: 'Q003',
        difficulty: 'familiarity',
        isCorrect: false,
        timeTakenMs: 5000,
      });

      expect(progress.mastery_by_difficulty['familiarity'].streak).toBe(0);
    });

    it('should maintain sliding window of recent attempts', () => {
      // Add 7 attempts (more than window size of 5)
      for (let i = 0; i < 7; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: i % 2 === 0, // Alternate correct/incorrect
          timeTakenMs: 5000,
        });
      }

      const mastery = progress.mastery_by_difficulty['familiarity'];
      expect(mastery.recent_attempts).toHaveLength(MASTERY_THRESHOLD.window_size);
    });

    it('should achieve mastery when threshold is met', () => {
      // Need 4 out of 5 correct
      const correctPattern = [true, true, true, true, true];

      for (let i = 0; i < correctPattern.length; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: correctPattern[i],
          timeTakenMs: 5000,
        });
      }

      const mastery = progress.mastery_by_difficulty['familiarity'];
      expect(mastery.mastered).toBe(true);
      expect(mastery.mastered_at).not.toBeNull();
    });

    it('should not achieve mastery when threshold is not met', () => {
      // Only 3 out of 5 correct
      const correctPattern = [true, true, false, true, false];

      for (let i = 0; i < correctPattern.length; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: correctPattern[i],
          timeTakenMs: 5000,
        });
      }

      const mastery = progress.mastery_by_difficulty['familiarity'];
      expect(mastery.mastered).toBe(false);
    });

    it('should advance difficulty after mastery', () => {
      expect(progress.current_difficulty).toBe('familiarity');

      // Achieve mastery
      for (let i = 0; i < 5; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      expect(progress.current_difficulty).toBe('application');
    });

    it('should add to question history', () => {
      recordAttempt(progress, {
        questionId: 'Q001',
        difficulty: 'familiarity',
        isCorrect: true,
        timeTakenMs: 5000,
      });

      expect(progress.question_history).toHaveLength(1);
      expect(progress.question_history[0].question_id).toBe('Q001');
      expect(progress.question_history[0].is_correct).toBe(true);
      expect(progress.question_history[0].time_taken_ms).toBe(5000);
    });

    it('should return masteryAchieved flag when mastery is achieved', () => {
      // Answer 4 correct first
      for (let i = 0; i < 4; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      // 5th correct achieves mastery
      const result = recordAttempt(progress, {
        questionId: 'Q004',
        difficulty: 'familiarity',
        isCorrect: true,
        timeTakenMs: 5000,
      });

      expect(result.masteryAchieved).toBe(true);
    });

    it('should award correct XP for each difficulty level', () => {
      const difficulties: Difficulty[] = ['familiarity', 'application', 'exam_style'];

      for (const difficulty of difficulties) {
        const freshProgress = createConceptProgress('T01.01C02', difficulties);
        const result = recordAttempt(freshProgress, {
          questionId: 'Q001',
          difficulty,
          isCorrect: true,
          timeTakenMs: 5000,
        });

        expect(result.xpEarned).toBe(XP_VALUES[difficulty]);
      }
    });
  });

  describe('getMasteryStatus', () => {
    it('should return formatted mastery status', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      // Add some attempts
      recordAttempt(progress, {
        questionId: 'Q001',
        difficulty: 'familiarity',
        isCorrect: true,
        timeTakenMs: 5000,
      });
      recordAttempt(progress, {
        questionId: 'Q002',
        difficulty: 'familiarity',
        isCorrect: false,
        timeTakenMs: 5000,
      });

      const status = getMasteryStatus(progress);

      expect(status.concept_id).toBe('T01.01C01');
      expect(status.current_difficulty).toBe('familiarity');
      expect(status.total_xp).toBe(XP_VALUES.familiarity);
      expect(status.difficulties['familiarity'].progress).toBe('1/2');
      expect(status.difficulties['familiarity'].attempts).toBe(2);
    });
  });

  describe('getRecommendedDifficulty', () => {
    it('should recommend current difficulty if not mastered', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      const recommended = getRecommendedDifficulty(progress);
      expect(recommended).toBe('familiarity');
    });

    it('should recommend next difficulty if current is mastered', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
        'exam_style',
      ]);

      // Master familiarity
      for (let i = 0; i < 5; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      const recommended = getRecommendedDifficulty(progress);
      expect(recommended).toBe('application');
    });
  });

  describe('isConceptFullyMastered', () => {
    it('should return false if any difficulty is not mastered', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      expect(isConceptFullyMastered(progress)).toBe(false);
    });

    it('should return true if all difficulties are mastered', () => {
      const progress = createConceptProgress('T01.01C01', ['familiarity']);

      // Master familiarity
      for (let i = 0; i < 5; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      expect(isConceptFullyMastered(progress)).toBe(true);
    });
  });

  describe('getConceptMasteryPercentage', () => {
    it('should return 0 for no mastery', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      expect(getConceptMasteryPercentage(progress)).toBe(0);
    });

    it('should return correct percentage for partial mastery', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      // Master familiarity only
      for (let i = 0; i < 5; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      expect(getConceptMasteryPercentage(progress)).toBe(50);
    });

    it('should return 100 for full mastery', () => {
      const progress = createConceptProgress('T01.01C01', ['familiarity']);

      // Master the only difficulty
      for (let i = 0; i < 5; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      expect(getConceptMasteryPercentage(progress)).toBe(100);
    });
  });

  describe('getOrCreateConceptProgress', () => {
    it('should return existing progress if it exists', () => {
      const existingProgress = createConceptProgress('T01.01C01', ['familiarity']);
      existingProgress.xp_earned = 100;

      const progressMap: Record<string, ConceptProgress> = {
        'T01.01C01': existingProgress,
      };

      const result = getOrCreateConceptProgress(progressMap, 'T01.01C01', [
        'familiarity',
      ]);

      expect(result).toBe(existingProgress);
      expect(result.xp_earned).toBe(100);
    });

    it('should create new progress if it does not exist', () => {
      const progressMap: Record<string, ConceptProgress> = {};

      const result = getOrCreateConceptProgress(progressMap, 'T01.01C01', [
        'familiarity',
        'application',
      ]);

      expect(result.concept_id).toBe('T01.01C01');
      expect(result.xp_earned).toBe(0);
      expect(progressMap['T01.01C01']).toBe(result);
    });
  });

  describe('Edge cases', () => {
    it('should handle mastery at exactly threshold', () => {
      const progress = createConceptProgress('T01.01C01', ['familiarity']);

      // Exactly 4 out of 5 correct (threshold)
      const pattern = [true, true, true, true, false];
      for (let i = 0; i < pattern.length; i++) {
        recordAttempt(progress, {
          questionId: `Q00${i}`,
          difficulty: 'familiarity',
          isCorrect: pattern[i],
          timeTakenMs: 5000,
        });
      }

      expect(progress.mastery_by_difficulty['familiarity'].mastered).toBe(true);
    });

    it('should handle cumulative XP correctly', () => {
      const progress = createConceptProgress('T01.01C01', [
        'familiarity',
        'application',
      ]);

      // 3 correct familiarity + 2 correct application
      for (let i = 0; i < 3; i++) {
        recordAttempt(progress, {
          questionId: `Q0${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }
      for (let i = 0; i < 2; i++) {
        recordAttempt(progress, {
          questionId: `Q1${i}`,
          difficulty: 'application',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      const expectedXP = 3 * XP_VALUES.familiarity + 2 * XP_VALUES.application;
      expect(progress.xp_earned).toBe(expectedXP);
    });
  });
});
