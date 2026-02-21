/**
 * Seed ALL CBSE content in a single process
 *
 * Seeds: Mathematics (1-12), EVS (1-5), Physics/Chemistry/Biology (6-12)
 * Uses a single DB connection pool to avoid Neon connection limits.
 *
 * Usage: npx tsx scripts/seed-cbse-all.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create a resilient pool for seeding (low max, no process.exit on error)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.warn('Pool idle client error (non-fatal):', err.message);
});

// ── Types ──────────────────────────────────────────────────────

interface Concept {
  concept_id: string;
  concept_name: string;
  difficulty_levels?: string[];
}

interface Topic {
  topic_id: string;
  topic_name: string;
  topic_order?: number;
  concepts: Concept[];
  boundaries?: { in_scope?: string[]; out_of_scope?: string[] };
  numeric_limits?: Record<string, unknown>;
}

interface Theme {
  theme_id: string;
  theme_name: string;
  theme_order?: number;
  topics: Topic[];
}

interface CAMData {
  version: string;
  board: string;
  class: number;
  subject: string;
  academic_year?: string;
  themes: Theme[];
}

interface Question {
  question_id: string;
  concept_id: string;
  difficulty: string;
  cognitive_level?: string;
  type: string;
  question_text: string;
  options?: { id: string; text: string }[];
  correct_answer?: unknown;
  match_pairs?: Record<string, string>;
  ordering_items?: string[];
  hint?: string;
  tags?: string[];
  explanation_correct?: string;
  explanation_incorrect?: string;
  image_url?: string;
  option_images?: Record<string, string>;
}

interface QuestionBank {
  version: string;
  cam_reference?: { cam_version: string; board: string; class: number; subject: string };
  topic_id: string;
  topic_name: string;
  canonical_explanation?: { text: string; rules: string[] };
  questions: Question[];
}

interface SeedResult {
  themes: number;
  topics: number;
  concepts: number;
  questions: number;
  explanations: number;
}

// ── Seed one CAM + its questions ───────────────────────────────

async function seedCurriculumAndQuestions(
  camFilePath: string,
  questionsDirPath: string
): Promise<SeedResult> {
  if (!fs.existsSync(camFilePath)) {
    console.warn(`  ⚠ CAM not found: ${camFilePath}`);
    return { themes: 0, topics: 0, concepts: 0, questions: 0, explanations: 0 };
  }

  const camData: CAMData = JSON.parse(fs.readFileSync(camFilePath, 'utf8'));
  const label = `${camData.board} Class ${camData.class} ${camData.subject}`;
  console.log(`\n  Seeding: ${label}`);

  const client = await pool.connect();
  let themeCount = 0, topicCount = 0, conceptCount = 0, questionCount = 0, explanationCount = 0;

  try {
    await client.query('BEGIN');

    // 1. Upsert curriculum
    const displayName = label;
    const currResult = await client.query(
      `INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (board, class_level, subject) DO UPDATE SET
         cam_version = EXCLUDED.cam_version,
         academic_year = COALESCE(EXCLUDED.academic_year, curricula.academic_year),
         display_name = EXCLUDED.display_name,
         is_active = true,
         updated_at = NOW()
       RETURNING id`,
      [camData.board, camData.class, camData.subject, camData.academic_year || null, camData.version, displayName]
    );
    const curriculumId = currResult.rows[0].id;

    // 2. Seed themes → topics → concepts
    for (const theme of camData.themes) {
      const themeResult = await client.query(
        `INSERT INTO themes (curriculum_id, theme_id, theme_name, theme_order, cam_version)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (curriculum_id, theme_id) DO UPDATE SET
           theme_name = EXCLUDED.theme_name,
           theme_order = EXCLUDED.theme_order,
           cam_version = EXCLUDED.cam_version
         RETURNING id`,
        [curriculumId, theme.theme_id, theme.theme_name, theme.theme_order ?? themeCount, camData.version]
      );
      const themeUuid = themeResult.rows[0].id;
      themeCount++;

      for (const topic of theme.topics) {
        const topicResult = await client.query(
          `INSERT INTO topics (curriculum_id, theme_id, topic_id, topic_name, topic_order, boundaries_in_scope, boundaries_out_of_scope, numeric_limits)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (curriculum_id, topic_id) DO UPDATE SET
             theme_id = EXCLUDED.theme_id,
             topic_name = EXCLUDED.topic_name,
             topic_order = EXCLUDED.topic_order,
             boundaries_in_scope = EXCLUDED.boundaries_in_scope,
             boundaries_out_of_scope = EXCLUDED.boundaries_out_of_scope,
             numeric_limits = EXCLUDED.numeric_limits
           RETURNING id`,
          [
            curriculumId, themeUuid, topic.topic_id, topic.topic_name,
            topic.topic_order ?? topicCount,
            JSON.stringify(topic.boundaries?.in_scope || []),
            JSON.stringify(topic.boundaries?.out_of_scope || []),
            JSON.stringify(topic.numeric_limits || {}),
          ]
        );
        const topicUuid = topicResult.rows[0].id;
        topicCount++;

        for (const concept of topic.concepts) {
          await client.query(
            `INSERT INTO concepts (curriculum_id, topic_id, concept_id, concept_name, difficulty_levels)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (curriculum_id, concept_id) DO UPDATE SET
               topic_id = EXCLUDED.topic_id,
               concept_name = EXCLUDED.concept_name,
               difficulty_levels = EXCLUDED.difficulty_levels`,
            [
              curriculumId, topicUuid, concept.concept_id, concept.concept_name,
              concept.difficulty_levels || ['familiarity', 'application', 'exam_style'],
            ]
          );
          conceptCount++;
        }
      }
    }

    // 3. Pre-load concept and topic UUID maps (one query each instead of one per question)
    const conceptMapResult = await client.query(
      'SELECT concept_id, id FROM concepts WHERE curriculum_id = $1',
      [curriculumId]
    );
    const conceptMap = new Map<string, string>();
    for (const row of conceptMapResult.rows) {
      conceptMap.set(row.concept_id, row.id);
    }

    const topicMapResult = await client.query(
      'SELECT topic_id, id FROM topics WHERE curriculum_id = $1',
      [curriculumId]
    );
    const topicMap = new Map<string, string>();
    for (const row of topicMapResult.rows) {
      topicMap.set(row.topic_id, row.id);
    }

    // 4. Seed questions from directory (batched)
    const BATCH_SIZE = 100;
    const COLS = 19;

    if (fs.existsSync(questionsDirPath)) {
      const files = fs.readdirSync(questionsDirPath)
        .filter(f => f.endsWith('.json') && f.startsWith('T'))
        .sort();

      for (const file of files) {
        const data: QuestionBank = JSON.parse(fs.readFileSync(path.join(questionsDirPath, file), 'utf8'));

        const topicUuid = topicMap.get(data.topic_id);
        if (!topicUuid) {
          console.warn(`    ⚠ Topic ${data.topic_id} not found, skipping ${file}`);
          continue;
        }

        // Canonical explanation
        if (data.canonical_explanation) {
          await client.query(
            `INSERT INTO canonical_explanations (curriculum_id, topic_id, explanation_text, rules)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (topic_id) DO UPDATE SET
               curriculum_id = EXCLUDED.curriculum_id,
               explanation_text = EXCLUDED.explanation_text,
               rules = EXCLUDED.rules`,
            [curriculumId, topicUuid, data.canonical_explanation.text, data.canonical_explanation.rules || []]
          );
          explanationCount++;
        }

        // Filter valid questions
        const validQuestions = data.questions.filter(q => conceptMap.has(q.concept_id));

        // Batch-insert questions
        for (let i = 0; i < validQuestions.length; i += BATCH_SIZE) {
          const batch = validQuestions.slice(i, i + BATCH_SIZE);
          const valuesClauses: string[] = [];
          const params: unknown[] = [];

          batch.forEach((q, idx) => {
            const o = idx * COLS;
            valuesClauses.push(
              `($${o+1}::uuid, $${o+2}, $${o+3}::uuid, $${o+4}, $${o+5}, $${o+6}, $${o+7}, $${o+8}, $${o+9}, $${o+10}::jsonb, $${o+11}::jsonb, $${o+12}::jsonb, $${o+13}::jsonb, $${o+14}, $${o+15}::text[], $${o+16}, $${o+17}, $${o+18}, $${o+19}::jsonb)`
            );

            let correctAnswer = q.correct_answer;
            if (!correctAnswer) {
              if (q.type === 'match' && q.match_pairs) correctAnswer = q.match_pairs;
              else if (q.type === 'ordering' && q.ordering_items) correctAnswer = q.ordering_items;
            }

            params.push(
              curriculumId, q.question_id, conceptMap.get(q.concept_id)!, q.concept_id, data.topic_id,
              q.difficulty, q.cognitive_level || 'recall', q.type, q.question_text,
              q.options ? JSON.stringify(q.options) : null,
              JSON.stringify(correctAnswer),
              q.match_pairs ? JSON.stringify(q.match_pairs) : null,
              q.ordering_items ? JSON.stringify(q.ordering_items) : null,
              q.hint || null, q.tags || [],
              q.explanation_correct || null, q.explanation_incorrect || null,
              q.image_url || null,
              q.option_images ? JSON.stringify(q.option_images) : null,
            );
          });

          if (valuesClauses.length > 0) {
            await client.query(
              `INSERT INTO questions (
                 curriculum_id, question_id, concept_id, concept_id_str, topic_id_str,
                 difficulty, cognitive_level, question_type, question_text, options,
                 correct_answer, match_pairs, ordering_items, hint, tags,
                 explanation_correct, explanation_incorrect,
                 image_url, option_images
               )
               VALUES ${valuesClauses.join(',\n')}
               ON CONFLICT (curriculum_id, question_id) DO UPDATE SET
                 concept_id = EXCLUDED.concept_id,
                 concept_id_str = EXCLUDED.concept_id_str,
                 topic_id_str = EXCLUDED.topic_id_str,
                 question_text = EXCLUDED.question_text,
                 cognitive_level = EXCLUDED.cognitive_level,
                 options = EXCLUDED.options,
                 correct_answer = EXCLUDED.correct_answer,
                 match_pairs = EXCLUDED.match_pairs,
                 ordering_items = EXCLUDED.ordering_items,
                 hint = EXCLUDED.hint,
                 tags = EXCLUDED.tags,
                 explanation_correct = COALESCE(EXCLUDED.explanation_correct, questions.explanation_correct),
                 explanation_incorrect = COALESCE(EXCLUDED.explanation_incorrect, questions.explanation_incorrect),
                 image_url = COALESCE(EXCLUDED.image_url, questions.image_url),
                 option_images = COALESCE(EXCLUDED.option_images, questions.option_images)`,
              params
            );
            questionCount += batch.length;
          }
        }
      }
    } else {
      console.warn(`    ⚠ Questions dir not found: ${questionsDirPath}`);
    }

    await client.query('COMMIT');
    console.log(`    ✓ ${themeCount} themes, ${topicCount} topics, ${conceptCount} concepts, ${questionCount} questions, ${explanationCount} explanations`);

    return { themes: themeCount, topics: topicCount, concepts: conceptCount, questions: questionCount, explanations: explanationCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=' .repeat(70));
  console.log('Seeding ALL CBSE Content');
  console.log('=' .repeat(70));

  const totals = { themes: 0, topics: 0, concepts: 0, questions: 0, explanations: 0 };
  let errors = 0;

  // Define all CBSE curricula to seed
  const curricula: { camFile: string; questionsDir: string }[] = [];

  // Mathematics: Classes 1-12
  for (let cls = 1; cls <= 12; cls++) {
    curricula.push({
      camFile: path.join(rootDir, `cam/data/cbse-class${cls}-mathematics-cam.json`),
      questionsDir: path.join(rootDir, `questions/data/cbse-class${cls}`),
    });
  }

  // EVS: Classes 1-5
  for (let cls = 1; cls <= 5; cls++) {
    curricula.push({
      camFile: path.join(rootDir, `cam/data/cbse-class${cls}-evs-cam.json`),
      questionsDir: path.join(rootDir, `questions/data/cbse-class${cls}-evs`),
    });
  }

  // Physics, Chemistry, Biology: Classes 6-12
  for (let cls = 6; cls <= 12; cls++) {
    for (const subj of ['physics', 'chemistry', 'biology']) {
      curricula.push({
        camFile: path.join(rootDir, `cam/data/cbse-class${cls}-${subj}-cam.json`),
        questionsDir: path.join(rootDir, `questions/data/cbse-class${cls}-${subj}`),
      });
    }
  }

  console.log(`\nTotal curricula to seed: ${curricula.length}\n`);

  for (const { camFile, questionsDir } of curricula) {
    try {
      const result = await seedCurriculumAndQuestions(camFile, questionsDir);
      totals.themes += result.themes;
      totals.topics += result.topics;
      totals.concepts += result.concepts;
      totals.questions += result.questions;
      totals.explanations += result.explanations;
    } catch (error) {
      const err = error as Error;
      console.error(`  ✗ ERROR: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Curricula processed: ${curricula.length} (${errors} errors)`);
  console.log(`  Themes:       ${totals.themes}`);
  console.log(`  Topics:       ${totals.topics}`);
  console.log(`  Concepts:     ${totals.concepts}`);
  console.log(`  Questions:    ${totals.questions}`);
  console.log(`  Explanations: ${totals.explanations}`);

  if (errors > 0) {
    console.error(`\n${errors} curricula had errors. Check output above.`);
    process.exit(1);
  }

  console.log('\nAll CBSE content seeded successfully!');
  await pool.end();
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
