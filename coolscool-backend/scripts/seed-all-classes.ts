/**
 * Seed All ICSE Mathematics Classes (1-4, 6-10)
 *
 * This script seeds CAM and questions for all ICSE Mathematics classes
 * except Class 5 (which is already live with user progress).
 *
 * Usage: npx tsx scripts/seed-all-classes.ts
 * Or:    npx tsx scripts/seed-all-classes.ts 7   (single class)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALL_CLASSES = [1, 2, 3, 4, 6, 7, 8, 9, 10];

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
  boundaries?: {
    in_scope?: string[];
    out_of_scope?: string[];
  };
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

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  question_id: string;
  concept_id: string;
  difficulty: string;
  type: string;
  question_text: string;
  options?: QuestionOption[];
  correct_answer: unknown;
  match_pairs?: { left: string; right: string }[];
  ordering_items?: string[];
  hint?: string;
  tags?: string[];
}

interface QuestionBank {
  version: string;
  cam_reference?: {
    cam_version: string;
    board: string;
    class: number;
    subject: string;
  };
  topic_id: string;
  topic_name: string;
  canonical_explanation?: {
    text: string;
    rules: string[];
  };
  questions: Question[];
}

async function seedClass(classLevel: number): Promise<{
  themes: number;
  topics: number;
  concepts: number;
  questions: number;
  explanations: number;
}> {
  const camFile = path.join(__dirname, `../../cam/data/icse-class${classLevel}-mathematics-cam.json`);
  const questionsDir = path.join(__dirname, `../../questions/data/class${classLevel}`);

  if (!fs.existsSync(camFile)) {
    throw new Error(`CAM file not found: ${camFile}`);
  }
  if (!fs.existsSync(questionsDir)) {
    throw new Error(`Questions directory not found: ${questionsDir}`);
  }

  const camData: CAMData = JSON.parse(fs.readFileSync(camFile, 'utf8'));
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Seeding Class ${classLevel}: ${camData.board} ${camData.subject}`);
  console.log(`${'='.repeat(60)}`);

  const client = await pool.connect();
  let themeCount = 0, topicCount = 0, conceptCount = 0, questionCount = 0, explanationCount = 0;

  try {
    await client.query('BEGIN');

    // 1. Upsert curriculum
    const displayName = `${camData.board} Class ${camData.class} ${camData.subject}`;
    const curriculumResult = await client.query(
      `INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (board, class_level, subject) DO UPDATE SET
         cam_version = EXCLUDED.cam_version,
         academic_year = COALESCE(EXCLUDED.academic_year, curricula.academic_year),
         is_active = true,
         updated_at = NOW()
       RETURNING id`,
      [camData.board, camData.class, camData.subject, camData.academic_year || null, camData.version, displayName]
    );
    const curriculumId = curriculumResult.rows[0].id;
    console.log(`  Curriculum ID: ${curriculumId}`);

    // 2. Seed themes, topics, concepts
    for (const theme of camData.themes) {
      const themeResult = await client.query(
        `INSERT INTO themes (curriculum_id, theme_id, theme_name, theme_order, cam_version)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (curriculum_id, theme_id) DO UPDATE SET
           theme_name = EXCLUDED.theme_name,
           theme_order = EXCLUDED.theme_order,
           cam_version = EXCLUDED.cam_version
         RETURNING id`,
        [curriculumId, theme.theme_id, theme.theme_name, theme.theme_order || themeCount, camData.version]
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
            topic.topic_order || topicCount,
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

    // 3. Seed questions from class directory
    const files = fs.readdirSync(questionsDir)
      .filter(f => f.endsWith('.json') && f.startsWith('T'))
      .sort();

    console.log(`  Found ${files.length} question bank files`);

    for (const file of files) {
      const filePath = path.join(questionsDir, file);
      const data: QuestionBank = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Get topic UUID
      const topicResult = await client.query(
        'SELECT id FROM topics WHERE curriculum_id = $1 AND topic_id = $2',
        [curriculumId, data.topic_id]
      );

      if (topicResult.rows.length === 0) {
        console.warn(`  WARNING: Topic ${data.topic_id} not found, skipping ${file}`);
        continue;
      }
      const topicUuid = topicResult.rows[0].id;

      // Insert canonical explanation
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

      // Insert questions
      for (const q of data.questions) {
        const conceptResult = await client.query(
          'SELECT id FROM concepts WHERE curriculum_id = $1 AND concept_id = $2',
          [curriculumId, q.concept_id]
        );

        if (conceptResult.rows.length === 0) {
          console.warn(`  WARNING: Concept ${q.concept_id} not found, skipping ${q.question_id}`);
          continue;
        }
        const conceptUuid = conceptResult.rows[0].id;

        let correctAnswer = q.correct_answer;
        if (!correctAnswer) {
          if (q.type === 'match' && q.match_pairs) {
            correctAnswer = q.match_pairs;
          } else if (q.type === 'ordering' && q.ordering_items) {
            correctAnswer = q.ordering_items;
          }
        }

        await client.query(
          `INSERT INTO questions (
             curriculum_id, question_id, concept_id, concept_id_str, topic_id_str,
             difficulty, question_type, question_text, options,
             correct_answer, match_pairs, ordering_items, hint, tags
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (curriculum_id, question_id) DO UPDATE SET
             concept_id = EXCLUDED.concept_id,
             concept_id_str = EXCLUDED.concept_id_str,
             topic_id_str = EXCLUDED.topic_id_str,
             question_text = EXCLUDED.question_text,
             options = EXCLUDED.options,
             correct_answer = EXCLUDED.correct_answer,
             match_pairs = EXCLUDED.match_pairs,
             ordering_items = EXCLUDED.ordering_items,
             hint = EXCLUDED.hint,
             tags = EXCLUDED.tags`,
          [
            curriculumId, q.question_id, conceptUuid, q.concept_id, data.topic_id,
            q.difficulty, q.type, q.question_text,
            q.options ? JSON.stringify(q.options) : null,
            JSON.stringify(correctAnswer),
            q.match_pairs ? JSON.stringify(q.match_pairs) : null,
            q.ordering_items ? JSON.stringify(q.ordering_items) : null,
            q.hint || null, q.tags || [],
          ]
        );
        questionCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`  Themes: ${themeCount}, Topics: ${topicCount}, Concepts: ${conceptCount}`);
    console.log(`  Questions: ${questionCount}, Explanations: ${explanationCount}`);

    return { themes: themeCount, topics: topicCount, concepts: conceptCount, questions: questionCount, explanations: explanationCount };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const singleClass = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const classesToSeed = singleClass ? [singleClass] : ALL_CLASSES;

  if (singleClass === 5) {
    console.error('ERROR: Class 5 is already live with user progress. Not re-seeding.');
    process.exit(1);
  }

  console.log(`Seeding ICSE Mathematics classes: ${classesToSeed.join(', ')}`);

  const results: Record<number, { themes: number; topics: number; concepts: number; questions: number; explanations: number }> = {};
  let hasErrors = false;

  for (const classLevel of classesToSeed) {
    try {
      results[classLevel] = await seedClass(classLevel);
    } catch (error) {
      console.error(`\nERROR seeding Class ${classLevel}:`, error);
      hasErrors = true;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);

  let totalQuestions = 0;
  for (const [cls, r] of Object.entries(results)) {
    console.log(`  Class ${cls}: ${r.themes} themes, ${r.topics} topics, ${r.concepts} concepts, ${r.questions} questions`);
    totalQuestions += r.questions;
  }
  console.log(`\n  Total questions seeded: ${totalQuestions}`);

  if (hasErrors) {
    console.error('\nSome classes had errors. Check output above.');
    process.exit(1);
  }

  console.log('\nAll classes seeded successfully!');
  await pool.end();
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
