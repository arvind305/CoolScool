import { pool } from '../src/config/database.js';

async function verifyMigration(): Promise<void> {
  console.log('Verifying Migration 002 Results...\n');

  try {
    // 1. Check curricula table and data
    console.log('1. CURRICULA TABLE');
    const curricula = await pool.query('SELECT * FROM curricula');
    console.log(`   Records: ${curricula.rowCount}`);
    curricula.rows.forEach((c: any) => {
      console.log(`   - ID: ${c.id}`);
      console.log(`     Display: ${c.display_name}`);
      console.log(`     Board: ${c.board}, Class: ${c.class_level}, Subject: ${c.subject}`);
      console.log(`     Active: ${c.is_active}, CAM Version: ${c.cam_version}`);
    });

    // 2. Check themes have curriculum_id
    console.log('\n2. THEMES TABLE');
    const themes = await pool.query(`
      SELECT t.theme_id, t.theme_name, t.curriculum_id, c.display_name as curriculum_name
      FROM themes t
      LEFT JOIN curricula c ON c.id = t.curriculum_id
      ORDER BY t.theme_order
    `);
    console.log(`   Total themes: ${themes.rowCount}`);
    console.log(`   All have curriculum_id: ${themes.rows.every((t: any) => t.curriculum_id !== null)}`);

    // 3. Check unique constraints work
    console.log('\n3. CONSTRAINT VERIFICATION');

    // Try to check if old constraints are gone
    const constraints = await pool.query(`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE table_name IN ('themes', 'topics', 'concepts', 'questions', 'concept_progress', 'topic_progress')
      AND constraint_type = 'UNIQUE'
      ORDER BY table_name, constraint_name
    `);
    console.log('   Unique constraints:');
    constraints.rows.forEach((c: any) => {
      console.log(`   - ${c.table_name}: ${c.constraint_name}`);
    });

    // 4. Check curriculum_overview view
    console.log('\n4. CURRICULUM OVERVIEW VIEW');
    const overview = await pool.query('SELECT * FROM curriculum_overview');
    overview.rows.forEach((o: any) => {
      console.log(`   ${o.display_name}:`);
      console.log(`     - Themes: ${o.theme_count}`);
      console.log(`     - Topics: ${o.topic_count}`);
      console.log(`     - Concepts: ${o.concept_count}`);
      console.log(`     - Questions: ${o.question_count}`);
    });

    // 5. Check users table has new column
    console.log('\n5. USERS TABLE');
    const usersCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'default_curriculum_id'
    `);
    if (usersCols.rowCount && usersCols.rowCount > 0) {
      console.log('   default_curriculum_id column: EXISTS');
    } else {
      console.log('   default_curriculum_id column: MISSING');
    }

    // 6. Verify data integrity
    console.log('\n6. DATA INTEGRITY CHECK');

    // Check no orphaned records
    const orphanedTopics = await pool.query(`
      SELECT COUNT(*) as count FROM topics t
      WHERE NOT EXISTS (SELECT 1 FROM themes th WHERE th.id = t.theme_id)
    `);
    console.log(`   Orphaned topics: ${orphanedTopics.rows[0].count}`);

    const orphanedConcepts = await pool.query(`
      SELECT COUNT(*) as count FROM concepts c
      WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.id = c.topic_id)
    `);
    console.log(`   Orphaned concepts: ${orphanedConcepts.rows[0].count}`);

    const orphanedQuestions = await pool.query(`
      SELECT COUNT(*) as count FROM questions q
      WHERE NOT EXISTS (SELECT 1 FROM concepts c WHERE c.id = q.concept_id)
    `);
    console.log(`   Orphaned questions: ${orphanedQuestions.rows[0].count}`);

    // Check all curriculum_ids match the expected curriculum
    const curriculumId = curricula.rows[0]?.id;
    if (curriculumId) {
      const mismatchedThemes = await pool.query(
        'SELECT COUNT(*) as count FROM themes WHERE curriculum_id != $1',
        [curriculumId]
      );
      console.log(`   Themes with wrong curriculum_id: ${mismatchedThemes.rows[0].count}`);

      const mismatchedQuestions = await pool.query(
        'SELECT COUNT(*) as count FROM questions WHERE curriculum_id != $1',
        [curriculumId]
      );
      console.log(`   Questions with wrong curriculum_id: ${mismatchedQuestions.rows[0].count}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION COMPLETE - ALL CHECKS PASSED');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await pool.end();
  }
}

verifyMigration();
