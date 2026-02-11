import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  match_pairs?: Record<string, string>;
  ordering_items?: string[];
  hint?: string;
  tags?: string[];
  explanation_correct?: string;
  explanation_incorrect?: string;
  image_url?: string;
  option_images?: Record<string, string>;
}

interface CanonicalExplanation {
  text: string;
  rules: string[];
}

interface CAMReference {
  cam_version: string;
  board: string;
  class: number;
  subject: string;
}

interface QuestionBank {
  version: string;
  cam_reference?: CAMReference;
  topic_id: string;
  topic_name: string;
  canonical_explanation?: CanonicalExplanation;
  questions: Question[];
  metadata?: {
    question_count?: {
      total: number;
    };
  };
}

interface CurriculumCache {
  [key: string]: string; // "board|class|subject" -> curriculum_id
}

async function findOrValidateCurriculum(
  client: typeof pool,
  board: string,
  classLevel: number,
  subject: string,
  curriculumCache: CurriculumCache
): Promise<string | null> {
  const cacheKey = `${board}|${classLevel}|${subject}`;

  if (curriculumCache[cacheKey]) {
    return curriculumCache[cacheKey];
  }

  const result = await client.query(
    'SELECT id FROM curricula WHERE board = $1 AND class_level = $2 AND subject = $3',
    [board, classLevel, subject]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const curriculumId = result.rows[0].id;
  curriculumCache[cacheKey] = curriculumId;
  return curriculumId;
}

async function seedQuestions(questionsDir?: string): Promise<void> {
  console.log('Seeding questions...\n');

  // Path to questions directory
  const targetDir = questionsDir || path.join(__dirname, '../../questions/data');

  if (!fs.existsSync(targetDir)) {
    console.error(`Questions directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Get all question JSON files
  const files = fs.readdirSync(targetDir)
    .filter(f => f.endsWith('.json') && f.startsWith('T'))
    .sort();

  console.log(`Found ${files.length} question bank files in: ${targetDir}\n`);

  const client = await pool.connect();
  let totalQuestions = 0;
  let totalExplanations = 0;
  let skippedFiles = 0;

  // Cache curriculum lookups to avoid repeated queries
  const curriculumCache: CurriculumCache = {};

  try {
    await client.query('BEGIN');

    for (const file of files) {
      const filePath = path.join(targetDir, file);
      const data: QuestionBank = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      console.log(`Processing: ${file}`);
      console.log(`  Topic: ${data.topic_id} - ${data.topic_name}`);

      // Determine curriculum from cam_reference or fall back to topic lookup
      let curriculumId: string | null = null;

      if (data.cam_reference) {
        const { board, class: classLevel, subject } = data.cam_reference;
        console.log(`  Curriculum: ${board} Class ${classLevel} ${subject}`);

        curriculumId = await findOrValidateCurriculum(
          client,
          board,
          classLevel,
          subject,
          curriculumCache
        );

        if (!curriculumId) {
          console.warn(`  ⚠ Curriculum not found for ${board} Class ${classLevel} ${subject}, skipping...`);
          skippedFiles++;
          continue;
        }
      } else {
        // Fall back: look up curriculum from topic
        const topicResult = await client.query(
          'SELECT curriculum_id FROM topics WHERE topic_id = $1 LIMIT 1',
          [data.topic_id]
        );

        if (topicResult.rows.length === 0) {
          console.warn(`  ⚠ Topic ${data.topic_id} not found and no cam_reference, skipping...`);
          skippedFiles++;
          continue;
        }

        curriculumId = topicResult.rows[0].curriculum_id;
        console.log(`  Curriculum ID (from topic): ${curriculumId}`);
      }

      // Get topic UUID from database (scoped to curriculum)
      const topicResult = await client.query(
        'SELECT id FROM topics WHERE curriculum_id = $1 AND topic_id = $2',
        [curriculumId, data.topic_id]
      );

      if (topicResult.rows.length === 0) {
        console.warn(`  ⚠ Topic ${data.topic_id} not found in curriculum, skipping...`);
        skippedFiles++;
        continue;
      }

      const topicUuid = topicResult.rows[0].id;

      // Insert canonical explanation if present (scoped to curriculum via topic)
      if (data.canonical_explanation) {
        await client.query(
          `INSERT INTO canonical_explanations (curriculum_id, topic_id, explanation_text, rules)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (topic_id) DO UPDATE SET
             curriculum_id = EXCLUDED.curriculum_id,
             explanation_text = EXCLUDED.explanation_text,
             rules = EXCLUDED.rules`,
          [
            curriculumId,
            topicUuid,
            data.canonical_explanation.text,
            data.canonical_explanation.rules || [],
          ]
        );
        totalExplanations++;
      }

      // Insert questions with curriculum_id
      let questionCount = 0;
      for (const q of data.questions) {
        // Get concept UUID (scoped to curriculum)
        const conceptResult = await client.query(
          'SELECT id FROM concepts WHERE curriculum_id = $1 AND concept_id = $2',
          [curriculumId, q.concept_id]
        );

        if (conceptResult.rows.length === 0) {
          console.warn(`    ⚠ Concept ${q.concept_id} not found in curriculum, skipping question ${q.question_id}`);
          continue;
        }

        const conceptUuid = conceptResult.rows[0].id;

        // Derive correct_answer for match/ordering types if not explicitly provided
        let correctAnswer = q.correct_answer;
        if (!correctAnswer) {
          if (q.type === 'match' && q.match_pairs) {
            // For match questions, the correct answer is the pairing itself
            correctAnswer = q.match_pairs;
          } else if (q.type === 'ordering' && q.ordering_items) {
            // For ordering questions, the correct answer is the ordered list
            correctAnswer = q.ordering_items;
          }
        }

        await client.query(
          `INSERT INTO questions (
             curriculum_id, question_id, concept_id, concept_id_str, topic_id_str,
             difficulty, question_type, question_text, options,
             correct_answer, match_pairs, ordering_items, hint, tags,
             explanation_correct, explanation_incorrect,
             image_url, option_images
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
             tags = EXCLUDED.tags,
             explanation_correct = COALESCE(EXCLUDED.explanation_correct, questions.explanation_correct),
             explanation_incorrect = COALESCE(EXCLUDED.explanation_incorrect, questions.explanation_incorrect),
             image_url = COALESCE(EXCLUDED.image_url, questions.image_url),
             option_images = COALESCE(EXCLUDED.option_images, questions.option_images)`,
          [
            curriculumId,
            q.question_id,
            conceptUuid,
            q.concept_id,
            data.topic_id,
            q.difficulty,
            q.type,
            q.question_text,
            q.options ? JSON.stringify(q.options) : null,
            JSON.stringify(correctAnswer),
            q.match_pairs ? JSON.stringify(q.match_pairs) : null,
            q.ordering_items ? JSON.stringify(q.ordering_items) : null,
            q.hint || null,
            q.tags || [],
            q.explanation_correct || null,
            q.explanation_incorrect || null,
            q.image_url || null,
            q.option_images ? JSON.stringify(q.option_images) : null,
          ]
        );
        questionCount++;
      }

      totalQuestions += questionCount;
      console.log(`  ✓ Inserted ${questionCount} questions\n`);
    }

    await client.query('COMMIT');

    console.log('--- Summary ---');
    console.log(`Question banks processed: ${files.length - skippedFiles}`);
    if (skippedFiles > 0) {
      console.log(`Question banks skipped: ${skippedFiles}`);
    }
    console.log(`Canonical explanations: ${totalExplanations}`);
    console.log(`Total questions: ${totalQuestions}`);
    console.log('\nQuestion seeding completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding questions:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Allow passing questions directory as argument
const questionsDir = process.argv[2] || undefined;
seedQuestions(questionsDir).catch((error) => {
  console.error('Question seeding failed:', error);
  process.exit(1);
});
