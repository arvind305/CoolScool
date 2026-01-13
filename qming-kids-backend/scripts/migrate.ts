import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, '../src/db/migrations');

  // Get all migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s):\n`);

  for (const file of files) {
    console.log(`Running: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} completed\n`);
    } catch (error) {
      console.error(`  ✗ ${file} failed:`);
      console.error(error);
      throw error;
    }
  }

  console.log('\nAll migrations completed successfully!');
  await pool.end();
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
