/**
 * Script to remove the Class 6 test curriculum from the database
 *
 * This removes the ICSE Class 6 Mathematics curriculum that was created
 * for testing multi-curriculum support. The deletion cascades through:
 * - Questions
 * - Canonical explanations
 * - Concepts
 * - Topics
 * - Themes
 * - Curriculum entry
 *
 * Usage: npx tsx scripts/remove-class6-curriculum.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function removeClass6Curriculum() {
  const client = await pool.connect();

  try {
    console.log('Starting Class 6 curriculum removal...\n');

    // Find the Class 6 curriculum
    const curriculumResult = await client.query(
      `SELECT id, display_name FROM curricula
       WHERE board = 'ICSE' AND class_level = 6 AND subject = 'Mathematics'`
    );

    if (curriculumResult.rows.length === 0) {
      console.log('No ICSE Class 6 Mathematics curriculum found in database.');
      return;
    }

    const curriculum = curriculumResult.rows[0];
    console.log(`Found curriculum: ${curriculum.display_name} (${curriculum.id})`);

    // Start transaction
    await client.query('BEGIN');

    // Delete in correct order due to foreign keys
    // 1. Delete questions
    const questionsResult = await client.query(
      'DELETE FROM questions WHERE curriculum_id = $1',
      [curriculum.id]
    );
    console.log(`Deleted ${questionsResult.rowCount} questions`);

    // 2. Delete canonical explanations
    const explanationsResult = await client.query(
      'DELETE FROM canonical_explanations WHERE curriculum_id = $1',
      [curriculum.id]
    );
    console.log(`Deleted ${explanationsResult.rowCount} canonical explanations`);

    // 3. Delete concepts
    const conceptsResult = await client.query(
      'DELETE FROM concepts WHERE curriculum_id = $1',
      [curriculum.id]
    );
    console.log(`Deleted ${conceptsResult.rowCount} concepts`);

    // 4. Delete topics
    const topicsResult = await client.query(
      'DELETE FROM topics WHERE curriculum_id = $1',
      [curriculum.id]
    );
    console.log(`Deleted ${topicsResult.rowCount} topics`);

    // 5. Delete themes
    const themesResult = await client.query(
      'DELETE FROM themes WHERE curriculum_id = $1',
      [curriculum.id]
    );
    console.log(`Deleted ${themesResult.rowCount} themes`);

    // 6. Delete the curriculum itself
    await client.query(
      'DELETE FROM curricula WHERE id = $1',
      [curriculum.id]
    );
    console.log(`Deleted curriculum: ${curriculum.display_name}`);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✓ Class 6 curriculum removal completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing curriculum:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
removeClass6Curriculum()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
