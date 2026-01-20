import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function seedCAM(camFilePath: string): Promise<void> {
  console.log(`Seeding CAM from: ${camFilePath}\n`);

  if (!fs.existsSync(camFilePath)) {
    console.error(`CAM file not found: ${camFilePath}`);
    process.exit(1);
  }

  const camData: CAMData = JSON.parse(fs.readFileSync(camFilePath, 'utf8'));
  console.log(`Loaded CAM version ${camData.version}`);
  console.log(`Board: ${camData.board}, Class: ${camData.class}, Subject: ${camData.subject}`);
  if (camData.academic_year) {
    console.log(`Academic Year: ${camData.academic_year}`);
  }
  console.log('');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create or find curriculum using UPSERT
    const displayName = `${camData.board} Class ${camData.class} ${camData.subject}`;
    const curriculumResult = await client.query(
      `INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (board, class_level, subject) DO UPDATE SET
         cam_version = EXCLUDED.cam_version,
         academic_year = COALESCE(EXCLUDED.academic_year, curricula.academic_year),
         updated_at = NOW()
       RETURNING id, is_active`,
      [
        camData.board,
        camData.class,
        camData.subject,
        camData.academic_year || null,
        camData.version,
        displayName,
      ]
    );
    const curriculumId = curriculumResult.rows[0].id;
    const isNew = curriculumResult.rowCount === 1 && !curriculumResult.rows[0].is_active;
    console.log(`Curriculum ID: ${curriculumId}`);
    console.log(`Curriculum: ${displayName} (${isNew ? 'created' : 'updated'})\n`);

    let themeCount = 0;
    let topicCount = 0;
    let conceptCount = 0;

    // 2. Seed themes with curriculum_id
    for (const theme of camData.themes) {
      const themeResult = await client.query(
        `INSERT INTO themes (curriculum_id, theme_id, theme_name, theme_order, cam_version)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (curriculum_id, theme_id) DO UPDATE SET
           theme_name = EXCLUDED.theme_name,
           theme_order = EXCLUDED.theme_order,
           cam_version = EXCLUDED.cam_version
         RETURNING id`,
        [
          curriculumId,
          theme.theme_id,
          theme.theme_name,
          theme.theme_order || themeCount,
          camData.version,
        ]
      );
      const themeUuid = themeResult.rows[0].id;
      themeCount++;

      console.log(`  Theme: ${theme.theme_id} - ${theme.theme_name}`);

      // 3. Seed topics with curriculum_id
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
            curriculumId,
            themeUuid,
            topic.topic_id,
            topic.topic_name,
            topic.topic_order || topicCount,
            JSON.stringify(topic.boundaries?.in_scope || []),
            JSON.stringify(topic.boundaries?.out_of_scope || []),
            JSON.stringify(topic.numeric_limits || {}),
          ]
        );
        const topicUuid = topicResult.rows[0].id;
        topicCount++;

        console.log(`    Topic: ${topic.topic_id} - ${topic.topic_name}`);

        // 4. Seed concepts with curriculum_id
        for (const concept of topic.concepts) {
          await client.query(
            `INSERT INTO concepts (curriculum_id, topic_id, concept_id, concept_name, difficulty_levels)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (curriculum_id, concept_id) DO UPDATE SET
               topic_id = EXCLUDED.topic_id,
               concept_name = EXCLUDED.concept_name,
               difficulty_levels = EXCLUDED.difficulty_levels`,
            [
              curriculumId,
              topicUuid,
              concept.concept_id,
              concept.concept_name,
              concept.difficulty_levels || ['familiarity', 'application', 'exam_style'],
            ]
          );
          conceptCount++;
        }

        console.log(`      ${topic.concepts.length} concepts`);
      }
    }

    await client.query('COMMIT');

    console.log('\n--- Summary ---');
    console.log(`Curriculum: ${displayName}`);
    console.log(`Themes: ${themeCount}`);
    console.log(`Topics: ${topicCount}`);
    console.log(`Concepts: ${conceptCount}`);
    console.log('\nCAM seeding completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding CAM:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Allow passing CAM file as argument
const camFile = process.argv[2] || path.join(__dirname, '../../cam/data/icse-class5-mathematics-cam.json');
seedCAM(camFile).catch((error) => {
  console.error('CAM seeding failed:', error);
  process.exit(1);
});
