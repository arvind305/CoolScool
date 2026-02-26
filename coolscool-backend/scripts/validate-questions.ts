/**
 * Comprehensive Question Data Validation Script
 *
 * Scans ALL question data files for quality issues and optionally
 * compares against the production database.
 *
 * Usage:
 *   npx tsx scripts/validate-questions.ts              # File-only validation
 *   npx tsx scripts/validate-questions.ts --db          # + DB comparison
 *   npx tsx scripts/validate-questions.ts --board icse  # Filter by board
 *   npx tsx scripts/validate-questions.ts --class 8     # Filter by class
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');
const questionsRoot = path.join(rootDir, 'questions', 'data');

// ── CLI Args ─────────────────────────────────────────────────

const args = process.argv.slice(2);
const DB_MODE = args.includes('--db');
const VERBOSE = args.includes('--verbose');
const boardIdx = args.indexOf('--board');
const classIdx = args.indexOf('--class');
const FILTER_BOARD = boardIdx !== -1 ? args[boardIdx + 1]?.toLowerCase() : null;
const FILTER_CLASS = classIdx !== -1 ? parseInt(args[classIdx + 1] || '', 10) || null : null;

// ── Types ────────────────────────────────────────────────────

type Severity = 'error' | 'warning' | 'info';

type IssueCategory =
  | 'type_mismatch'
  | 'missing_field'
  | 'invalid_enum'
  | 'duplicate_id'
  | 'id_pattern_mismatch'
  | 'option_count'
  | 'suspicious_answer'
  | 'ordering_mismatch'
  | 'explanation_mismatch'
  | 'schema_error'
  | 'db_answer_mismatch'
  | 'db_explanation_mismatch'
  | 'db_type_mismatch'
  | 'db_orphan'
  | 'db_missing';

interface ValidationIssue {
  severity: Severity;
  category: IssueCategory;
  file: string;
  questionId: string;
  field: string;
  message: string;
  currentValue?: unknown;
  expectedValue?: unknown;
}

interface QuestionOption {
  id: string;
  text: string;
}

interface OrderingItem {
  id: string;
  text: string;
}

interface Question {
  question_id: string;
  concept_id: string;
  difficulty: string;
  cognitive_level?: string;
  type: string;
  question_text: string;
  options?: QuestionOption[];
  correct_answer?: unknown;
  ordering_items?: string[];
  items?: OrderingItem[] | string[];
  correct_order?: string[];
  match_pairs?: unknown;
  explanation_correct?: string;
  explanation_incorrect?: string;
  image_url?: string;
  option_images?: Record<string, string>;
  hint?: string;
  tags?: string[];
}

interface QuestionBank {
  version: string;
  topic_id: string;
  topic_name: string;
  canonical_explanation?: { text: string; rules: string[] };
  questions: Question[];
}

interface FileValidationResult {
  file: string;
  topicId: string;
  topicName: string;
  totalQuestions: number;
  typeCounts: Record<string, number>;
  issues: ValidationIssue[];
}

interface DBComparisonResult {
  curriculumId: string;
  board: string;
  classLevel: number;
  subject: string;
  totalInDB: number;
  totalInFiles: number;
  orphans: string[];
  missing: string[];
  issues: ValidationIssue[];
}

interface ValidationReport {
  generated: string;
  mode: string;
  totalFiles: number;
  totalQuestions: number;
  totalIssues: number;
  issuesBySeverity: Record<Severity, number>;
  issuesByCategory: Record<string, number>;
  fileResults: FileValidationResult[];
  dbComparison?: DBComparisonResult[];
}

// ── Constants ────────────────────────────────────────────────

const VALID_TYPES = new Set(['mcq', 'fill_blank', 'true_false', 'ordering']);
const VALID_DIFFICULTIES = new Set(['familiarity', 'application', 'exam_style']);
const VALID_COGNITIVE_LEVELS = new Set(['recall', 'compare', 'classify', 'scenario', 'exception', 'reason']);
const MCQ_OPTION_IDS = new Set(['A', 'B', 'C', 'D']);
const SUSPICIOUS_FILL_BLANK_LETTERS = new Set(['A', 'B', 'C', 'D']);
const TOPIC_ID_RE = /^T\d{2}\.\d{2}$/;
const QUESTION_ID_RE = /^(T\d{2}\.\d{2})\.Q\d{3}$/;
const CONCEPT_ID_RE = /^(T\d{2}\.\d{2})\.C\d{2}$/;

const STOPWORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'by', 'from', 'this', 'that', 'these', 'those', 'it',
  'its', 'not', 'no', 'yes', 'can', 'will', 'has', 'have', 'had', 'do', 'does', 'did',
  'be', 'been', 'being', 'if', 'then', 'than', 'so', 'as', 'what', 'which', 'who',
  'how', 'when', 'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'only', 'own', 'same', 'also', 'very', 'just',
  'because', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'again', 'further', 'once', 'here', 'there', 'correct',
  'incorrect', 'answer', 'option', 'question', 'following', 'given', 'called', 'known',
  'used', 'make', 'made', 'find', 'many', 'much', 'would', 'should', 'could',
]);

// ── File Discovery ───────────────────────────────────────────

function discoverFiles(): { relPath: string; absPath: string }[] {
  const files: { relPath: string; absPath: string }[] = [];

  if (!fs.existsSync(questionsRoot)) {
    console.error(`Questions root not found: ${questionsRoot}`);
    process.exit(1);
  }

  const dirs = fs.readdirSync(questionsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const dir of dirs) {
    // Apply board filter
    if (FILTER_BOARD) {
      if (FILTER_BOARD === 'cbse' && !dir.startsWith('cbse-')) continue;
      if (FILTER_BOARD === 'icse' && dir.startsWith('cbse-')) continue;
    }

    // Apply class filter
    if (FILTER_CLASS) {
      const classMatch = dir.match(/class(\d+)/);
      if (!classMatch || parseInt(classMatch[1], 10) !== FILTER_CLASS) continue;
    }

    const dirPath = path.join(questionsRoot, dir);
    const jsonFiles = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.json') && f.startsWith('T'))
      .sort();

    for (const f of jsonFiles) {
      files.push({
        relPath: `${dir}/${f}`,
        absPath: path.join(dirPath, f),
      });
    }
  }

  return files;
}

// ── Validation Functions ─────────────────────────────────────

function issue(
  severity: Severity,
  category: IssueCategory,
  file: string,
  questionId: string,
  field: string,
  message: string,
  currentValue?: unknown,
  expectedValue?: unknown
): ValidationIssue {
  return { severity, category, file, questionId, field, message, currentValue, expectedValue };
}

function validateFileStructure(filePath: string, relPath: string, data: unknown): { bank: QuestionBank | null; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!data || typeof data !== 'object') {
    issues.push(issue('error', 'schema_error', relPath, '', 'root', 'File does not contain a valid JSON object'));
    return { bank: null, issues };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.topic_id || typeof obj.topic_id !== 'string') {
    issues.push(issue('error', 'schema_error', relPath, '', 'topic_id', 'Missing or invalid topic_id'));
    return { bank: null, issues };
  }

  if (!obj.topic_name || typeof obj.topic_name !== 'string') {
    issues.push(issue('warning', 'missing_field', relPath, '', 'topic_name', 'Missing topic_name'));
  }

  if (!Array.isArray(obj.questions)) {
    issues.push(issue('error', 'schema_error', relPath, '', 'questions', 'Missing or invalid questions array'));
    return { bank: null, issues };
  }

  if (obj.questions.length === 0) {
    issues.push(issue('warning', 'schema_error', relPath, '', 'questions', 'Empty questions array'));
  }

  return { bank: obj as unknown as QuestionBank, issues };
}

function validateMCQ(q: Question, relPath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Must have options
  if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
    issues.push(issue('error', 'missing_field', relPath, q.question_id, 'options', 'MCQ question missing options array'));
    return issues;
  }

  // Each option must have id and text
  for (let i = 0; i < q.options.length; i++) {
    const opt = q.options[i];
    if (!opt || !opt.id || typeof opt.id !== 'string') {
      issues.push(issue('error', 'schema_error', relPath, q.question_id, `options[${i}].id`, `Option ${i} missing id`));
    }
    if (!opt || !opt.text || typeof opt.text !== 'string' || opt.text.trim() === '') {
      issues.push(issue('error', 'missing_field', relPath, q.question_id, `options[${i}].text`, `Option ${i} missing or empty text`));
    }
  }

  // Should have exactly 4 options
  if (q.options.length !== 4) {
    issues.push(issue('warning', 'option_count', relPath, q.question_id, 'options', `MCQ has ${q.options.length} options instead of 4`, q.options.length, 4));
  }

  // Duplicate option IDs
  const optionIds = new Set<string>();
  for (const opt of q.options) {
    if (opt && optionIds.has(opt.id)) {
      issues.push(issue('error', 'duplicate_id', relPath, q.question_id, 'options', `Duplicate option ID: ${opt.id}`));
    }
    if (opt) optionIds.add(opt.id);
  }

  // correct_answer must match an option ID
  if (typeof q.correct_answer !== 'string') {
    issues.push(issue('error', 'type_mismatch', relPath, q.question_id, 'correct_answer', `MCQ correct_answer must be a string, got ${typeof q.correct_answer}`, q.correct_answer));
  } else if (!optionIds.has(q.correct_answer)) {
    issues.push(issue('error', 'type_mismatch', relPath, q.question_id, 'correct_answer', `MCQ correct_answer "${q.correct_answer}" does not match any option ID`, q.correct_answer, Array.from(optionIds)));
  }

  return issues;
}

function validateFillBlank(q: Question, relPath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // correct_answer must be a non-empty string
  if (q.correct_answer === undefined || q.correct_answer === null) {
    issues.push(issue('error', 'missing_field', relPath, q.question_id, 'correct_answer', 'fill_blank question missing correct_answer'));
    return issues;
  }

  if (typeof q.correct_answer !== 'string') {
    issues.push(issue('error', 'type_mismatch', relPath, q.question_id, 'correct_answer', `fill_blank correct_answer must be a string, got ${typeof q.correct_answer}`, q.correct_answer));
    return issues;
  }

  if (q.correct_answer.trim() === '') {
    issues.push(issue('error', 'missing_field', relPath, q.question_id, 'correct_answer', 'fill_blank correct_answer is empty'));
    return issues;
  }

  // fill_blank with options + single-letter answer = almost certainly a mislabeled MCQ
  const hasOptions = q.options && Array.isArray(q.options) && q.options.length > 0;
  const isSingleLetter = SUSPICIOUS_FILL_BLANK_LETTERS.has(q.correct_answer);

  if (hasOptions && isSingleLetter) {
    // This is an MCQ mislabeled as fill_blank — ERROR
    issues.push(issue('error', 'type_mismatch', relPath, q.question_id, 'type',
      `fill_blank has options + single-letter answer "${q.correct_answer}" — should be type "mcq"`,
      { type: q.type, correct_answer: q.correct_answer, optionCount: q.options!.length }, 'mcq'));
  } else if (isSingleLetter) {
    // Single letter without options — suspicious but may be legitimate (element symbol, variable)
    issues.push(issue('warning', 'suspicious_answer', relPath, q.question_id, 'correct_answer',
      `fill_blank has single-letter answer "${q.correct_answer}" — may be MCQ/true_false contamination (or legitimate if it's an element symbol, variable, etc.)`,
      q.correct_answer));
  } else if (hasOptions) {
    // Has options but not a single-letter answer — unusual
    issues.push(issue('warning', 'type_mismatch', relPath, q.question_id, 'options',
      'fill_blank question has options array (unexpected)', q.options!.length));
  }

  return issues;
}

function validateTrueFalse(q: Question, relPath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // correct_answer must be "A" or "B"
  if (typeof q.correct_answer !== 'string') {
    issues.push(issue('error', 'type_mismatch', relPath, q.question_id, 'correct_answer', `true_false correct_answer must be a string, got ${typeof q.correct_answer}`, q.correct_answer));
  } else if (q.correct_answer !== 'A' && q.correct_answer !== 'B') {
    issues.push(issue('error', 'type_mismatch', relPath, q.question_id, 'correct_answer', `true_false correct_answer must be "A" or "B", got "${q.correct_answer}"`, q.correct_answer, ['A', 'B']));
  }

  // Should have exactly 2 options
  if (!q.options || !Array.isArray(q.options)) {
    issues.push(issue('warning', 'missing_field', relPath, q.question_id, 'options', 'true_false question missing options array'));
  } else if (q.options.length !== 2) {
    issues.push(issue('warning', 'option_count', relPath, q.question_id, 'options', `true_false has ${q.options.length} options instead of 2`, q.options.length, 2));
  }

  return issues;
}

function validateOrdering(q: Question, relPath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Handle alternate format 1: items (objects with id/text) + correct_order
  if (q.items && q.correct_order && Array.isArray(q.items) && q.items.length > 0 && typeof q.items[0] === 'object') {
    if (!Array.isArray(q.correct_order) || q.correct_order.length === 0) {
      issues.push(issue('error', 'missing_field', relPath, q.question_id, 'correct_order', 'Ordering question has empty correct_order array'));
      return issues;
    }
    if (q.items.length !== q.correct_order.length) {
      issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'correct_order', `items count (${q.items.length}) doesn't match correct_order count (${q.correct_order.length})`));
    }
    const itemIds = new Set((q.items as OrderingItem[]).map(i => i.id));
    for (const id of q.correct_order) {
      if (!itemIds.has(id)) {
        issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'correct_order', `correct_order references unknown item ID: "${id}"`));
      }
    }
    return issues;
  }

  // Handle alternate format 2: items (flat string array) + correct_answer (array)
  if (q.items && Array.isArray(q.items) && q.items.length > 0 && typeof q.items[0] === 'string') {
    if (!Array.isArray(q.correct_answer) || q.correct_answer.length === 0) {
      issues.push(issue('error', 'missing_field', relPath, q.question_id, 'correct_answer', 'Ordering question with flat items array has no correct_answer array'));
      return issues;
    }
    const itemSet = new Set(q.items as string[]);
    const answerSet = new Set(q.correct_answer as string[]);
    if (q.items.length !== (q.correct_answer as string[]).length) {
      issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'correct_answer', `items count (${q.items.length}) doesn't match correct_answer count (${(q.correct_answer as string[]).length})`));
    }
    for (const item of q.correct_answer as string[]) {
      if (!itemSet.has(item)) {
        issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'correct_answer', `correct_answer contains item not in items: "${item}"`));
      }
    }
    for (const item of q.items as string[]) {
      if (!answerSet.has(item)) {
        issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'items', `items contains item not in correct_answer: "${item}"`));
      }
    }
    return issues;
  }

  // Standard format: ordering_items + correct_answer (array)
  if (!q.ordering_items || !Array.isArray(q.ordering_items) || q.ordering_items.length === 0) {
    issues.push(issue('error', 'missing_field', relPath, q.question_id, 'ordering_items', 'Ordering question missing ordering_items'));
    return issues;
  }

  if (!Array.isArray(q.correct_answer)) {
    issues.push(issue('error', 'type_mismatch', relPath, q.question_id, 'correct_answer', `Ordering correct_answer must be an array, got ${typeof q.correct_answer}`, q.correct_answer));
    return issues;
  }

  if (q.ordering_items.length !== q.correct_answer.length) {
    issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'correct_answer', `ordering_items count (${q.ordering_items.length}) doesn't match correct_answer count (${q.correct_answer.length})`));
  }

  // Check set equality (same items, possibly different order)
  const itemSet = new Set(q.ordering_items);
  const answerSet = new Set(q.correct_answer as string[]);
  for (const item of q.correct_answer as string[]) {
    if (!itemSet.has(item)) {
      issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'correct_answer', `correct_answer contains item not in ordering_items: "${item}"`));
    }
  }
  for (const item of q.ordering_items) {
    if (!answerSet.has(item)) {
      issues.push(issue('error', 'ordering_mismatch', relPath, q.question_id, 'ordering_items', `ordering_items contains item not in correct_answer: "${item}"`));
    }
  }

  return issues;
}

function extractKeyTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOPWORDS.has(w));
}

function validateCrossField(q: Question, relPath: string, topicId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // question_text must be present
  if (!q.question_text || typeof q.question_text !== 'string' || q.question_text.trim().length < 5) {
    issues.push(issue('error', 'missing_field', relPath, q.question_id, 'question_text', 'Missing or too short question_text'));
  }

  // question_id pattern
  if (q.question_id) {
    const qMatch = QUESTION_ID_RE.exec(q.question_id);
    if (!qMatch) {
      issues.push(issue('warning', 'id_pattern_mismatch', relPath, q.question_id, 'question_id', `question_id doesn't match expected pattern T##.##.Q###`, q.question_id));
    } else if (qMatch[1] !== topicId) {
      issues.push(issue('warning', 'id_pattern_mismatch', relPath, q.question_id, 'question_id', `question_id topic prefix "${qMatch[1]}" doesn't match file topic_id "${topicId}"`, q.question_id, topicId));
    }
  } else {
    issues.push(issue('error', 'missing_field', relPath, '', 'question_id', 'Missing question_id'));
  }

  // concept_id pattern
  if (q.concept_id) {
    const cMatch = CONCEPT_ID_RE.exec(q.concept_id);
    if (!cMatch) {
      issues.push(issue('warning', 'id_pattern_mismatch', relPath, q.question_id, 'concept_id', `concept_id doesn't match expected pattern T##.##.C##`, q.concept_id));
    } else if (cMatch[1] !== topicId) {
      issues.push(issue('warning', 'id_pattern_mismatch', relPath, q.question_id, 'concept_id', `concept_id topic prefix "${cMatch[1]}" doesn't match file topic_id "${topicId}"`, q.concept_id, topicId));
    }
  } else {
    issues.push(issue('error', 'missing_field', relPath, q.question_id, 'concept_id', 'Missing concept_id'));
  }

  // Valid type
  if (!VALID_TYPES.has(q.type)) {
    issues.push(issue('error', 'invalid_enum', relPath, q.question_id, 'type', `Invalid question type: "${q.type}"`, q.type, Array.from(VALID_TYPES)));
  }

  // Valid difficulty
  if (!VALID_DIFFICULTIES.has(q.difficulty)) {
    issues.push(issue('error', 'invalid_enum', relPath, q.question_id, 'difficulty', `Invalid difficulty: "${q.difficulty}"`, q.difficulty, Array.from(VALID_DIFFICULTIES)));
  }

  // Valid cognitive_level
  if (q.cognitive_level && !VALID_COGNITIVE_LEVELS.has(q.cognitive_level)) {
    issues.push(issue('warning', 'invalid_enum', relPath, q.question_id, 'cognitive_level', `Invalid cognitive_level: "${q.cognitive_level}"`, q.cognitive_level, Array.from(VALID_COGNITIVE_LEVELS)));
  }

  // Explanations present
  if (!q.explanation_correct) {
    issues.push(issue('warning', 'missing_field', relPath, q.question_id, 'explanation_correct', 'Missing explanation_correct'));
  }
  if (!q.explanation_incorrect) {
    issues.push(issue('warning', 'missing_field', relPath, q.question_id, 'explanation_incorrect', 'Missing explanation_incorrect'));
  }

  // Explanation relevance heuristic
  if (q.question_text && q.explanation_correct && q.explanation_incorrect) {
    const keyTerms = extractKeyTerms(q.question_text);
    if (keyTerms.length >= 3) {
      const explText = (q.explanation_correct + ' ' + q.explanation_incorrect).toLowerCase();
      const matchCount = keyTerms.filter(t => explText.includes(t)).length;
      const matchRatio = matchCount / keyTerms.length;
      if (matchRatio < 0.15) {
        issues.push(issue('warning', 'explanation_mismatch', relPath, q.question_id, 'explanation',
          `Explanation may not relate to question — only ${matchCount}/${keyTerms.length} key terms found in explanations`,
          { matchRatio: Math.round(matchRatio * 100) + '%', sampleTerms: keyTerms.slice(0, 5) }));
      }
    }
  }

  // Legacy match_pairs field
  if (q.match_pairs) {
    issues.push(issue('info', 'type_mismatch', relPath, q.question_id, 'match_pairs', 'Question has legacy match_pairs field (match type was removed)'));
  }

  return issues;
}

function validateDuplicateIds(questions: Question[], relPath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!;
    if (!q.question_id) continue;

    const prev = seen.get(q.question_id);
    if (prev !== undefined) {
      issues.push(issue('error', 'duplicate_id', relPath, q.question_id, 'question_id',
        `Duplicate question_id "${q.question_id}" at indices ${prev} and ${i}`));
    } else {
      seen.set(q.question_id, i);
    }
  }

  return issues;
}

// ── File Validation ──────────────────────────────────────────

function validateFile(relPath: string, absPath: string): FileValidationResult {
  const result: FileValidationResult = {
    file: relPath,
    topicId: '',
    topicName: '',
    totalQuestions: 0,
    typeCounts: {},
    issues: [],
  };

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (err) {
    result.issues.push(issue('error', 'schema_error', relPath, '', 'file', `JSON parse error: ${(err as Error).message}`));
    return result;
  }

  // File structure
  const { bank, issues: structIssues } = validateFileStructure(absPath, relPath, data);
  result.issues.push(...structIssues);
  if (!bank) return result;

  result.topicId = bank.topic_id;
  result.topicName = bank.topic_name;
  result.totalQuestions = bank.questions.length;

  // Count types
  for (const q of bank.questions) {
    result.typeCounts[q.type] = (result.typeCounts[q.type] || 0) + 1;
  }

  // Duplicate IDs
  result.issues.push(...validateDuplicateIds(bank.questions, relPath));

  // Per-question validation
  for (const q of bank.questions) {
    // Cross-field validations
    result.issues.push(...validateCrossField(q, relPath, bank.topic_id));

    // Type-specific validations
    switch (q.type) {
      case 'mcq':
        result.issues.push(...validateMCQ(q, relPath));
        break;
      case 'fill_blank':
        result.issues.push(...validateFillBlank(q, relPath));
        break;
      case 'true_false':
        result.issues.push(...validateTrueFalse(q, relPath));
        break;
      case 'ordering':
        result.issues.push(...validateOrdering(q, relPath));
        break;
    }
  }

  return result;
}

// ── DB Comparison ────────────────────────────────────────────

interface DBQuestion {
  question_id: string;
  question_type: string;
  correct_answer: unknown;
  explanation_correct: string | null;
  explanation_incorrect: string | null;
  topic_id_str: string;
  concept_id_str: string;
}

interface CurriculumRow {
  id: string;
  board: string;
  class_level: number;
  subject: string;
}

function curriculumToDir(board: string, classLevel: number, subject: string): string {
  const b = board.toLowerCase();
  const s = subject.toLowerCase();
  const prefix = b === 'icse' ? '' : `${b}-`;

  if (s === 'mathematics' || s === 'maths') {
    return `${prefix}class${classLevel}`;
  }
  if (s === 'evs') {
    return `${prefix}class${classLevel}-evs`;
  }
  if (s === 'science') {
    return `${prefix}class${classLevel}-science`;
  }
  // Physics, Chemistry, Biology
  return `${prefix}class${classLevel}-${s}`;
}

function normalizeJsonbForComparison(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  return JSON.stringify(val);
}

async function compareWithDB(
  fileResultsByDir: Map<string, Map<string, Question>>,
): Promise<DBComparisonResult[]> {
  // Dynamic import to avoid requiring pg when not in --db mode
  const dotenv = await import('dotenv');
  const pg = await import('pg');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  const pool = new pg.default.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 30000,
  });

  const results: DBComparisonResult[] = [];

  try {
    // Get all curricula
    const currResult = await pool.query<CurriculumRow>(
      'SELECT id, board, class_level, subject FROM curricula WHERE is_active = true ORDER BY board, class_level, subject'
    );

    for (const curr of currResult.rows) {
      const dir = curriculumToDir(curr.board, curr.class_level, curr.subject);

      // Apply filters
      if (FILTER_BOARD && curr.board.toLowerCase() !== FILTER_BOARD) continue;
      if (FILTER_CLASS && curr.class_level !== FILTER_CLASS) continue;

      const fileQuestions = fileResultsByDir.get(dir);

      const dbResult = await pool.query<DBQuestion>(
        `SELECT question_id, question_type, correct_answer, explanation_correct, explanation_incorrect, topic_id_str, concept_id_str
         FROM questions WHERE curriculum_id = $1 ORDER BY question_id`,
        [curr.id]
      );

      const dbMap = new Map<string, DBQuestion>();
      for (const row of dbResult.rows) {
        dbMap.set(row.question_id, row);
      }

      const comparison: DBComparisonResult = {
        curriculumId: curr.id,
        board: curr.board,
        classLevel: curr.class_level,
        subject: curr.subject,
        totalInDB: dbResult.rows.length,
        totalInFiles: fileQuestions ? fileQuestions.size : 0,
        orphans: [],
        missing: [],
        issues: [],
      };

      if (!fileQuestions) {
        // DB has questions but no files found
        if (dbResult.rows.length > 0) {
          comparison.orphans = dbResult.rows.map(r => r.question_id);
          comparison.issues.push(issue('warning', 'db_orphan', dir, '', 'directory',
            `No question files found for ${curr.board} Class ${curr.class_level} ${curr.subject}, but DB has ${dbResult.rows.length} questions`));
        }
        results.push(comparison);
        continue;
      }

      // Find orphans (in DB but not in files)
      for (const [qid] of dbMap) {
        if (!fileQuestions.has(qid)) {
          comparison.orphans.push(qid);
        }
      }
      if (comparison.orphans.length > 0) {
        comparison.issues.push(issue('warning', 'db_orphan', dir, '', 'questions',
          `${comparison.orphans.length} questions in DB but not in source files`, comparison.orphans.slice(0, 10)));
      }

      // Find missing (in files but not in DB)
      for (const [qid] of fileQuestions) {
        if (!dbMap.has(qid)) {
          comparison.missing.push(qid);
        }
      }
      if (comparison.missing.length > 0) {
        comparison.issues.push(issue('warning', 'db_missing', dir, '', 'questions',
          `${comparison.missing.length} questions in files but not in DB`, comparison.missing.slice(0, 10)));
      }

      // Compare matching questions
      for (const [qid, fileQ] of fileQuestions) {
        const dbQ = dbMap.get(qid);
        if (!dbQ) continue;

        // Type mismatch
        if (dbQ.question_type !== fileQ.type) {
          comparison.issues.push(issue('error', 'db_type_mismatch', dir, qid, 'question_type',
            `DB has type "${dbQ.question_type}" but file has "${fileQ.type}"`,
            dbQ.question_type, fileQ.type));
        }

        // Answer mismatch — for ordering with items+correct_order, the seed derives
        // correct_answer from correct_order, so compare against that instead
        let effectiveFileAnswer = fileQ.correct_answer;
        if (fileQ.type === 'ordering' && !fileQ.correct_answer && fileQ.correct_order) {
          effectiveFileAnswer = fileQ.correct_order;
        }
        const fileAnswer = normalizeJsonbForComparison(effectiveFileAnswer);
        const dbAnswer = normalizeJsonbForComparison(dbQ.correct_answer);
        if (fileAnswer !== dbAnswer) {
          comparison.issues.push(issue('error', 'db_answer_mismatch', dir, qid, 'correct_answer',
            `DB answer differs from file`,
            { db: dbQ.correct_answer, file: effectiveFileAnswer }));
        }

        // Explanation mismatch (only when file has a value)
        if (fileQ.explanation_correct && dbQ.explanation_correct !== fileQ.explanation_correct) {
          comparison.issues.push(issue('warning', 'db_explanation_mismatch', dir, qid, 'explanation_correct',
            'DB explanation_correct differs from file',
            { db: dbQ.explanation_correct?.substring(0, 80), file: fileQ.explanation_correct.substring(0, 80) }));
        }
        if (fileQ.explanation_incorrect && dbQ.explanation_incorrect !== fileQ.explanation_incorrect) {
          comparison.issues.push(issue('warning', 'db_explanation_mismatch', dir, qid, 'explanation_incorrect',
            'DB explanation_incorrect differs from file',
            { db: dbQ.explanation_incorrect?.substring(0, 80), file: fileQ.explanation_incorrect.substring(0, 80) }));
        }
      }

      results.push(comparison);
    }
  } finally {
    await pool.end();
  }

  return results;
}

// ── Report Generation ────────────────────────────────────────

function generateReport(
  fileResults: FileValidationResult[],
  dbComparison?: DBComparisonResult[]
): ValidationReport {
  const allIssues: ValidationIssue[] = [];

  for (const fr of fileResults) {
    allIssues.push(...fr.issues);
  }
  if (dbComparison) {
    for (const dc of dbComparison) {
      allIssues.push(...dc.issues);
    }
  }

  const issuesBySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  const issuesByCategory: Record<string, number> = {};

  for (const i of allIssues) {
    issuesBySeverity[i.severity]++;
    issuesByCategory[i.category] = (issuesByCategory[i.category] || 0) + 1;
  }

  let totalQuestions = 0;
  for (const fr of fileResults) {
    totalQuestions += fr.totalQuestions;
  }

  return {
    generated: new Date().toISOString(),
    mode: DB_MODE ? 'file+db' : 'file-only',
    totalFiles: fileResults.length,
    totalQuestions,
    totalIssues: allIssues.length,
    issuesBySeverity,
    issuesByCategory,
    totalCurriculaChecked: dbComparison?.length ?? 0,
    fileResults: fileResults.filter(fr => fr.issues.length > 0 || VERBOSE),
    dbComparison: dbComparison?.filter(dc => dc.issues.length > 0 || dc.orphans.length > 0 || dc.missing.length > 0 || VERBOSE),
  };
}

function printReport(report: ValidationReport): void {
  console.log('='.repeat(70));
  console.log('QUESTION DATA VALIDATION REPORT');
  console.log('='.repeat(70));
  console.log(`Generated: ${report.generated}`);
  console.log(`Mode: ${report.mode}`);
  if (FILTER_BOARD) console.log(`Board filter: ${FILTER_BOARD}`);
  if (FILTER_CLASS) console.log(`Class filter: ${FILTER_CLASS}`);

  console.log(`\nSCAN SUMMARY:`);
  console.log(`  Files scanned:     ${report.totalFiles.toLocaleString()}`);
  console.log(`  Questions found:   ${report.totalQuestions.toLocaleString()}`);

  // Aggregate type counts
  const totalTypes: Record<string, number> = {};
  for (const fr of report.fileResults) {
    for (const [type, count] of Object.entries(fr.typeCounts)) {
      totalTypes[type] = (totalTypes[type] || 0) + count;
    }
  }
  // Also count from files without issues that were filtered out
  console.log(`  By type: ${Object.entries(totalTypes).map(([t, c]) => `${t}=${c.toLocaleString()}`).join('  ')}`);

  console.log(`\nISSUES FOUND: ${report.totalIssues}`);
  console.log(`  Errors:   ${report.issuesBySeverity.error}    (must fix)`);
  console.log(`  Warnings: ${report.issuesBySeverity.warning}   (review recommended)`);
  console.log(`  Info:     ${report.issuesBySeverity.info}    (informational)`);

  if (Object.keys(report.issuesByCategory).length > 0) {
    console.log(`\nBY CATEGORY:`);
    const sorted = Object.entries(report.issuesByCategory).sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sorted) {
      console.log(`  ${cat.padEnd(30)} ${count}`);
    }
  }

  // Top files by issue count
  const filesWithIssues = report.fileResults
    .filter(fr => fr.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length);

  if (filesWithIssues.length > 0) {
    console.log(`\nTOP ${Math.min(10, filesWithIssues.length)} FILES BY ISSUES:`);
    for (const fr of filesWithIssues.slice(0, 10)) {
      const errors = fr.issues.filter(i => i.severity === 'error').length;
      const warnings = fr.issues.filter(i => i.severity === 'warning').length;
      console.log(`  ${fr.file.padEnd(60)} ${fr.issues.length} issues (${errors}E ${warnings}W)`);
    }
  }

  // DB comparison summary
  if (report.dbComparison && report.dbComparison.length > 0) {
    console.log(`\nDB COMPARISON:`);
    let totalOrphans = 0, totalMissing = 0, totalAnswerMismatches = 0, totalExplMismatches = 0;
    for (const dc of report.dbComparison) {
      totalOrphans += dc.orphans.length;
      totalMissing += dc.missing.length;
      totalAnswerMismatches += dc.issues.filter(i => i.category === 'db_answer_mismatch').length;
      totalExplMismatches += dc.issues.filter(i => i.category === 'db_explanation_mismatch').length;
    }
    console.log(`  Curricula checked:       ${(report as any).totalCurriculaChecked || report.dbComparison.length} (${report.dbComparison.length} with issues)`);
    console.log(`  Orphaned DB questions:   ${totalOrphans}`);
    console.log(`  Missing from DB:         ${totalMissing}`);
    console.log(`  Answer mismatches:       ${totalAnswerMismatches}`);
    console.log(`  Explanation mismatches:  ${totalExplMismatches}`);

    // Show curricula with issues
    const currWithIssues = report.dbComparison.filter(dc => dc.issues.length > 0);
    if (currWithIssues.length > 0) {
      console.log(`\n  CURRICULA WITH DB ISSUES:`);
      for (const dc of currWithIssues.slice(0, 20)) {
        const label = `${dc.board} Class ${dc.classLevel} ${dc.subject}`;
        console.log(`    ${label.padEnd(40)} ${dc.issues.length} issues, ${dc.orphans.length} orphans, ${dc.missing.length} missing`);
      }
    }
  }

  // Print error details
  const allErrors: ValidationIssue[] = [];
  for (const fr of report.fileResults) {
    for (const i of fr.issues) {
      if (i.severity === 'error') allErrors.push(i);
    }
  }
  if (report.dbComparison) {
    for (const dc of report.dbComparison) {
      for (const i of dc.issues) {
        if (i.severity === 'error') allErrors.push(i);
      }
    }
  }

  if (allErrors.length > 0 && allErrors.length <= 50) {
    console.log(`\nERROR DETAILS (${allErrors.length}):`);
    for (const e of allErrors) {
      console.log(`  [${e.category}] ${e.file} ${e.questionId ? `(${e.questionId})` : ''}`);
      console.log(`    ${e.message}`);
      if (e.currentValue !== undefined) console.log(`    Current: ${JSON.stringify(e.currentValue)}`);
      if (e.expectedValue !== undefined) console.log(`    Expected: ${JSON.stringify(e.expectedValue)}`);
    }
  } else if (allErrors.length > 50) {
    console.log(`\n${allErrors.length} errors found — see validation-report.json for full details.`);
  }

  console.log(`\nFull report: scripts/validation-report.json`);
  console.log('='.repeat(70));
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Discovering question files...');
  const files = discoverFiles();
  console.log(`Found ${files.length} question files to validate.`);

  // Validate all files
  console.log('Validating question files...');
  const fileResults: FileValidationResult[] = [];
  // Also build a map of dir -> Map<questionId, Question> for DB comparison
  const filesByDir = new Map<string, Map<string, Question>>();

  for (const { relPath, absPath } of files) {
    const result = validateFile(relPath, absPath);
    fileResults.push(result);

    // Build question lookup for DB comparison
    if (DB_MODE) {
      const dir = relPath.split('/')[0]!;
      try {
        const data: QuestionBank = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        if (!filesByDir.has(dir)) {
          filesByDir.set(dir, new Map());
        }
        const dirMap = filesByDir.get(dir)!;
        for (const q of data.questions) {
          if (q.question_id) {
            dirMap.set(q.question_id, q);
          }
        }
      } catch {
        // Skip files that couldn't be parsed (already reported as issues)
      }
    }
  }

  // DB comparison
  let dbComparison: DBComparisonResult[] | undefined;
  if (DB_MODE) {
    console.log('\nComparing with database...');
    dbComparison = await compareWithDB(filesByDir);
  }

  // Generate and write report
  const report = generateReport(fileResults, dbComparison);

  // For the console report, we need ALL file results including those without issues for type counts
  const fullReport = { ...report };
  // Restore all file results for type count calculation in printReport
  fullReport.fileResults = fileResults;
  printReport(fullReport);

  // Write JSON report (only files with issues to keep it manageable)
  const reportPath = path.join(__dirname, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${reportPath}`);

  // Exit with error code if there are errors
  if (report.issuesBySeverity.error > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
