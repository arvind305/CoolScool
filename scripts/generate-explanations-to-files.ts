/**
 * Generate missing per-question explanations via Claude API and write them
 * directly into JSON question files.
 *
 * Usage:
 *   npx tsx scripts/generate-explanations-to-files.ts
 *   npx tsx scripts/generate-explanations-to-files.ts --subject Science
 *   npx tsx scripts/generate-explanations-to-files.ts --class 5
 *   npx tsx scripts/generate-explanations-to-files.ts --subject Science --class 3
 *   npx tsx scripts/generate-explanations-to-files.ts --topic T01.01
 *   npx tsx scripts/generate-explanations-to-files.ts --dir class5-science
 *   npx tsx scripts/generate-explanations-to-files.ts --dry-run
 *   npx tsx scripts/generate-explanations-to-files.ts --concurrency 8
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'coolscool-backend', '.env') });

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getFlagValue(flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const targetSubject = getFlagValue('--subject');
const targetClass = getFlagValue('--class') ? parseInt(getFlagValue('--class')!, 10) : null;
const targetTopic = getFlagValue('--topic');
const targetDir = getFlagValue('--dir');
const dryRun = args.includes('--dry-run');
const concurrency = Math.min(
  Math.max(parseInt(getFlagValue('--concurrency') || '5', 10) || 5, 1),
  10,
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLASS_AGE_MAP: Record<number, string> = {
  1: '5-6 year old',
  2: '6-7 year old',
  3: '7-8 year old',
  4: '8-9 year old',
  5: '9-10 year old',
  6: '10-11 year old',
  7: '11-12 year old',
  8: '12-13 year old',
  9: '13-14 year old',
  10: '14-15 year old',
};

const DATA_DIR = path.join(__dirname, '..', 'questions', 'data');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Option {
  id: string;
  text: string;
}

interface OrderingItem {
  id: string;
  text: string;
}

interface Question {
  question_id: string;
  type: string;
  concept_id?: string;
  difficulty?: string;
  question_text: string;
  options?: Option[];
  correct_answer?: string | boolean | string[] | Record<string, string>;
  ordering_items?: string[];
  items?: OrderingItem[];
  correct_order?: string[];
  explanation_correct?: string | null;
  explanation_incorrect?: string | null;
  [key: string]: unknown;
}

interface CanonicalExplanation {
  text?: string;
  rules?: string[];
}

interface CamReference {
  cam_version?: string;
  board: string;
  class: number;
  subject: string;
}

interface QuestionFile {
  version: string;
  cam_reference: CamReference;
  topic_id: string;
  topic_name: string;
  canonical_explanation?: CanonicalExplanation;
  questions: Question[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process items with a bounded concurrency limit using a worker-pool pattern.
 */
async function processWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift()!;
        await fn(item);
      }
    },
  );
  await Promise.all(workers);
}

/**
 * Check whether a question already has both explanations filled in.
 */
function hasExplanations(q: Question): boolean {
  return (
    typeof q.explanation_correct === 'string' &&
    q.explanation_correct.trim().length > 0 &&
    typeof q.explanation_incorrect === 'string' &&
    q.explanation_incorrect.trim().length > 0
  );
}

/**
 * Build the prompt for a single question, matching the structure from the
 * existing generate-explanations.ts script.
 */
function buildPrompt(
  q: Question,
  file: QuestionFile,
): string {
  const classLevel = file.cam_reference.class;
  const subjectName = file.cam_reference.subject;
  const age =
    CLASS_AGE_MAP[classLevel] ||
    `${classLevel + 4}-${classLevel + 5} year old`;

  // Build question-specific context
  let questionContext = '';
  if (q.type === 'mcq' && q.options) {
    const optionsStr = q.options
      .map(opt => `${opt.id}) ${opt.text}`)
      .join('\n');
    questionContext = `Options:\n${optionsStr}`;
  } else if (q.type === 'ordering') {
    if (q.ordering_items) {
      // Array-of-strings format (older/class10 style)
      questionContext = `Items to arrange: ${q.ordering_items.join(', ')}`;
    } else if (q.items) {
      // Array-of-objects format (class4-science style)
      const itemsStr = q.items
        .map(item => `${item.id}) ${item.text}`)
        .join(', ');
      questionContext = `Items to arrange: ${itemsStr}`;
    }
  } else if (q.type === 'fill_blank') {
    const answer =
      typeof q.correct_answer === 'object'
        ? JSON.stringify(q.correct_answer)
        : String(q.correct_answer);
    questionContext = `Accepted answer (exact format): ${answer}`;
  } else if (q.type === 'true_false') {
    questionContext = `Answer: ${String(q.correct_answer)}`;
  }

  // Format correct answer
  let correctAnswerStr: string;
  if (q.type === 'ordering') {
    if (q.correct_order) {
      correctAnswerStr = q.correct_order.join(', ');
    } else if (
      Array.isArray(q.correct_answer)
    ) {
      correctAnswerStr = (q.correct_answer as string[]).join(', ');
    } else {
      correctAnswerStr = String(q.correct_answer ?? '');
    }
  } else if (typeof q.correct_answer === 'object') {
    correctAnswerStr = JSON.stringify(q.correct_answer);
  } else {
    correctAnswerStr = String(q.correct_answer);
  }

  const canonicalText = file.canonical_explanation?.text
    ? `Topic context: ${file.canonical_explanation.text}`
    : '';

  return `You are writing explanations for a Class ${classLevel} student (ICSE board, ${subjectName}).
Use simple language appropriate for a ${age}. Be concise and specific to this exact question.

Topic: ${file.topic_name}
${canonicalText}

Question type: ${q.type}
Question: ${q.question_text}
${questionContext}
Correct answer: ${correctAnswerStr}

Generate two explanations:

1. CORRECT EXPLANATION (1-2 sentences): Reinforce WHY the answer is correct. Don't just say "correct" — explain the reasoning briefly so the concept sticks.

2. INCORRECT EXPLANATION (2-3 sentences): Explain the correct answer step-by-step. For true/false questions, address the most common misconception that would lead to the wrong answer. For fill_blank, mention the exact accepted answer format. For MCQ, explain why the correct option is right (don't enumerate why each wrong option is wrong).

Respond in JSON format:
{"explanation_correct": "...", "explanation_incorrect": "..."}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();

  // Validate data directory
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  // Initialize Claude client (reads ANTHROPIC_API_KEY from env)
  const anthropic = dryRun ? null : new Anthropic();

  // Discover subdirectories
  let subdirs: string[];
  if (targetDir) {
    const dirPath = path.join(DATA_DIR, targetDir);
    if (!fs.existsSync(dirPath)) {
      console.error(`Directory not found: ${dirPath}`);
      process.exit(1);
    }
    subdirs = [targetDir];
  } else {
    subdirs = fs
      .readdirSync(DATA_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
  }

  // Collect all JSON files to process
  interface FileEntry {
    filePath: string;
    subdir: string;
  }

  const allFiles: FileEntry[] = [];
  for (const subdir of subdirs) {
    const dirPath = path.join(DATA_DIR, subdir);
    const jsonFiles = fs
      .readdirSync(dirPath)
      .filter(f => f.startsWith('T') && f.endsWith('.json'))
      .sort();
    for (const jsonFile of jsonFiles) {
      allFiles.push({ filePath: path.join(dirPath, jsonFile), subdir });
    }
  }

  // Counters
  let totalFiles = 0;
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalFilesWritten = 0;

  // Print configuration
  console.log('=== Generate Explanations to Files ===');
  if (dryRun) console.log('MODE: DRY RUN (no API calls, no file writes)');
  if (targetSubject) console.log(`Filter subject: ${targetSubject}`);
  if (targetClass) console.log(`Filter class: ${targetClass}`);
  if (targetTopic) console.log(`Filter topic: ${targetTopic}`);
  if (targetDir) console.log(`Filter dir: ${targetDir}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Data dir: ${DATA_DIR}`);
  console.log(`Found ${allFiles.length} JSON files in ${subdirs.length} directories`);
  console.log('');

  // Process files sequentially; questions within a file run concurrently
  for (const { filePath, subdir } of allFiles) {
    // Read and parse JSON file
    let fileData: QuestionFile;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      fileData = JSON.parse(raw) as QuestionFile;
    } catch (err) {
      console.error(`ERROR reading ${filePath}: ${err instanceof Error ? err.message : err}`);
      totalErrors++;
      continue;
    }

    // Apply filters
    if (targetSubject && fileData.cam_reference.subject.toLowerCase() !== targetSubject.toLowerCase()) {
      continue;
    }
    if (targetClass !== null && fileData.cam_reference.class !== targetClass) {
      continue;
    }
    if (targetTopic && fileData.topic_id !== targetTopic) {
      continue;
    }

    totalFiles++;

    // Identify questions needing explanations
    const questionsToProcess = fileData.questions.filter(q => !hasExplanations(q));
    const skippedInFile = fileData.questions.length - questionsToProcess.length;
    totalSkipped += skippedInFile;

    if (questionsToProcess.length === 0) {
      continue;
    }

    const relPath = path.relative(DATA_DIR, filePath);
    console.log(
      `\n[${relPath}] ${questionsToProcess.length} need explanations, ${skippedInFile} already done`,
    );

    let errorsInFile = 0;
    let processedInFile = 0;

    // Process questions within this file with concurrency
    await processWithConcurrency(
      questionsToProcess,
      concurrency,
      async (q: Question) => {
        const prompt = buildPrompt(q, fileData);

        if (dryRun) {
          processedInFile++;
          totalProcessed++;
          console.log(`  [DRY] ${q.question_id} (${q.type})`);
          console.log(`    Q: ${q.question_text.substring(0, 80)}...`);
          console.log(`    Prompt length: ${prompt.length} chars`);
          return;
        }

        try {
          const response = await anthropic!.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          });

          const responseText =
            response.content[0].type === 'text' ? response.content[0].text : '';

          // Parse JSON from response (handle possible markdown code blocks)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.error(`  ERROR ${q.question_id}: No JSON in response`);
            errorsInFile++;
            totalErrors++;
            return;
          }

          const parsed = JSON.parse(jsonMatch[0]) as {
            explanation_correct: string;
            explanation_incorrect: string;
          };

          if (!parsed.explanation_correct || !parsed.explanation_incorrect) {
            console.error(`  ERROR ${q.question_id}: Empty explanations in response`);
            errorsInFile++;
            totalErrors++;
            return;
          }

          // Update question in-place (mutating the fileData object)
          q.explanation_correct = parsed.explanation_correct;
          q.explanation_incorrect = parsed.explanation_incorrect;

          processedInFile++;
          totalProcessed++;
          console.log(`  OK ${q.question_id}`);
        } catch (err) {
          console.error(
            `  ERROR ${q.question_id}: ${err instanceof Error ? err.message : err}`,
          );
          errorsInFile++;
          totalErrors++;
        }
      },
    );

    // Write file back only if we actually processed questions (not dry-run)
    if (!dryRun && processedInFile > 0) {
      try {
        const json = JSON.stringify(fileData, null, 2) + '\n';
        fs.writeFileSync(filePath, json, 'utf-8');
        totalFilesWritten++;
        console.log(
          `  WRITTEN ${relPath} (${processedInFile} updated, ${errorsInFile} errors)`,
        );
      } catch (err) {
        console.error(
          `  ERROR writing ${filePath}: ${err instanceof Error ? err.message : err}`,
        );
        totalErrors++;
      }
    } else if (dryRun && processedInFile > 0) {
      console.log(`  [DRY] Would write ${relPath} (${processedInFile} questions)`);
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files scanned:   ${totalFiles}`);
  console.log(`Files written:         ${totalFilesWritten}`);
  console.log(`Questions processed:   ${totalProcessed}`);
  console.log(`Questions skipped:     ${totalSkipped} (already had explanations)`);
  console.log(`Errors:                ${totalErrors}`);
  console.log(`Elapsed time:          ${elapsed}s`);
  if (dryRun) console.log('\n(DRY RUN — no API calls made, no files modified)');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
