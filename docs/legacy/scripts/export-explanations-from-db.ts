/**
 * Export per-question explanations from PostgreSQL database into JSON question files.
 *
 * The database has ~16,098 questions with explanation_correct and explanation_incorrect
 * fields populated. This script pulls those explanations and writes them into the
 * corresponding JSON files in questions/data/.
 *
 * Usage:
 *   npx tsx scripts/export-explanations-from-db.ts
 *   npx tsx scripts/export-explanations-from-db.ts --dry-run
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'coolscool-backend', '.env') });

const { Pool } = pg;

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

interface DBRow {
  question_id: string;
  explanation_correct: string;
  explanation_incorrect: string;
  board: string;
  class_level: number;
  subject: string;
}

interface QuestionFile {
  version: string;
  cam_reference: {
    cam_version?: string;
    board: string;
    class: number;
    subject: string;
  };
  topic_id: string;
  topic_name: string;
  canonical_explanation?: unknown;
  questions: Array<{
    question_id: string;
    [key: string]: unknown;
  }>;
  metadata?: unknown;
  [key: string]: unknown;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not found in environment. Check coolscool-backend/.env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Step 1: Fetch all questions with non-null explanations from DB
    console.log('Connecting to database and fetching explanations...');

    const result = await pool.query<DBRow>(
      `SELECT q.question_id, q.explanation_correct, q.explanation_incorrect,
              c.board, c.class_level, c.subject
       FROM questions q
       JOIN curricula c ON q.curriculum_id = c.id
       WHERE q.explanation_correct IS NOT NULL AND q.explanation_incorrect IS NOT NULL`
    );

    const rows = result.rows;
    console.log(`Fetched ${rows.length} questions with explanations from database.\n`);

    if (rows.length === 0) {
      console.log('No explanations found in the database. Nothing to export.');
      return;
    }

    // Step 2: Build lookup map keyed by board|class_level|subject|question_id
    const explanationMap = new Map<string, { explanation_correct: string; explanation_incorrect: string }>();

    for (const row of rows) {
      const key = `${row.board}|${row.class_level}|${row.subject}|${row.question_id}`;
      explanationMap.set(key, {
        explanation_correct: row.explanation_correct,
        explanation_incorrect: row.explanation_incorrect,
      });
    }

    console.log(`Built lookup map with ${explanationMap.size} entries.\n`);

    // Step 3: Scan all subdirectories in questions/data/
    const dataDir = path.join(__dirname, '..', 'questions', 'data');

    if (!fs.existsSync(dataDir)) {
      console.error(`Questions data directory not found: ${dataDir}`);
      process.exit(1);
    }

    const subdirs = fs.readdirSync(dataDir).filter(d => {
      const fullPath = path.join(dataDir, d);
      return fs.statSync(fullPath).isDirectory();
    }).sort();

    console.log(`Found ${subdirs.length} subdirectories in questions/data/\n`);

    // Counters for summary
    let filesProcessed = 0;
    let filesWritten = 0;
    let questionsEnriched = 0;
    let questionsNoMatch = 0;
    let questionsTotal = 0;

    // Step 4: Process each JSON file in each subdirectory
    for (const subdir of subdirs) {
      const subdirPath = path.join(dataDir, subdir);
      const jsonFiles = fs.readdirSync(subdirPath)
        .filter(f => f.endsWith('.json') && f.startsWith('T'))
        .sort();

      for (const jsonFile of jsonFiles) {
        const filePath = path.join(subdirPath, jsonFile);
        filesProcessed++;

        // Read and parse the JSON file
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const data: QuestionFile = JSON.parse(rawContent);

        if (!data.cam_reference || !data.questions) {
          console.warn(`  SKIP ${subdir}/${jsonFile}: missing cam_reference or questions`);
          continue;
        }

        const { board, subject } = data.cam_reference;
        const classLevel = data.cam_reference.class;

        let fileEnriched = 0;
        let fileNoMatch = 0;

        for (const question of data.questions) {
          questionsTotal++;
          const key = `${board}|${classLevel}|${subject}|${question.question_id}`;
          const explanation = explanationMap.get(key);

          if (explanation) {
            question.explanation_correct = explanation.explanation_correct;
            question.explanation_incorrect = explanation.explanation_incorrect;
            fileEnriched++;
            questionsEnriched++;
          } else {
            fileNoMatch++;
            questionsNoMatch++;
          }
        }

        // Only write the file if at least one question was enriched
        if (fileEnriched > 0) {
          if (dryRun) {
            console.log(`  [DRY RUN] Would write ${subdir}/${jsonFile} — ${fileEnriched} enriched, ${fileNoMatch} no match`);
          } else {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
            console.log(`  WROTE ${subdir}/${jsonFile} — ${fileEnriched} enriched, ${fileNoMatch} no match`);
          }
          filesWritten++;
        }
      }
    }

    // Step 5: Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode:                  ${dryRun ? 'DRY RUN (no files written)' : 'LIVE'}`);
    console.log(`DB explanations:       ${explanationMap.size}`);
    console.log(`Files processed:       ${filesProcessed}`);
    console.log(`Files written:         ${filesWritten}`);
    console.log(`Total questions:       ${questionsTotal}`);
    console.log(`Questions enriched:    ${questionsEnriched}`);
    console.log(`Questions no DB match: ${questionsNoMatch}`);
    console.log('='.repeat(60));

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
