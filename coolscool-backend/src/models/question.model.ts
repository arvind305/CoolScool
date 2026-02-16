/**
 * Question Model
 *
 * Database operations for questions.
 * SECURITY: Never expose correct_answer until AFTER submission.
 */

import { query } from '../db/index.js';

// Question type as stored in database
export interface Question {
  id: string;
  question_id: string;
  concept_id: string;
  concept_id_str: string;
  topic_id_str: string;
  curriculum_id: string;
  difficulty: 'familiarity' | 'application' | 'exam_style';
  question_type: 'mcq' | 'fill_blank' | 'true_false' | 'match' | 'ordering';
  question_text: string;
  options: { id: string; text: string }[] | null;
  correct_answer: string | boolean | string[] | Record<string, string>;
  match_pairs: { left: string; right: string }[] | null;
  ordering_items: string[] | null;
  hint: string | null;
  tags: string[];
  explanation_correct: string | null;
  explanation_incorrect: string | null;
  image_url: string | null;
  option_images: Record<string, string> | null;
  created_at: Date;
  updated_at: Date;
}

// Question as sent to client (no answer data)
export interface QuestionForClient {
  id: string;
  question_id: string;
  concept_id_str: string;
  topic_id_str: string;
  difficulty: string;
  question_type: string;
  question_text: string;
  options: { id: string; text: string }[] | null;
  // For match questions: only the left side (shuffled right side)
  match_left: string[] | null;
  match_right_shuffled: string[] | null;
  // For ordering questions: shuffled items
  ordering_items_shuffled: string[] | null;
  hint: string | null;
  image_url: string | null;
  option_images: Record<string, string> | null;
}

// Find question by UUID
export async function findById(id: string): Promise<Question | null> {
  const result = await query<Question>(
    'SELECT * FROM questions WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

// Find question by question_id string (e.g., T01.01.C01.F.001)
export async function findByQuestionId(questionId: string): Promise<Question | null> {
  const result = await query<Question>(
    'SELECT * FROM questions WHERE question_id = $1',
    [questionId]
  );
  return result.rows[0] || null;
}

// Get questions by topic (with curriculum scope)
export async function getQuestionsByTopic(
  curriculumId: string,
  topicIdStr: string,
  difficulty?: string
): Promise<Question[]> {
  if (difficulty) {
    const result = await query<Question>(
      `SELECT * FROM questions
       WHERE curriculum_id = $1 AND topic_id_str = $2 AND difficulty = $3
       ORDER BY concept_id_str, question_id`,
      [curriculumId, topicIdStr, difficulty]
    );
    return result.rows;
  }

  const result = await query<Question>(
    `SELECT * FROM questions
     WHERE curriculum_id = $1 AND topic_id_str = $2
     ORDER BY concept_id_str, difficulty, question_id`,
    [curriculumId, topicIdStr]
  );
  return result.rows;
}

// Get questions by concept (with curriculum scope)
export async function getQuestionsByConcept(
  curriculumId: string,
  conceptIdStr: string,
  difficulty?: string
): Promise<Question[]> {
  if (difficulty) {
    const result = await query<Question>(
      `SELECT * FROM questions
       WHERE curriculum_id = $1 AND concept_id_str = $2 AND difficulty = $3
       ORDER BY question_id`,
      [curriculumId, conceptIdStr, difficulty]
    );
    return result.rows;
  }

  const result = await query<Question>(
    `SELECT * FROM questions
     WHERE curriculum_id = $1 AND concept_id_str = $2
     ORDER BY difficulty, question_id`,
    [curriculumId, conceptIdStr]
  );
  return result.rows;
}

// Get questions by UUIDs (for session question queue)
export async function getQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];

  const result = await query<Question>(
    `SELECT * FROM questions
     WHERE id = ANY($1)`,
    [ids]
  );

  // Preserve order from input array
  const questionMap = new Map(result.rows.map(q => [q.id, q]));
  return ids.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined);
}

// Get a single question by UUID for session
export async function getQuestionForSession(id: string): Promise<Question | null> {
  return findById(id);
}

// Count questions by topic (with curriculum scope)
export async function countQuestionsByTopic(curriculumId: string, topicIdStr: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM questions WHERE curriculum_id = $1 AND topic_id_str = $2',
    [curriculumId, topicIdStr]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

// Count questions by topic and difficulty (with curriculum scope)
export async function countQuestionsByTopicAndDifficulty(
  curriculumId: string,
  topicIdStr: string,
  difficulty: string
): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM questions WHERE curriculum_id = $1 AND topic_id_str = $2 AND difficulty = $3',
    [curriculumId, topicIdStr, difficulty]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * SECURITY CRITICAL: Strip answer data before sending to client
 *
 * This function removes:
 * - correct_answer (for all question types)
 * - match_pairs (replaced with shuffled left/right arrays)
 * - ordering_items (replaced with shuffled array)
 */
export function stripAnswerData(question: Question): QuestionForClient {
  const base: QuestionForClient = {
    id: question.id,
    question_id: question.question_id,
    concept_id_str: question.concept_id_str,
    topic_id_str: question.topic_id_str,
    difficulty: question.difficulty,
    question_type: question.question_type,
    question_text: question.question_text,
    options: question.options,
    match_left: null,
    match_right_shuffled: null,
    ordering_items_shuffled: null,
    hint: question.hint,
    image_url: question.image_url || null,
    option_images: question.option_images || null,
  };

  // For match questions: separate left and right, shuffle right side
  if (question.question_type === 'match' && question.match_pairs) {
    const pairs = question.match_pairs;
    base.match_left = pairs.map(p => p.left);
    // Shuffle right side so student can't guess by position
    base.match_right_shuffled = shuffleArray(pairs.map(p => p.right));
  }

  // For ordering questions: shuffle the items
  if (question.question_type === 'ordering' && question.ordering_items) {
    base.ordering_items_shuffled = shuffleArray([...question.ordering_items]);
  }

  return base;
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Check if user's answer is correct
 *
 * IMPORTANT: This runs server-side only. Never expose logic to client.
 */
export function checkAnswer(
  question: Question,
  userAnswer: unknown
): boolean {
  switch (question.question_type) {
    case 'mcq':
      return checkStringAnswer(question.correct_answer as string, userAnswer);

    case 'true_false':
      return checkTrueFalseAnswer(question.correct_answer as string, userAnswer);

    case 'fill_blank':
      return checkFillBlankAnswer(question.correct_answer as string, userAnswer);

    case 'ordering':
      return checkOrderingAnswer(question.correct_answer as string[], userAnswer);

    case 'match':
      return checkMatchAnswer(question.match_pairs || [], userAnswer);

    default:
      return false;
  }
}

// MCQ: case-insensitive string comparison
function checkStringAnswer(correctAnswer: string, userAnswer: unknown): boolean {
  if (typeof userAnswer !== 'string') return false;
  return userAnswer.toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
}

// True/False: normalize all formats (A/B/true/false/True/False) to canonical form
function normalizeTrueFalse(answer: string): string {
  const lower = answer.toLowerCase().trim();
  if (lower === 'true' || lower === 'a') return 'a';
  if (lower === 'false' || lower === 'b') return 'b';
  return lower;
}

function checkTrueFalseAnswer(correctAnswer: string, userAnswer: unknown): boolean {
  if (typeof userAnswer !== 'string') return false;
  return normalizeTrueFalse(userAnswer) === normalizeTrueFalse(String(correctAnswer));
}

// Normalize a fill-blank answer for comparison
function normalizeFillBlank(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/[.,]+$/, '');
  s = s.replace(/'/g, '');
  if (/^[a-z\s-]+$/.test(s)) {
    s = s.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return s;
}

// Levenshtein distance for limited typo tolerance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]!
        : 1 + Math.min(prev[j - 1]!, prev[j]!, curr[j - 1]!);
    }
    prev = curr;
  }
  return prev[n]!;
}

// Fill blank: normalize + exact match, with limited typo tolerance for text answers > 5 chars
function checkFillBlankAnswer(correctAnswer: string, userAnswer: unknown): boolean {
  if (typeof userAnswer !== 'string') return false;
  const user = normalizeFillBlank(userAnswer);
  const correct = normalizeFillBlank(correctAnswer);
  if (user === correct) return true;
  const isNumericOrMath = /[0-9^()\/]/.test(correct);
  if (isNumericOrMath) return false;
  if (correct.length <= 5) return false;
  return levenshtein(user, correct) <= 1;
}

// Ordering: exact array order match
function checkOrderingAnswer(correctOrder: string[], userAnswer: unknown): boolean {
  if (!Array.isArray(userAnswer)) return false;
  if (userAnswer.length !== correctOrder.length) return false;
  return userAnswer.every((item, index) => item === correctOrder[index]);
}

// Match: all pairs must be correctly matched
function checkMatchAnswer(
  matchPairs: { left: string; right: string }[],
  userAnswer: unknown
): boolean {
  if (typeof userAnswer !== 'object' || userAnswer === null) return false;

  const answer = userAnswer as Record<string, string>;
  const answerKeys = Object.keys(answer);

  // Must have same number of pairs
  if (answerKeys.length !== matchPairs.length) return false;

  // Each left item must map to correct right item
  for (const pair of matchPairs) {
    if (answer[pair.left] !== pair.right) {
      return false;
    }
  }

  return true;
}

/**
 * Get correct answer for a question (for feedback after submission)
 */
export function getCorrectAnswerForFeedback(question: Question): {
  correct_answer: unknown;
  explanation?: string;
} {
  return {
    correct_answer: question.correct_answer,
  };
}
