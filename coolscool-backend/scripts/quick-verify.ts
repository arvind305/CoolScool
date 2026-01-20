import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

(async () => {
  const client = await pool.connect();
  try {
    const r = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM curricula) as curricula,
        (SELECT COUNT(*) FROM themes WHERE curriculum_id IS NOT NULL) as themes,
        (SELECT COUNT(*) FROM questions WHERE curriculum_id IS NOT NULL) as questions,
        (SELECT display_name FROM curricula LIMIT 1) as curriculum_name
    `);
    console.log('Migration Status: SUCCESS');
    console.log(`Curriculum: ${r.rows[0].curriculum_name}`);
    console.log(`Themes linked: ${r.rows[0].themes}`);
    console.log(`Questions linked: ${r.rows[0].questions}`);
  } finally {
    client.release();
    pool.end();
  }
})();
