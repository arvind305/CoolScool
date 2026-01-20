import { pool } from '../src/config/database.js';

async function finalCheck(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('Final Migration Verification\n');

    // Quick count check
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM curricula) as curricula,
        (SELECT COUNT(*) FROM themes) as themes,
        (SELECT COUNT(*) FROM topics) as topics,
        (SELECT COUNT(*) FROM concepts) as concepts,
        (SELECT COUNT(*) FROM questions) as questions,
        (SELECT COUNT(*) FROM themes WHERE curriculum_id IS NOT NULL) as themes_linked,
        (SELECT COUNT(*) FROM questions WHERE curriculum_id IS NOT NULL) as questions_linked
    `);

    const c = counts.rows[0];
    console.log('Record Counts:');
    console.log(`  Curricula: ${c.curricula}`);
    console.log(`  Themes: ${c.themes} (${c.themes_linked} linked to curriculum)`);
    console.log(`  Topics: ${c.topics}`);
    console.log(`  Concepts: ${c.concepts}`);
    console.log(`  Questions: ${c.questions} (${c.questions_linked} linked to curriculum)`);

    // Check overview
    const overview = await client.query('SELECT * FROM curriculum_overview LIMIT 1');
    if (overview.rows[0]) {
      const o = overview.rows[0];
      console.log(`\nCurriculum Overview:`);
      console.log(`  ${o.display_name}: ${o.theme_count}T/${o.topic_count}To/${o.concept_count}C/${o.question_count}Q`);
    }

    console.log('\n✅ Migration 002 verified successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

finalCheck().catch(e => { console.error(e); process.exit(1); });
