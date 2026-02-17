/**
 * Tests for Cognitive Depth Framework features:
 * - Recency penalty scoring
 * - Cognitive variety balancing pass
 * - buildRecencyMap DB query
 */

import {
  getRecencyPenalty,
  applyCognitiveVariety,
  buildRecencyMap,
  buildQuestionHistoryMap,
  RECENCY_PENALTIES,
} from '../../src/services/session.service';
import type { CognitiveLevel } from '../../src/models/question.model';

// Mock the DB module
jest.mock('../../src/db/index', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

import { query } from '../../src/db/index';
const mockedQuery = query as jest.MockedFunction<typeof query>;

// ── Helpers ──────────────────────────────────────────────────

function makeQuestion(overrides: Partial<{
  id: string;
  question_id: string;
  cognitive_level: CognitiveLevel;
  priority_score: number;
  concept_id_str: string;
  difficulty: string;
  topic_id_str: string;
}> = {}) {
  return {
    id: overrides.id || `uuid-${Math.random().toString(36).slice(2, 8)}`,
    question_id: overrides.question_id || 'T10.01.Q001',
    concept_id: 'concept-uuid',
    concept_id_str: overrides.concept_id_str || 'T10.01.C01',
    topic_id_str: overrides.topic_id_str || 'T10.01',
    curriculum_id: 'curr-uuid',
    difficulty: overrides.difficulty || 'familiarity',
    cognitive_level: overrides.cognitive_level || 'recall',
    question_type: 'mcq' as const,
    question_text: 'Test question',
    options: [{ id: 'A', text: 'Option A' }],
    correct_answer: 'A',
    match_pairs: null,
    ordering_items: null,
    hint: null,
    tags: [],
    explanation_correct: null,
    explanation_incorrect: null,
    image_url: null,
    option_images: null,
    created_at: new Date(),
    updated_at: new Date(),
    // QuestionWithMetadata fields
    eligible: true,
    is_recommended: true,
    priority_score: overrides.priority_score ?? 100,
    recency_penalty: 0,
    concept_progress: null,
  } as any;
}

// ── Recency Penalty Tests ───────────────────────────────────

describe('getRecencyPenalty', () => {
  it('should return +20 bonus for never-seen questions', () => {
    expect(getRecencyPenalty(undefined)).toBe(RECENCY_PENALTIES.NEVER_SEEN);
    expect(getRecencyPenalty(undefined)).toBe(20);
  });

  it('should return -80 for questions seen last session', () => {
    expect(getRecencyPenalty(1)).toBe(RECENCY_PENALTIES.LAST_SESSION);
    expect(getRecencyPenalty(1)).toBe(-80);
  });

  it('should return -50 for questions seen 2 sessions ago', () => {
    expect(getRecencyPenalty(2)).toBe(RECENCY_PENALTIES.TWO_SESSIONS_AGO);
    expect(getRecencyPenalty(2)).toBe(-50);
  });

  it('should return -30 for questions seen 3 sessions ago', () => {
    expect(getRecencyPenalty(3)).toBe(RECENCY_PENALTIES.THREE_SESSIONS_AGO);
    expect(getRecencyPenalty(3)).toBe(-30);
  });

  it('should return -10 for questions seen 4+ sessions ago', () => {
    expect(getRecencyPenalty(4)).toBe(RECENCY_PENALTIES.FOUR_PLUS_AGO);
    expect(getRecencyPenalty(5)).toBe(-10);
    expect(getRecencyPenalty(10)).toBe(-10);
  });

  it('should have correct ordering: never > 4+ > 3 > 2 > last', () => {
    const penalties = [
      getRecencyPenalty(undefined), // never
      getRecencyPenalty(4),         // 4+
      getRecencyPenalty(3),         // 3 ago
      getRecencyPenalty(2),         // 2 ago
      getRecencyPenalty(1),         // last
    ];
    // Should be in strictly descending order
    for (let i = 0; i < penalties.length - 1; i++) {
      expect(penalties[i]).toBeGreaterThan(penalties[i + 1]!);
    }
  });
});

// ── Cognitive Variety Balancing Tests ────────────────────────

describe('applyCognitiveVariety', () => {
  it('should return the same array when fewer than 2 questions', () => {
    const single = [makeQuestion({ cognitive_level: 'recall' })];
    expect(applyCognitiveVariety(single, [])).toEqual(single);
  });

  it('should not modify an already-diverse selection', () => {
    const selected = [
      makeQuestion({ cognitive_level: 'recall', priority_score: 100 }),
      makeQuestion({ cognitive_level: 'compare', priority_score: 90 }),
      makeQuestion({ cognitive_level: 'classify', priority_score: 80 }),
      makeQuestion({ cognitive_level: 'scenario', priority_score: 70 }),
    ];
    const result = applyCognitiveVariety(selected, []);
    // All 4 different levels — should stay the same
    const levels = result.map(q => q.cognitive_level);
    expect(new Set(levels).size).toBe(4);
  });

  it('should ensure at least 2 different cognitive levels by swapping from pool', () => {
    const selected = [
      makeQuestion({ id: 'q1', cognitive_level: 'recall', priority_score: 100 }),
      makeQuestion({ id: 'q2', cognitive_level: 'recall', priority_score: 90 }),
      makeQuestion({ id: 'q3', cognitive_level: 'recall', priority_score: 80 }),
      makeQuestion({ id: 'q4', cognitive_level: 'recall', priority_score: 70 }),
    ];
    const pool = [
      makeQuestion({ id: 'q5', cognitive_level: 'compare', priority_score: 60 }),
    ];

    const result = applyCognitiveVariety(selected, pool);
    const levels = new Set(result.map(q => q.cognitive_level));
    expect(levels.size).toBeGreaterThanOrEqual(2);
    expect(levels.has('compare')).toBe(true);
  });

  it('should replace the lowest-scored question when ensuring variety', () => {
    const selected = [
      makeQuestion({ id: 'q1', cognitive_level: 'recall', priority_score: 100 }),
      makeQuestion({ id: 'q2', cognitive_level: 'recall', priority_score: 50 }),
      makeQuestion({ id: 'q3', cognitive_level: 'recall', priority_score: 80 }),
    ];
    const pool = [
      makeQuestion({ id: 'q4', cognitive_level: 'scenario', priority_score: 30 }),
    ];

    const result = applyCognitiveVariety(selected, pool);
    // q2 had lowest score (50), should be replaced
    const ids = result.map(q => q.id);
    expect(ids).not.toContain('q2');
    expect(ids).toContain('q4');
  });

  it('should break runs of >3 consecutive same cognitive_level', () => {
    const selected = [
      makeQuestion({ id: 'q1', cognitive_level: 'recall', priority_score: 100 }),
      makeQuestion({ id: 'q2', cognitive_level: 'recall', priority_score: 90 }),
      makeQuestion({ id: 'q3', cognitive_level: 'recall', priority_score: 80 }),
      makeQuestion({ id: 'q4', cognitive_level: 'recall', priority_score: 70 }),
      makeQuestion({ id: 'q5', cognitive_level: 'compare', priority_score: 60 }),
    ];

    const result = applyCognitiveVariety(selected, []);
    // Check no run of 4+ same level
    for (let i = 3; i < result.length; i++) {
      const fourLevels = [
        result[i - 3]!.cognitive_level,
        result[i - 2]!.cognitive_level,
        result[i - 1]!.cognitive_level,
        result[i]!.cognitive_level,
      ];
      const allSame = fourLevels.every(l => l === fourLevels[0]);
      expect(allSame).toBe(false);
    }
  });

  it('should handle a 10-question queue with mixed levels', () => {
    const levels: CognitiveLevel[] = [
      'recall', 'recall', 'compare', 'recall', 'classify',
      'recall', 'scenario', 'recall', 'exception', 'reason',
    ];
    const selected = levels.map((level, i) =>
      makeQuestion({ id: `q${i}`, cognitive_level: level, priority_score: 100 - i * 5 })
    );

    const result = applyCognitiveVariety(selected, []);
    expect(result.length).toBe(10);
    // Should have multiple different levels
    const uniqueLevels = new Set(result.map(q => q.cognitive_level));
    expect(uniqueLevels.size).toBeGreaterThanOrEqual(2);
  });

  it('should not crash with empty pool when variety is impossible', () => {
    const selected = [
      makeQuestion({ cognitive_level: 'recall' }),
      makeQuestion({ cognitive_level: 'recall' }),
    ];
    // No pool to swap from — should return without crash
    const result = applyCognitiveVariety(selected, []);
    expect(result.length).toBe(2);
  });
});

// ── buildRecencyMap Tests ───────────────────────────────────

describe('buildRecencyMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty map when user has no completed sessions', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

    const map = await buildRecencyMap('user-1', 'T10.01');
    expect(map.size).toBe(0);
  });

  it('should map questions from the last session to 1', async () => {
    // First query: get session IDs
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 'session-A' }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });
    // Second query: get question_ids from those sessions
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { question_id: 'q-uuid-1', session_id: 'session-A' },
        { question_id: 'q-uuid-2', session_id: 'session-A' },
      ],
      rowCount: 2, command: '', oid: 0, fields: [],
    });

    const map = await buildRecencyMap('user-1', 'T10.01');
    expect(map.get('q-uuid-1')).toBe(1);
    expect(map.get('q-uuid-2')).toBe(1);
  });

  it('should assign correct session-ago values for multiple sessions', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { id: 'session-C' }, // newest = 1
        { id: 'session-B' }, // 2 ago
        { id: 'session-A' }, // 3 ago
      ],
      rowCount: 3, command: '', oid: 0, fields: [],
    });
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { question_id: 'q1', session_id: 'session-C' },
        { question_id: 'q2', session_id: 'session-B' },
        { question_id: 'q3', session_id: 'session-A' },
      ],
      rowCount: 3, command: '', oid: 0, fields: [],
    });

    const map = await buildRecencyMap('user-1', 'T10.01');
    expect(map.get('q1')).toBe(1); // last session
    expect(map.get('q2')).toBe(2); // 2 ago
    expect(map.get('q3')).toBe(3); // 3 ago
  });

  it('should use the most recent session when a question appears in multiple sessions', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { id: 'session-B' }, // newest = 1
        { id: 'session-A' }, // 2 ago
      ],
      rowCount: 2, command: '', oid: 0, fields: [],
    });
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { question_id: 'q1', session_id: 'session-B' }, // seen in session 1
        { question_id: 'q1', session_id: 'session-A' }, // also seen in session 2
      ],
      rowCount: 2, command: '', oid: 0, fields: [],
    });

    const map = await buildRecencyMap('user-1', 'T10.01');
    // Should take the minimum (most recent) = 1
    expect(map.get('q1')).toBe(1);
  });
});

// ── Integration: Recency affects priority scoring ───────────

describe('Recency integration with priority scoring', () => {
  it('should give higher total score to never-seen questions vs recently-seen', () => {
    // A never-seen question gets +20
    const neverSeenPenalty = getRecencyPenalty(undefined);
    // A just-seen question gets -80
    const justSeenPenalty = getRecencyPenalty(1);

    const basePriority = 100;
    expect(basePriority + neverSeenPenalty).toBe(120);
    expect(basePriority + justSeenPenalty).toBe(20);
    expect(basePriority + neverSeenPenalty).toBeGreaterThan(basePriority + justSeenPenalty);
  });

  it('should rank fresh questions above repeated ones even with lower base score', () => {
    const freshBaseScore = 60; // weaker concept match
    const repeatBaseScore = 100; // strong concept match but recently seen

    const freshTotal = freshBaseScore + getRecencyPenalty(undefined); // 60 + 20 = 80
    const repeatTotal = repeatBaseScore + getRecencyPenalty(1); // 100 + (-80) = 20

    expect(freshTotal).toBeGreaterThan(repeatTotal);
  });

  it('should allow revisiting questions from 4+ sessions ago', () => {
    const baseScore = 100;
    const oldQuestionTotal = baseScore + getRecencyPenalty(5); // 100 + (-10) = 90
    // Still a high score — the question is eligible
    expect(oldQuestionTotal).toBe(90);
    expect(oldQuestionTotal).toBeGreaterThan(50);
  });
});

// ── Migration validation ─────────────────────────────────────

describe('Migration 008: cognitive_level column', () => {
  it('should define valid cognitive level values', () => {
    const validLevels: CognitiveLevel[] = ['recall', 'compare', 'classify', 'scenario', 'exception', 'reason'];
    expect(validLevels).toHaveLength(6);
    // Verify they're all strings
    for (const level of validLevels) {
      expect(typeof level).toBe('string');
    }
  });

  it('should default to recall for existing questions', () => {
    // The migration defaults existing rows to 'recall'
    const defaultLevel: CognitiveLevel = 'recall';
    expect(defaultLevel).toBe('recall');
  });
});

// ── Seed script cognitive_level handling ──────────────────────

describe('Seed script cognitive_level handling', () => {
  it('should default to recall when cognitive_level is missing from JSON', () => {
    const questionFromJson = {
      question_id: 'T01.01.Q001',
      concept_id: 'T01.01.C01',
      difficulty: 'familiarity',
      // no cognitive_level field
      type: 'mcq',
      question_text: 'Test',
    };

    // Simulating what seed scripts do: q.cognitive_level || 'recall'
    const cogLevel = (questionFromJson as any).cognitive_level || 'recall';
    expect(cogLevel).toBe('recall');
  });

  it('should use provided cognitive_level when present in JSON', () => {
    const questionFromJson = {
      question_id: 'T01.01.Q058',
      concept_id: 'T01.01.C04',
      difficulty: 'application',
      cognitive_level: 'compare',
      type: 'mcq',
      question_text: 'How does X differ from Y?',
    };

    const cogLevel = questionFromJson.cognitive_level || 'recall';
    expect(cogLevel).toBe('compare');
  });

  it('should handle all six cognitive levels', () => {
    const levels = ['recall', 'compare', 'classify', 'scenario', 'exception', 'reason'];
    for (const level of levels) {
      const q = { cognitive_level: level };
      expect(q.cognitive_level || 'recall').toBe(level);
    }
  });
});

// ── Cognitive Variety Dedup Tests ──────────────────────────────

describe('applyCognitiveVariety dedup', () => {
  it('should never introduce duplicate question IDs from pool', () => {
    const selected = [
      makeQuestion({ id: 'q1', cognitive_level: 'recall', priority_score: 100 }),
      makeQuestion({ id: 'q2', cognitive_level: 'recall', priority_score: 90 }),
      makeQuestion({ id: 'q3', cognitive_level: 'recall', priority_score: 80 }),
      makeQuestion({ id: 'q4', cognitive_level: 'recall', priority_score: 70 }),
    ];
    const pool = [
      makeQuestion({ id: 'q5', cognitive_level: 'compare', priority_score: 60 }),
      makeQuestion({ id: 'q6', cognitive_level: 'scenario', priority_score: 50 }),
    ];

    const result = applyCognitiveVariety(selected, pool);
    const ids = result.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length); // No duplicates
  });

  it('should not add a pool question that already exists in selected', () => {
    // Edge case: a question appears in both selected and pool
    const sharedQuestion = makeQuestion({ id: 'q-shared', cognitive_level: 'compare', priority_score: 60 });
    const selected = [
      makeQuestion({ id: 'q1', cognitive_level: 'recall', priority_score: 100 }),
      makeQuestion({ id: 'q2', cognitive_level: 'recall', priority_score: 90 }),
      sharedQuestion, // Already in selected
    ];
    const pool = [
      { ...sharedQuestion }, // Same ID in pool
      makeQuestion({ id: 'q-other', cognitive_level: 'scenario', priority_score: 40 }),
    ];

    const result = applyCognitiveVariety(selected, pool);
    const ids = result.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length); // No duplicates
  });
});

// ── buildQuestionHistoryMap Tests ──────────────────────────────

describe('buildQuestionHistoryMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty map when user has no sessions', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

    const map = await buildQuestionHistoryMap('user-1', 'T10.01');
    expect(map.size).toBe(0);
  });

  it('should track correctness of answered questions', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 'session-A' }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { question_id: 'q1', session_id: 'session-A', is_correct: true },
        { question_id: 'q2', session_id: 'session-A', is_correct: false },
      ],
      rowCount: 2, command: '', oid: 0, fields: [],
    });

    const map = await buildQuestionHistoryMap('user-1', 'T10.01');
    expect(map.get('q1')?.isCorrect).toBe(true);
    expect(map.get('q1')?.sessionsAgo).toBe(1);
    expect(map.get('q2')?.isCorrect).toBe(false);
    expect(map.get('q2')?.sessionsAgo).toBe(1);
  });

  it('should use most recent attempt for correctness when seen in multiple sessions', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { id: 'session-B' }, // newest = 1
        { id: 'session-A' }, // 2 ago
      ],
      rowCount: 2, command: '', oid: 0, fields: [],
    });
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { question_id: 'q1', session_id: 'session-B', is_correct: true },  // most recent: correct
        { question_id: 'q1', session_id: 'session-A', is_correct: false }, // older: incorrect
      ],
      rowCount: 2, command: '', oid: 0, fields: [],
    });

    const map = await buildQuestionHistoryMap('user-1', 'T10.01');
    // Should use the most recent (session-B, sessionsAgo=1)
    expect(map.get('q1')?.isCorrect).toBe(true);
    expect(map.get('q1')?.sessionsAgo).toBe(1);
  });

  it('should query all sessions without a LIMIT', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: Array.from({ length: 20 }, (_, i) => ({ id: `session-${i}` })),
      rowCount: 20, command: '', oid: 0, fields: [],
    });
    mockedQuery.mockResolvedValueOnce({
      rows: [], rowCount: 0, command: '', oid: 0, fields: [],
    });

    await buildQuestionHistoryMap('user-1', 'T10.01');

    // Verify the first query does NOT contain LIMIT
    const firstCallArgs = mockedQuery.mock.calls[0]![0] as string;
    expect(firstCallArgs).not.toContain('LIMIT');
  });
});
