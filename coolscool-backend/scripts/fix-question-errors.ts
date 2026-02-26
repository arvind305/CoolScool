/**
 * Fix Question Data Errors
 *
 * Fixes all errors found by validate-questions.ts:
 * 1. Mislabeled fill_blank → mcq (has options + single-letter answer)
 * 2. Numeric correct_answer in fill_blank (number → string)
 * 3. Ordering item typos (mismatched text between ordering_items and correct_answer)
 *
 * Usage: npx tsx scripts/fix-question-errors.ts
 *        npx tsx scripts/fix-question-errors.ts --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');
const questionsRoot = path.join(rootDir, 'questions', 'data');

const DRY_RUN = process.argv.includes('--dry-run');

interface Fix {
  file: string;
  questionId: string;
  fixType: string;
  description: string;
}

const fixes: Fix[] = [];

function discoverAllFiles(): { relPath: string; absPath: string }[] {
  const files: { relPath: string; absPath: string }[] = [];
  const dirs = fs.readdirSync(questionsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const dir of dirs) {
    const dirPath = path.join(questionsRoot, dir);
    const jsonFiles = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.json') && f.startsWith('T'))
      .sort();
    for (const f of jsonFiles) {
      files.push({ relPath: `${dir}/${f}`, absPath: path.join(dirPath, f) });
    }
  }
  return files;
}

function fixFile(relPath: string, absPath: string): boolean {
  const raw = fs.readFileSync(absPath, 'utf8');
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!data.questions || !Array.isArray(data.questions)) return false;

  let modified = false;

  for (const q of data.questions) {
    // Fix 1: Mislabeled fill_blank → mcq
    if (
      q.type === 'fill_blank' &&
      q.options && Array.isArray(q.options) && q.options.length > 0 &&
      typeof q.correct_answer === 'string' &&
      ['A', 'B', 'C', 'D'].includes(q.correct_answer)
    ) {
      fixes.push({
        file: relPath,
        questionId: q.question_id,
        fixType: 'fill_blank→mcq',
        description: `Changed type from "fill_blank" to "mcq" (had ${q.options.length} options, answer="${q.correct_answer}")`,
      });
      q.type = 'mcq';
      modified = true;
    }

    // Fix 2: Numeric correct_answer in fill_blank
    if (
      q.type === 'fill_blank' &&
      typeof q.correct_answer === 'number'
    ) {
      const oldVal = q.correct_answer;
      q.correct_answer = String(q.correct_answer);
      fixes.push({
        file: relPath,
        questionId: q.question_id,
        fixType: 'numeric→string',
        description: `Changed correct_answer from ${oldVal} (number) to "${q.correct_answer}" (string)`,
      });
      modified = true;
    }

    // Fix 3: Ordering item mismatches (typos)
    if (q.type === 'ordering' && q.ordering_items && Array.isArray(q.correct_answer)) {
      const itemSet = new Set(q.ordering_items as string[]);
      const answerSet = new Set(q.correct_answer as string[]);

      // Find items in correct_answer that aren't in ordering_items
      for (let i = 0; i < q.correct_answer.length; i++) {
        const ansItem = q.correct_answer[i] as string;
        if (!itemSet.has(ansItem)) {
          // Find the closest match in ordering_items
          const closest = findClosestMatch(ansItem, q.ordering_items as string[]);
          if (closest) {
            fixes.push({
              file: relPath,
              questionId: q.question_id,
              fixType: 'ordering-typo',
              description: `Fixed ordering_items: "${closest}" → "${ansItem}" (to match correct_answer)`,
            });
            // Update ordering_items to match correct_answer
            const idx = q.ordering_items.indexOf(closest);
            if (idx !== -1) {
              q.ordering_items[idx] = ansItem;
              modified = true;
            }
          }
        }
      }

      // Also check the reverse: items in ordering_items not in correct_answer
      // (these would have been fixed above by updating ordering_items)
    }
  }

  if (modified && !DRY_RUN) {
    fs.writeFileSync(absPath, JSON.stringify(data, null, 2) + '\n');
  }

  return modified;
}

function findClosestMatch(target: string, candidates: string[]): string | null {
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    // Simple similarity: longest common substring ratio
    const shorter = Math.min(target.length, candidate.length);
    const longer = Math.max(target.length, candidate.length);
    if (shorter === 0) continue;

    let commonChars = 0;
    const tLower = target.toLowerCase();
    const cLower = candidate.toLowerCase();

    // Count matching characters in order
    let j = 0;
    for (let i = 0; i < tLower.length && j < cLower.length; i++) {
      if (tLower[i] === cLower[j]) {
        commonChars++;
        j++;
      }
    }

    const score = commonChars / longer;
    if (score > bestScore && score > 0.7) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

async function main(): Promise<void> {
  console.log(DRY_RUN ? 'DRY RUN — no files will be modified\n' : 'Fixing question data errors...\n');

  const files = discoverAllFiles();
  console.log(`Scanning ${files.length} question files...\n`);

  let filesModified = 0;

  for (const { relPath, absPath } of files) {
    if (fixFile(relPath, absPath)) {
      filesModified++;
    }
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('FIX SUMMARY');
  console.log('='.repeat(60));

  const byType: Record<string, number> = {};
  for (const f of fixes) {
    byType[f.fixType] = (byType[f.fixType] || 0) + 1;
  }

  console.log(`Total fixes: ${fixes.length}`);
  console.log(`Files modified: ${filesModified}`);
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(25)} ${count}`);
  }

  // Print details
  if (fixes.length <= 100 || process.argv.includes('--verbose')) {
    console.log('\nDETAILS:');
    for (const f of fixes) {
      console.log(`  [${f.fixType}] ${f.file} (${f.questionId})`);
      console.log(`    ${f.description}`);
    }
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — no files were modified. Remove --dry-run to apply fixes.');
  } else {
    console.log(`\nDone! ${filesModified} files updated.`);
    console.log('Next: Re-run validation to confirm 0 errors, then re-seed.');
  }
}

main().catch((error) => {
  console.error('Fix failed:', error);
  process.exit(1);
});
