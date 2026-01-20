import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration002(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Running Migration 002: Multi-Curriculum Support');
  console.log('='.repeat(60));
  console.log('');

  const migrationPath = path.join(__dirname, '../src/db/migrations/002_multi_curriculum_support.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = await pool.connect();

  try {
    // Check if migration has already been run
    const curriculaCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'curricula'
      ) as exists
    `);

    if (curriculaCheck.rows[0].exists) {
      console.log('⚠ Migration 002 appears to have already been run (curricula table exists).');
      console.log('  Skipping to avoid duplicate operations.');
      return;
    }

    console.log('Starting migration within transaction...\n');

    await client.query('BEGIN');

    // Run the migration
    await client.query(sql);

    await client.query('COMMIT');

    console.log('\n✅ Migration 002 completed successfully!\n');

    // Verify the migration
    console.log('Verifying migration results...\n');

    // Check curricula created
    const curricula = await client.query('SELECT * FROM curricula');
    console.log(`Curricula created: ${curricula.rowCount}`);
    curricula.rows.forEach((c: any) => {
      console.log(`  - ${c.display_name} (${c.board} Class ${c.class_level} ${c.subject})`);
    });

    // Check curriculum_id populated
    const themesCheck = await client.query('SELECT COUNT(*) as total, COUNT(curriculum_id) as with_curriculum FROM themes');
    console.log(`\nThemes: ${themesCheck.rows[0].total} total, ${themesCheck.rows[0].with_curriculum} with curriculum_id`);

    const topicsCheck = await client.query('SELECT COUNT(*) as total, COUNT(curriculum_id) as with_curriculum FROM topics');
    console.log(`Topics: ${topicsCheck.rows[0].total} total, ${topicsCheck.rows[0].with_curriculum} with curriculum_id`);

    const conceptsCheck = await client.query('SELECT COUNT(*) as total, COUNT(curriculum_id) as with_curriculum FROM concepts');
    console.log(`Concepts: ${conceptsCheck.rows[0].total} total, ${conceptsCheck.rows[0].with_curriculum} with curriculum_id`);

    const questionsCheck = await client.query('SELECT COUNT(*) as total, COUNT(curriculum_id) as with_curriculum FROM questions');
    console.log(`Questions: ${questionsCheck.rows[0].total} total, ${questionsCheck.rows[0].with_curriculum} with curriculum_id`);

    // Check the overview view
    const overview = await client.query('SELECT * FROM curriculum_overview');
    console.log('\nCurriculum Overview:');
    overview.rows.forEach((o: any) => {
      console.log(`  ${o.display_name}: ${o.theme_count} themes, ${o.topic_count} topics, ${o.concept_count} concepts, ${o.question_count} questions`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('Migration 002 COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back.');
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration002().catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
