#!/usr/bin/env node
/**
 * Content Fixer — Automated fixes for known garbled text patterns
 *
 * Fixes:
 * 1. "the their X:" pattern from convert-match-to-mcq.js
 * 2. "the the" double word pattern
 * 3. Metadata total_questions mismatch
 * 4. "by by" double word
 *
 * Usage: node questions/validation/content-fixer.js [--dry-run] [directories...]
 * If no directories specified, scans ALL directories under questions/data/
 */

const fs = require('fs');
const path = require('path');

const QUESTIONS_DATA_DIR = path.join(__dirname, '..', 'data');
const DRY_RUN = process.argv.includes('--dry-run');
const args = process.argv.slice(2).filter(a => a !== '--dry-run');

// ============================================================================
// Fix functions
// ============================================================================

/**
 * Fix "the their X: of Y" pattern → "the X of Y"
 * Also handles: "What is the their X: of Y?" → "What is the X of Y?"
 */
function fixArticleConfusion(text) {
  if (!text || typeof text !== 'string') return { text, changed: false };
  let result = text;

  // Pattern: "the their <phrase>: of <item>"
  // → "the <phrase> of <item>"
  result = result.replace(/\bthe their\b/gi, 'the');

  // After removing "their", clean up leftover colon before "of"
  // "What is the descriptions: of CGST?" → "What is the descriptions of CGST?"
  // But only the colon that's part of the garbled pattern (before " of ")
  result = result.replace(/:\s+of\b/g, ' of');

  if (result !== text) return { text: result, changed: true };
  return { text, changed: false };
}

/**
 * Fix "the the" double word → "the"
 * Be careful not to break legitimate uses (rare but possible)
 */
function fixDoubleWord(text) {
  if (!text || typeof text !== 'string') return { text, changed: false };
  let result = text;

  // "the the" → "the" (case insensitive, preserve first "the"'s case)
  result = result.replace(/\b(the)\s+the\b/gi, '$1');

  // "by by" → "by"
  result = result.replace(/\b(by)\s+by\b/gi, '$1');

  if (result !== text) return { text: result, changed: true };
  return { text, changed: false };
}

/**
 * Fix all garbled text patterns in a string
 */
function fixGarbledText(text) {
  if (!text || typeof text !== 'string') return { text, changed: false };

  let current = text;
  let changed = false;

  const r1 = fixArticleConfusion(current);
  if (r1.changed) { current = r1.text; changed = true; }

  const r2 = fixDoubleWord(current);
  if (r2.changed) { current = r2.text; changed = true; }

  return { text: current, changed };
}

/**
 * Fix metadata total_questions count
 */
function fixMetadata(data) {
  const actual = data.questions ? data.questions.length : 0;
  if (data.metadata && data.metadata.total_questions !== undefined) {
    if (data.metadata.total_questions !== actual) {
      const old = data.metadata.total_questions;
      data.metadata.total_questions = actual;
      return { changed: true, old, actual };
    }
  }
  return { changed: false };
}

// ============================================================================
// Processing
// ============================================================================

function processFile(filePath) {
  const fixes = [];
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { fixes, error: e.message };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { fixes, error: `JSON parse error: ${e.message}` };
  }

  if (!data.questions || !Array.isArray(data.questions)) {
    return { fixes };
  }

  // Fix questions
  for (const q of data.questions) {
    const textFields = [
      'question_text', 'explanation_correct', 'explanation_incorrect'
    ];

    for (const field of textFields) {
      if (q[field]) {
        const result = fixGarbledText(q[field]);
        if (result.changed) {
          fixes.push({
            question_id: q.question_id,
            field,
            type: 'garbled_text',
            old: q[field].substring(0, 80),
            new: result.text.substring(0, 80)
          });
          q[field] = result.text;
        }
      }
    }

    // Fix options text
    if (q.options && Array.isArray(q.options)) {
      for (const opt of q.options) {
        if (opt.text) {
          const result = fixGarbledText(opt.text);
          if (result.changed) {
            fixes.push({
              question_id: q.question_id,
              field: `option_${opt.id}`,
              type: 'garbled_text',
              old: opt.text.substring(0, 80),
              new: result.text.substring(0, 80)
            });
            opt.text = result.text;
          }
        }
      }
    }
  }

  // Fix metadata
  const metaFix = fixMetadata(data);
  if (metaFix.changed) {
    fixes.push({
      question_id: null,
      field: 'metadata.total_questions',
      type: 'metadata_mismatch',
      old: String(metaFix.old),
      new: String(metaFix.actual)
    });
  }

  // Write back if changes were made
  if (fixes.length > 0 && !DRY_RUN) {
    const output = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, output, 'utf8');
  }

  return { fixes };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no files will be modified) ===' : '=== CONTENT FIXER ===');
  console.log();

  // Determine directories to scan
  let dirs;
  if (args.length > 0) {
    dirs = args.map(d => path.join(QUESTIONS_DATA_DIR, d));
  } else {
    dirs = fs.readdirSync(QUESTIONS_DATA_DIR)
      .map(d => path.join(QUESTIONS_DATA_DIR, d))
      .filter(d => fs.statSync(d).isDirectory());
  }

  let totalFiles = 0;
  let totalFixes = 0;
  let totalFixedFiles = 0;
  const fixesByDir = {};
  const fixesByType = { garbled_text: 0, metadata_mismatch: 0 };

  for (const dir of dirs) {
    const dirName = path.basename(dir);
    let files;
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    } catch (e) {
      continue;
    }

    let dirFixes = 0;
    for (const file of files) {
      const filePath = path.join(dir, file);
      const result = processFile(filePath);
      totalFiles++;

      if (result.fixes.length > 0) {
        totalFixedFiles++;
        totalFixes += result.fixes.length;
        dirFixes += result.fixes.length;

        for (const fix of result.fixes) {
          fixesByType[fix.type] = (fixesByType[fix.type] || 0) + 1;
        }

        if (result.fixes.length > 0) {
          console.log(`  ${dirName}/${file}: ${result.fixes.length} fixes`);
          for (const fix of result.fixes) {
            const qid = fix.question_id || 'metadata';
            console.log(`    [${fix.type}] ${qid}.${fix.field}: "${fix.old}" → "${fix.new}"`);
          }
        }
      }

      if (result.error) {
        console.log(`  ERROR: ${dirName}/${file}: ${result.error}`);
      }
    }

    if (dirFixes > 0) {
      fixesByDir[dirName] = dirFixes;
    }
  }

  console.log();
  console.log('======================================================================');
  console.log('  CONTENT FIXER SUMMARY');
  console.log('======================================================================');
  console.log(`  Mode:           ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`);
  console.log(`  Files scanned:  ${totalFiles}`);
  console.log(`  Files modified: ${totalFixedFiles}`);
  console.log(`  Total fixes:    ${totalFixes}`);
  console.log();
  console.log('  BY TYPE:');
  for (const [type, count] of Object.entries(fixesByType)) {
    console.log(`    ${type}: ${count}`);
  }
  console.log();
  console.log('  BY DIRECTORY:');
  const sortedDirs = Object.entries(fixesByDir).sort((a, b) => b[1] - a[1]);
  for (const [dir, count] of sortedDirs) {
    console.log(`    ${dir.padEnd(35)} ${count}`);
  }
  console.log('======================================================================');
}

main();
