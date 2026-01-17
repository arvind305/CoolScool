/**
 * Proficiency Calculator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMasteryStats,
  calculateTopicProficiency,
  createTopicProgress,
  getBandMessage,
  getNextBand,
  getAdvancementRequirements,
  PROFICIENCY_BANDS,
  BAND_LABELS,
  BAND_ORDER,
} from './proficiency-calculator';
import { createConceptProgress, recordAttempt } from './mastery-tracker';
import type { ConceptProgress, CAMConcept } from './types';

// Helper to create a mastered concept progress
function createMasteredProgress(
  conceptId: string,
  difficulties: ('familiarity' | 'application' | 'exam_style')[]
): ConceptProgress {
  const progress = createConceptProgress(conceptId, difficulties);

  for (const difficulty of difficulties) {
    // Master each difficulty
    for (let i = 0; i < 5; i++) {
      recordAttempt(progress, {
        questionId: `Q${difficulty}${i}`,
        difficulty,
        isCorrect: true,
        timeTakenMs: 5000,
      });
    }
  }

  return progress;
}

describe('Proficiency Calculator', () => {
  describe('calculateMasteryStats', () => {
    it('should calculate stats for empty progress', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity', 'application'] },
        { concept_id: 'C02', concept_name: 'Concept 2', difficulty_levels: ['familiarity', 'application'] },
      ];

      const stats = calculateMasteryStats([], concepts);

      expect(stats.conceptsStarted).toBe(0);
      expect(stats.familiarityMastered).toBe(0);
      expect(stats.familiarityMasteredPct).toBe(0);
    });

    it('should calculate stats for partial progress', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity', 'application'] },
        { concept_id: 'C02', concept_name: 'Concept 2', difficulty_levels: ['familiarity', 'application'] },
      ];

      // Master familiarity for C01 only
      const progress1 = createMasteredProgress('C01', ['familiarity']);

      const stats = calculateMasteryStats([progress1], concepts);

      expect(stats.conceptsStarted).toBe(1);
      expect(stats.familiarityMastered).toBe(1);
      expect(stats.familiarityMasteredPct).toBe(50); // 1 of 2
    });

    it('should calculate stats for full progress', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity', 'application'] },
        { concept_id: 'C02', concept_name: 'Concept 2', difficulty_levels: ['familiarity', 'application'] },
      ];

      const progress1 = createMasteredProgress('C01', ['familiarity', 'application']);
      const progress2 = createMasteredProgress('C02', ['familiarity', 'application']);

      const stats = calculateMasteryStats([progress1, progress2], concepts);

      expect(stats.conceptsStarted).toBe(2);
      expect(stats.familiarityMasteredPct).toBe(100);
      expect(stats.applicationMasteredPct).toBe(100);
    });
  });

  describe('calculateTopicProficiency', () => {
    it('should return NOT_STARTED for no concepts', () => {
      const result = calculateTopicProficiency([], []);
      expect(result.band).toBe(PROFICIENCY_BANDS.NOT_STARTED);
      expect(result.level).toBe(0);
    });

    it('should return NOT_STARTED for no progress', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity'] },
      ];

      const result = calculateTopicProficiency([], concepts);
      expect(result.band).toBe(PROFICIENCY_BANDS.NOT_STARTED);
    });

    it('should return BUILDING_FAMILIARITY when started', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity', 'application'] },
        { concept_id: 'C02', concept_name: 'Concept 2', difficulty_levels: ['familiarity', 'application'] },
      ];

      // Just start one concept (not mastered)
      const progress = createConceptProgress('C01', ['familiarity', 'application']);
      recordAttempt(progress, {
        questionId: 'Q1',
        difficulty: 'familiarity',
        isCorrect: true,
        timeTakenMs: 5000,
      });

      const result = calculateTopicProficiency([progress], concepts);
      expect(result.band).toBe(PROFICIENCY_BANDS.BUILDING_FAMILIARITY);
      expect(result.level).toBe(1);
    });

    it('should return GROWING_CONFIDENCE when 50% familiarity mastered and 25% application started', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity', 'application'] },
        { concept_id: 'C02', concept_name: 'Concept 2', difficulty_levels: ['familiarity', 'application'] },
      ];

      // Master familiarity for C01 and start application
      // Need to create progress with both difficulties so application can be tracked
      const progress1 = createConceptProgress('C01', ['familiarity', 'application']);

      // Master familiarity (5 correct)
      for (let i = 0; i < 5; i++) {
        recordAttempt(progress1, {
          questionId: `Qfam${i}`,
          difficulty: 'familiarity',
          isCorrect: true,
          timeTakenMs: 5000,
        });
      }

      // Start application (1 attempt)
      recordAttempt(progress1, {
        questionId: 'Qapp',
        difficulty: 'application',
        isCorrect: false,
        timeTakenMs: 5000,
      });

      const result = calculateTopicProficiency([progress1], concepts);
      expect(result.band).toBe(PROFICIENCY_BANDS.GROWING_CONFIDENCE);
      expect(result.level).toBe(2);
    });

    it('should return EXAM_READY when all mastered', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity', 'application', 'exam_style'] },
      ];

      const progress = createMasteredProgress('C01', ['familiarity', 'application', 'exam_style']);

      const result = calculateTopicProficiency([progress], concepts);
      expect(result.band).toBe(PROFICIENCY_BANDS.EXAM_READY);
      expect(result.level).toBe(4);
    });
  });

  describe('createTopicProgress', () => {
    it('should create topic progress with calculated stats', () => {
      const concepts: CAMConcept[] = [
        { concept_id: 'C01', concept_name: 'Concept 1', difficulty_levels: ['familiarity'] },
      ];

      const progress = createMasteredProgress('C01', ['familiarity']);

      const topicProgress = createTopicProgress('T01.01', [progress], concepts);

      expect(topicProgress.topic_id).toBe('T01.01');
      expect(topicProgress.concepts_count).toBe(1);
      expect(topicProgress.concepts_started).toBe(1);
      expect(topicProgress.total_attempts).toBe(5);
      expect(topicProgress.xp_earned).toBeGreaterThan(0);
    });
  });

  describe('getBandMessage', () => {
    it('should return appropriate message for each band', () => {
      for (const band of BAND_ORDER) {
        const message = getBandMessage(band);
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      }
    });
  });

  describe('getNextBand', () => {
    it('should return next band for all except EXAM_READY', () => {
      expect(getNextBand('not_started')).toBe('building_familiarity');
      expect(getNextBand('building_familiarity')).toBe('growing_confidence');
      expect(getNextBand('growing_confidence')).toBe('consistent_understanding');
      expect(getNextBand('consistent_understanding')).toBe('exam_ready');
      expect(getNextBand('exam_ready')).toBeNull();
    });
  });

  describe('getAdvancementRequirements', () => {
    it('should return congratulations message for EXAM_READY', () => {
      const stats = calculateMasteryStats([], []);
      const message = getAdvancementRequirements('exam_ready', stats);
      expect(message).toContain('Congratulations');
    });

    it('should return meaningful requirements for other bands', () => {
      const stats = calculateMasteryStats([], []);
      const message = getAdvancementRequirements('not_started', stats);
      expect(message.toLowerCase()).toContain('start practicing');
    });
  });

  describe('Constants', () => {
    it('should have BAND_LABELS for all bands', () => {
      for (const band of BAND_ORDER) {
        expect(BAND_LABELS[band]).toBeTruthy();
      }
    });

    it('should have BAND_ORDER in correct sequence', () => {
      expect(BAND_ORDER[0]).toBe('not_started');
      expect(BAND_ORDER[BAND_ORDER.length - 1]).toBe('exam_ready');
    });
  });
});
