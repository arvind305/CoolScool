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
  themes: Theme[];
}

async function seedCAM(): Promise<void> {
  console.log('Seeding CAM data...\n');

  // Path to CAM JSON file
  const camPath = path.join(__dirname, '../../cam/data/icse-class5-mathematics-cam.json');

  if (!fs.existsSync(camPath)) {
    console.error(`CAM file not found: ${camPath}`);
    process.exit(1);
  }

  const camData: CAMData = JSON.parse(fs.readFileSync(camPath, 'utf8'));
  console.log(`Loaded CAM version ${camData.version}`);
  console.log(`Board: ${camData.board}, Class: ${camData.class}, Subject: ${camData.subject}\n`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let themeCount = 0;
    let topicCount = 0;
    let conceptCount = 0;

    // Insert themes
    for (const theme of camData.themes) {
      const themeResult = await client.query(
        `INSERT INTO themes (theme_id, theme_name, theme_order, cam_version, board, class_level, subject)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (theme_id) DO UPDATE SET
           theme_name = EXCLUDED.theme_name,
           theme_order = EXCLUDED.theme_order
         RETURNING id`,
        [
          theme.theme_id,
          theme.theme_name,
          theme.theme_order || themeCount,
          camData.version,
          camData.board,
          camData.class,
          camData.subject,
        ]
      );
      const themeUuid = themeResult.rows[0].id;
      themeCount++;

      console.log(`  Theme: ${theme.theme_id} - ${theme.theme_name}`);

      // Insert topics
      for (const topic of theme.topics) {
        const topicResult = await client.query(
          `INSERT INTO topics (theme_id, topic_id, topic_name, topic_order, boundaries_in_scope, boundaries_out_of_scope, numeric_limits)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (topic_id) DO UPDATE SET
             topic_name = EXCLUDED.topic_name,
             topic_order = EXCLUDED.topic_order,
             boundaries_in_scope = EXCLUDED.boundaries_in_scope,
             boundaries_out_of_scope = EXCLUDED.boundaries_out_of_scope,
             numeric_limits = EXCLUDED.numeric_limits
           RETURNING id`,
          [
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

        // Insert concepts
        for (const concept of topic.concepts) {
          await client.query(
            `INSERT INTO concepts (topic_id, concept_id, concept_name, difficulty_levels)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (concept_id) DO UPDATE SET
               concept_name = EXCLUDED.concept_name,
               difficulty_levels = EXCLUDED.difficulty_levels`,
            [
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

seedCAM().catch((error) => {
  console.error('CAM seeding failed:', error);
  process.exit(1);
});
