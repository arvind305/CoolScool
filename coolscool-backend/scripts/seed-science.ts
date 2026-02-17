/**
 * Seed All ICSE Science Classes (1-10)
 *
 * This script seeds Science curriculum and questions:
 * - Classes 1-5: General Science (EVS)
 * - Classes 6-10: Physics, Chemistry, Biology as separate subjects
 *
 * Usage:
 *   npx tsx scripts/seed-science.ts
 *   npx tsx scripts/seed-science.ts --class 8
 *   npx tsx scripts/seed-science.ts --subject Physics
 *   npx tsx scripts/seed-science.ts --class 8 --subject Physics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Parse CLI args
const args = process.argv.slice(2);
const classFlag = args.indexOf('--class');
const subjectFlag = args.indexOf('--subject');
const boardFlag = args.indexOf('--board');
const targetClass = classFlag !== -1 ? parseInt(args[classFlag + 1], 10) : null;
const targetSubject = subjectFlag !== -1 ? args[subjectFlag + 1]?.toLowerCase() : null;
const BOARD = boardFlag !== -1 && args[boardFlag + 1] ? args[boardFlag + 1].toLowerCase() : 'icse';

// Science subject configuration
interface SubjectConfig {
  subject: string;
  subjectName: string;
  classRange: [number, number];
  topicFilePattern: (cls: number) => string;
  questionDirPattern: (cls: number) => string;
}

const SCIENCE_SUBJECTS: SubjectConfig[] = [
  {
    subject: 'science',
    subjectName: 'Science',
    classRange: [1, 5],
    topicFilePattern: (cls) => `cam/data/topics/${BOARD}-class${cls}-science-topics.json`,
    questionDirPattern: (cls) => `${BOARD === 'icse' ? '' : BOARD + '-'}class${cls}-science`,
  },
  {
    subject: 'evs',
    subjectName: 'EVS',
    classRange: [1, 5],
    topicFilePattern: (cls) => `cam/data/topics/${BOARD}-class${cls}-evs-topics.json`,
    questionDirPattern: (cls) => `${BOARD === 'icse' ? '' : BOARD + '-'}class${cls}-evs`,
  },
  {
    subject: 'physics',
    subjectName: 'Physics',
    classRange: [6, 12],
    topicFilePattern: (cls) => `cam/data/topics/${BOARD}-class${cls}-physics-topics.json`,
    questionDirPattern: (cls) => `${BOARD === 'icse' ? '' : BOARD + '-'}class${cls}-physics`,
  },
  {
    subject: 'chemistry',
    subjectName: 'Chemistry',
    classRange: [6, 12],
    topicFilePattern: (cls) => `cam/data/topics/${BOARD}-class${cls}-chemistry-topics.json`,
    questionDirPattern: (cls) => `${BOARD === 'icse' ? '' : BOARD + '-'}class${cls}-chemistry`,
  },
  {
    subject: 'biology',
    subjectName: 'Biology',
    classRange: [6, 12],
    topicFilePattern: (cls) => `cam/data/topics/${BOARD}-class${cls}-biology-topics.json`,
    questionDirPattern: (cls) => `${BOARD === 'icse' ? '' : BOARD + '-'}class${cls}-biology`,
  },
];

interface TopicConcept {
  concept_id: string;
  concept_name: string;
  difficulty_levels?: string[];
}

interface TopicDef {
  id: string;
  name: string;
  concepts: TopicConcept[];
  boundaries?: {
    in_scope?: string[];
    out_of_scope?: string[];
  };
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
  // Ordering question alternative format
  items?: OrderingItem[];
  correct_order?: string[];
  explanation_correct?: string;
  explanation_incorrect?: string;
  image_url?: string;
  option_images?: Record<string, string>;
}

interface QuestionBank {
  version: string;
  topic_id: string;
  topic_name: string;
  canonical_explanation?: {
    text: string;
    rules: string[];
  };
  questions: Question[];
}

async function seedSubjectClass(
  subjectConfig: SubjectConfig,
  classLevel: number
): Promise<{ topics: number; concepts: number; questions: number; explanations: number }> {
  const topicFilePath = path.join(rootDir, subjectConfig.topicFilePattern(classLevel));
  const questionsDir = path.join(rootDir, 'questions', 'data', subjectConfig.questionDirPattern(classLevel));

  if (!fs.existsSync(topicFilePath)) {
    console.warn(`  Topic file not found: ${topicFilePath}`);
    return { topics: 0, concepts: 0, questions: 0, explanations: 0 };
  }
  if (!fs.existsSync(questionsDir)) {
    console.warn(`  Questions dir not found: ${questionsDir}`);
    return { topics: 0, concepts: 0, questions: 0, explanations: 0 };
  }

  const topics: TopicDef[] = JSON.parse(fs.readFileSync(topicFilePath, 'utf8'));
  console.log(`\n  Seeding Class ${classLevel} ${subjectConfig.subjectName}: ${topics.length} topics`);

  const client = await pool.connect();
  let topicCount = 0, conceptCount = 0, questionCount = 0, explanationCount = 0;

  try {
    await client.query('BEGIN');

    // 1. Upsert curriculum
    const displayName = `${BOARD.toUpperCase()} Class ${classLevel} ${subjectConfig.subjectName}`;
    const curriculumResult = await client.query(
      `INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (board, class_level, subject) DO UPDATE SET
         cam_version = EXCLUDED.cam_version,
         display_name = EXCLUDED.display_name,
         is_active = true,
         updated_at = NOW()
       RETURNING id`,
      [BOARD.toUpperCase(), classLevel, subjectConfig.subjectName, '2025-2026', '1.0.0', displayName]
    );
    const curriculumId = curriculumResult.rows[0].id;

    // 2. Create a default theme for this subject (Science topics don't have themes)
    const themeResult = await client.query(
      `INSERT INTO themes (curriculum_id, theme_id, theme_name, theme_order, cam_version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (curriculum_id, theme_id) DO UPDATE SET
         theme_name = EXCLUDED.theme_name
       RETURNING id`,
      [curriculumId, 'T01', subjectConfig.subjectName, 1, '1.0.0']
    );
    const themeUuid = themeResult.rows[0].id;

    // 3. Seed topics and concepts
    for (const topic of topics) {
      const topicResult = await client.query(
        `INSERT INTO topics (curriculum_id, theme_id, topic_id, topic_name, topic_order, boundaries_in_scope, boundaries_out_of_scope)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (curriculum_id, topic_id) DO UPDATE SET
           theme_id = EXCLUDED.theme_id,
           topic_name = EXCLUDED.topic_name,
           topic_order = EXCLUDED.topic_order,
           boundaries_in_scope = EXCLUDED.boundaries_in_scope,
           boundaries_out_of_scope = EXCLUDED.boundaries_out_of_scope
         RETURNING id`,
        [
          curriculumId, themeUuid, topic.id, topic.name,
          topicCount,
          JSON.stringify(topic.boundaries?.in_scope || []),
          JSON.stringify(topic.boundaries?.out_of_scope || []),
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

    // 4. Seed questions from question files
    const files = fs.readdirSync(questionsDir)
      .filter(f => f.endsWith('.json') && f.startsWith('T'))
      .sort();

    for (const file of files) {
      const filePath = path.join(questionsDir, file);
      const data: QuestionBank = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Get topic UUID
      const topicResult = await client.query(
        'SELECT id FROM topics WHERE curriculum_id = $1 AND topic_id = $2',
        [curriculumId, data.topic_id]
      );

      if (topicResult.rows.length === 0) {
        console.warn(`    WARNING: Topic ${data.topic_id} not found, skipping ${file}`);
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
          // Try to find by pattern match (some concept IDs might be slightly different)
          continue;
        }
        const conceptUuid = conceptResult.rows[0].id;

        let correctAnswer = q.correct_answer;
        let orderingItems = q.ordering_items;

        // Handle ordering questions with items/correct_order format
        if (q.type === 'ordering') {
          if (q.items && q.correct_order) {
            // Convert items array to ordering_items format (just the text values in correct order)
            orderingItems = q.correct_order.map(id => {
              const item = q.items!.find(i => i.id === id);
              return item ? item.text : id;
            });
            correctAnswer = q.correct_order;
          } else if (q.ordering_items && !correctAnswer) {
            correctAnswer = q.ordering_items;
          }
        }

        await client.query(
          `INSERT INTO questions (
             curriculum_id, question_id, concept_id, concept_id_str, topic_id_str,
             difficulty, cognitive_level, question_type, question_text, options,
             correct_answer, ordering_items,
             explanation_correct, explanation_incorrect,
             image_url, option_images
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (curriculum_id, question_id) DO UPDATE SET
             concept_id = EXCLUDED.concept_id,
             concept_id_str = EXCLUDED.concept_id_str,
             topic_id_str = EXCLUDED.topic_id_str,
             question_text = EXCLUDED.question_text,
             cognitive_level = EXCLUDED.cognitive_level,
             options = EXCLUDED.options,
             correct_answer = EXCLUDED.correct_answer,
             ordering_items = EXCLUDED.ordering_items,
             explanation_correct = COALESCE(EXCLUDED.explanation_correct, questions.explanation_correct),
             explanation_incorrect = COALESCE(EXCLUDED.explanation_incorrect, questions.explanation_incorrect),
             image_url = COALESCE(EXCLUDED.image_url, questions.image_url),
             option_images = COALESCE(EXCLUDED.option_images, questions.option_images)`,
          [
            curriculumId, q.question_id, conceptUuid, q.concept_id, data.topic_id,
            q.difficulty, q.cognitive_level || 'recall', q.type, q.question_text,
            q.options ? JSON.stringify(q.options) : null,
            JSON.stringify(correctAnswer),
            orderingItems ? JSON.stringify(orderingItems) : null,
            q.explanation_correct || null,
            q.explanation_incorrect || null,
            q.image_url || null,
            q.option_images ? JSON.stringify(q.option_images) : null,
          ]
        );
        questionCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`    Topics: ${topicCount}, Concepts: ${conceptCount}, Questions: ${questionCount}`);

    return { topics: topicCount, concepts: conceptCount, questions: questionCount, explanations: explanationCount };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log(`Seeding ${BOARD.toUpperCase()} Science Curriculum`);
  console.log('='.repeat(70));

  if (targetClass) console.log(`Filtering to class: ${targetClass}`);
  if (targetSubject) console.log(`Filtering to subject: ${targetSubject}`);

  let totalTopics = 0, totalConcepts = 0, totalQuestions = 0;

  for (const subjectConfig of SCIENCE_SUBJECTS) {
    // Filter by subject if specified
    if (targetSubject && subjectConfig.subject !== targetSubject) {
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Subject: ${subjectConfig.subjectName} (Classes ${subjectConfig.classRange[0]}-${subjectConfig.classRange[1]})`);
    console.log('='.repeat(60));

    for (let cls = subjectConfig.classRange[0]; cls <= subjectConfig.classRange[1]; cls++) {
      // Filter by class if specified
      if (targetClass && cls !== targetClass) {
        continue;
      }

      try {
        const result = await seedSubjectClass(subjectConfig, cls);
        totalTopics += result.topics;
        totalConcepts += result.concepts;
        totalQuestions += result.questions;
      } catch (error) {
        console.error(`  ERROR seeding Class ${cls} ${subjectConfig.subjectName}:`, error);
      }
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total Topics: ${totalTopics}`);
  console.log(`  Total Concepts: ${totalConcepts}`);
  console.log(`  Total Questions: ${totalQuestions}`);
  console.log('\nScience curriculum seeding complete!');
  console.log('\nNext step: Run explanation generation:');
  console.log('  npx tsx scripts/generate-explanations.ts --subject Science');
  console.log('  npx tsx scripts/generate-explanations.ts --subject Physics');
  console.log('  npx tsx scripts/generate-explanations.ts --subject Chemistry');
  console.log('  npx tsx scripts/generate-explanations.ts --subject Biology');

  await pool.end();
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
