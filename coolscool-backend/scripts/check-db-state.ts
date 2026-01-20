import { pool } from '../src/config/database.js';

async function checkDatabaseState(): Promise<void> {
  console.log('Checking database state...\n');

  try {
    // Check if curricula table exists (indicates migration 002 has run)
    const curriculaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'curricula'
      ) as exists
    `);
    console.log(`curricula table exists: ${curriculaCheck.rows[0].exists}`);

    // Check if themes table has curriculum_id column
    const themesCurriculumCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'themes' AND column_name = 'curriculum_id'
      ) as exists
    `);
    console.log(`themes.curriculum_id exists: ${themesCurriculumCheck.rows[0].exists}`);

    // Count existing data
    const themesCount = await pool.query('SELECT COUNT(*) as count FROM themes');
    console.log(`\nExisting data counts:`);
    console.log(`  themes: ${themesCount.rows[0].count}`);

    const topicsCount = await pool.query('SELECT COUNT(*) as count FROM topics');
    console.log(`  topics: ${topicsCount.rows[0].count}`);

    const conceptsCount = await pool.query('SELECT COUNT(*) as count FROM concepts');
    console.log(`  concepts: ${conceptsCount.rows[0].count}`);

    const questionsCount = await pool.query('SELECT COUNT(*) as count FROM questions');
    console.log(`  questions: ${questionsCount.rows[0].count}`);

    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`  users: ${usersCount.rows[0].count}`);

    const sessionsCount = await pool.query('SELECT COUNT(*) as count FROM quiz_sessions');
    console.log(`  quiz_sessions: ${sessionsCount.rows[0].count}`);

    console.log('\nDatabase state check complete.');
  } catch (error) {
    console.error('Error checking database state:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseState();
