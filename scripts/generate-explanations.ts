/**
 * Generate per-question explanations using Claude API
 *
 * Usage:
 *   npx tsx scripts/generate-explanations.ts
 *   npx tsx scripts/generate-explanations.ts --topic T01.01
 *   npx tsx scripts/generate-explanations.ts --topic T01.01 --dry-run
 *   npx tsx scripts/generate-explanations.ts --class 5
 *   npx tsx scripts/generate-explanations.ts --subject Physics
 *   npx tsx scripts/generate-explanations.ts --subject Science --class 3
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'coolscool-backend', '.env') });

import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';

const { Pool } = pg;

// Parse CLI args
const args = process.argv.slice(2);
const topicFlag = args.indexOf('--topic');
const classFlag = args.indexOf('--class');
const subjectFlag = args.indexOf('--subject');
const dryRun = args.includes('--dry-run');
const targetTopic = topicFlag !== -1 ? args[topicFlag + 1] : null;
const targetClass = classFlag !== -1 ? parseInt(args[classFlag + 1], 10) : null;
const targetSubject = subjectFlag !== -1 ? args[subjectFlag + 1] : null;

// Class level to age mapping
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

// Rate limiting: 5 requests/second
const RATE_LIMIT_MS = 200;
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface QuestionRow {
  id: string;
  question_id: string;
  topic_id_str: string;
  curriculum_id: string;
  difficulty: string;
  question_type: string;
  question_text: string;
  options: { id: string; text: string }[] | null;
  correct_answer: string | boolean | string[] | Record<string, string>;
  match_pairs: { left: string; right: string }[] | null;
  ordering_items: string[] | null;
  explanation_correct: string | null;
  explanation_incorrect: string | null;
}

interface TopicInfo {
  topic_id: string;
  topic_name: string;
  class_level: number;
  canonical_explanation: string | null;
}

async function main() {
  // Connect to database
  const dbUrl = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  // Initialize Claude client
  const anthropic = new Anthropic();

  try {
    // Build query for questions needing explanations
    let whereClause = '(q.explanation_correct IS NULL OR q.explanation_incorrect IS NULL)';
    const params: (string | number)[] = [];

    if (targetTopic) {
      params.push(targetTopic);
      whereClause += ` AND q.topic_id_str = $${params.length}`;
    }

    if (targetClass) {
      params.push(targetClass);
      whereClause += ` AND c.class_level = $${params.length}`;
    }

    if (targetSubject) {
      params.push(targetSubject);
      whereClause += ` AND LOWER(c.subject) = LOWER($${params.length})`;
    }

    // Get questions with topic info
    const questionsResult = await pool.query<QuestionRow & { topic_name: string; class_level: number; subject: string; canonical_explanation_text: string | null }>(
      `SELECT q.*, t.topic_name, c.class_level, c.subject,
              ce.explanation_text as canonical_explanation_text
       FROM questions q
       JOIN topics t ON q.topic_id_str = t.topic_id AND q.curriculum_id = t.curriculum_id
       JOIN curricula c ON q.curriculum_id = c.id
       LEFT JOIN canonical_explanations ce ON ce.topic_id = t.id AND ce.curriculum_id = q.curriculum_id
       WHERE ${whereClause}
       ORDER BY c.class_level, q.topic_id_str, q.question_id`,
      params
    );

    const questions = questionsResult.rows;
    const total = questions.length;

    if (total === 0) {
      console.log('No questions need explanations. All done!');
      return;
    }

    console.log(`Found ${total} questions needing explanations${dryRun ? ' (DRY RUN)' : ''}`);
    if (targetTopic) console.log(`Filtering to topic: ${targetTopic}`);
    if (targetClass) console.log(`Filtering to class: ${targetClass}`);
    if (targetSubject) console.log(`Filtering to subject: ${targetSubject}`);

    let processed = 0;
    let errors = 0;

    for (const q of questions) {
      processed++;
      const age = CLASS_AGE_MAP[q.class_level] || `${q.class_level + 4}-${q.class_level + 5} year old`;

      // Build question-specific context
      let questionContext = '';
      if (q.question_type === 'mcq' && q.options) {
        const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const optionsStr = q.options.map((opt, i) => `${optionLetters[i]}) ${opt.text || opt}`).join('\n');
        questionContext = `Options:\n${optionsStr}`;
      } else if (q.question_type === 'match' && q.match_pairs) {
        const pairsStr = q.match_pairs.map(p => `${p.left} → ${p.right}`).join('\n');
        questionContext = `Pairs:\n${pairsStr}`;
      } else if (q.question_type === 'ordering' && q.ordering_items) {
        questionContext = `Items to arrange: ${q.ordering_items.join(', ')}`;
      } else if (q.question_type === 'fill_blank') {
        questionContext = `Accepted answer (exact format): ${q.correct_answer}`;
      }

      const correctAnswerStr = typeof q.correct_answer === 'object'
        ? JSON.stringify(q.correct_answer)
        : String(q.correct_answer);

      const subjectName = q.subject || 'Mathematics';
      const prompt = `You are writing explanations for a Class ${q.class_level} student (ICSE board, ${subjectName}).
Use simple language appropriate for a ${age}. Be concise and specific to this exact question.

Topic: ${q.topic_name}
${q.canonical_explanation_text ? `Topic context: ${q.canonical_explanation_text}` : ''}

Question type: ${q.question_type}
Question: ${q.question_text}
${questionContext}
Correct answer: ${correctAnswerStr}

Generate two explanations:

1. CORRECT EXPLANATION (1-2 sentences): Reinforce WHY the answer is correct. Don't just say "correct" — explain the reasoning briefly so the concept sticks.

2. INCORRECT EXPLANATION (2-3 sentences): Explain the correct answer step-by-step. For true/false questions, address the most common misconception that would lead to the wrong answer. For fill_blank, mention the exact accepted answer format. For MCQ, explain why the correct option is right (don't enumerate why each wrong option is wrong).

Respond in JSON format:
{"explanation_correct": "...", "explanation_incorrect": "..."}`;

      if (dryRun) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`[${processed}/${total}] ${q.question_id} (Class ${q.class_level})`);
        console.log(`Topic: ${q.topic_name}`);
        console.log(`Question: ${q.question_text}`);
        console.log(`Type: ${q.question_type}`);
        console.log(`\nPROMPT:\n${prompt}`);
      }

      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`[${processed}/${total}] ${q.question_id} — FAILED: No JSON in response`);
          errors++;
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]) as { explanation_correct: string; explanation_incorrect: string };

        if (dryRun) {
          console.log(`\nRESPONSE:`);
          console.log(`  correct: ${parsed.explanation_correct}`);
          console.log(`  incorrect: ${parsed.explanation_incorrect}`);
        } else {
          // Update database
          await pool.query(
            `UPDATE questions SET explanation_correct = $1, explanation_incorrect = $2, updated_at = NOW() WHERE id = $3`,
            [parsed.explanation_correct, parsed.explanation_incorrect, q.id]
          );
          console.log(`[${processed}/${total}] ${q.question_id} — done`);
        }
      } catch (err) {
        console.error(`[${processed}/${total}] ${q.question_id} — ERROR: ${err instanceof Error ? err.message : err}`);
        errors++;
      }

      // Rate limiting
      await sleep(RATE_LIMIT_MS);
    }

    console.log(`\nComplete! Processed: ${processed}, Errors: ${errors}`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
