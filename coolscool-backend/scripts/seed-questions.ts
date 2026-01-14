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
}

interface CanonicalExplanation {
  text: string;
  rules: string[];
}

interface QuestionBank {
  version: string;
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

async function seedQuestions(): Promise<void> {
  console.log('Seeding questions...\n');

  // Path to questions directory
  const questionsDir = path.join(__dirname, '../../questions/data');

  if (!fs.existsSync(questionsDir)) {
    console.error(`Questions directory not found: ${questionsDir}`);
    process.exit(1);
  }

  // Get all question JSON files
  const files = fs.readdirSync(questionsDir)
    .filter(f => f.endsWith('.json') && f.startsWith('T'))
    .sort();

  console.log(`Found ${files.length} question bank files\n`);

  const client = await pool.connect();
  let totalQuestions = 0;
  let totalExplanations = 0;

  try {
    await client.query('BEGIN');

    for (const file of files) {
      const filePath = path.join(questionsDir, file);
      const data: QuestionBank = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      console.log(`Processing: ${file}`);
      console.log(`  Topic: ${data.topic_id} - ${data.topic_name}`);

      // Get topic UUID from database
      const topicResult = await client.query(
        'SELECT id FROM topics WHERE topic_id = $1',
        [data.topic_id]
      );

      if (topicResult.rows.length === 0) {
        console.warn(`  ⚠ Topic ${data.topic_id} not found in database, skipping...`);
        continue;
      }

      const topicUuid = topicResult.rows[0].id;

      // Insert canonical explanation if present
      if (data.canonical_explanation) {
        await client.query(
          `INSERT INTO canonical_explanations (topic_id, explanation_text, rules)
           VALUES ($1, $2, $3)
           ON CONFLICT (topic_id) DO UPDATE SET
             explanation_text = EXCLUDED.explanation_text,
             rules = EXCLUDED.rules`,
          [
            topicUuid,
            data.canonical_explanation.text,
            data.canonical_explanation.rules || [],
          ]
        );
        totalExplanations++;
      }

      // Insert questions
      let questionCount = 0;
      for (const q of data.questions) {
        // Get concept UUID
        const conceptResult = await client.query(
          'SELECT id FROM concepts WHERE concept_id = $1',
          [q.concept_id]
        );

        if (conceptResult.rows.length === 0) {
          console.warn(`    ⚠ Concept ${q.concept_id} not found, skipping question ${q.question_id}`);
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
             question_id, concept_id, concept_id_str, topic_id_str,
             difficulty, question_type, question_text, options,
             correct_answer, match_pairs, ordering_items, hint, tags
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (question_id) DO UPDATE SET
             question_text = EXCLUDED.question_text,
             options = EXCLUDED.options,
             correct_answer = EXCLUDED.correct_answer,
             match_pairs = EXCLUDED.match_pairs,
             ordering_items = EXCLUDED.ordering_items,
             hint = EXCLUDED.hint,
             tags = EXCLUDED.tags`,
          [
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
          ]
        );
        questionCount++;
      }

      totalQuestions += questionCount;
      console.log(`  ✓ Inserted ${questionCount} questions\n`);
    }

    await client.query('COMMIT');

    console.log('--- Summary ---');
    console.log(`Question banks processed: ${files.length}`);
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

seedQuestions().catch((error) => {
  console.error('Question seeding failed:', error);
  process.exit(1);
});
