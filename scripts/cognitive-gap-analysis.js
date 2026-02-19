#!/usr/bin/env node

/**
 * Cognitive Gap Analysis Script
 *
 * Reads every question JSON file under questions/data/,
 * computes cognitive level distribution, gap scores, and
 * outputs a prioritized report for content expansion.
 */

const fs = require('fs');
const path = require('path');

// Target distribution (what we want)
const TARGET = {
  recall: 0.20,    // ≤30% (target 20%, max 30%)
  compare: 0.15,   // ≥12%
  classify: 0.15,  // ≥12%
  scenario: 0.15,  // ≥12%
  exception: 0.10, // ≥8%
  reason: 0.10,    // ≥8%
};

// Minimum acceptable percentages (below = gap)
const MIN_ACCEPTABLE = {
  recall: 0.30,     // recall should be AT MOST 30%
  compare: 0.12,
  classify: 0.12,
  scenario: 0.12,
  exception: 0.08,
  reason: 0.08,
};

const COGNITIVE_LEVELS = ['recall', 'compare', 'classify', 'scenario', 'exception', 'reason'];

function findQuestionFiles(baseDir) {
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }
  walk(baseDir);
  return files;
}

function analyzeFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  const questions = data.questions || [];
  const total = questions.length;

  // Count per cognitive level
  const counts = {};
  for (const level of COGNITIVE_LEVELS) {
    counts[level] = 0;
  }
  for (const q of questions) {
    const level = q.cognitive_level || 'recall';
    if (counts[level] !== undefined) {
      counts[level]++;
    } else {
      counts[level] = 1;
    }
  }

  // Compute percentages
  const pcts = {};
  for (const level of COGNITIVE_LEVELS) {
    pcts[level] = total > 0 ? counts[level] / total : 0;
  }

  // Compute gap score — how far from ideal
  // For recall: penalty if ABOVE 30%
  // For others: penalty if BELOW minimum
  let gapScore = 0;
  const missingLevels = [];
  const neededQuestions = {};

  // Calculate what the ideal count would be at target distribution
  // We'll compute how many new questions are needed to reach target
  // Target total: at least 80 questions, or current total if already higher
  const targetTotal = Math.max(80, total);

  for (const level of COGNITIVE_LEVELS) {
    if (level === 'recall') {
      // Recall gap: how much recall exceeds 30%
      const excess = Math.max(0, pcts.recall - MIN_ACCEPTABLE.recall);
      gapScore += excess * 100;
      neededQuestions[level] = 0; // We don't add more recall
    } else {
      const targetCount = Math.ceil(targetTotal * TARGET[level]);
      const deficit = Math.max(0, targetCount - counts[level]);
      neededQuestions[level] = deficit;

      if (counts[level] === 0) {
        missingLevels.push(level);
        gapScore += 20; // Heavy penalty for entirely missing levels
      }

      // Penalty proportional to how far below minimum
      const shortfall = Math.max(0, MIN_ACCEPTABLE[level] - pcts[level]);
      gapScore += shortfall * 100;
    }
  }

  // Determine tier
  let tier, tierLabel;
  if (total < 20 || pcts.recall === 1.0) {
    tier = 1;
    tierLabel = 'Critical';
  } else if (pcts.recall > 0.90 && total >= 50) {
    tier = 2;
    tierLabel = 'High';
  } else if (pcts.recall >= 0.70) {
    tier = 3;
    tierLabel = 'Medium';
  } else {
    tier = 4;
    tierLabel = 'Low';
  }

  // Extract subject from path
  const relativePath = path.relative(path.join(__dirname, '..', 'questions', 'data'), filePath);
  const dirName = path.dirname(relativePath);
  let subject = 'maths';
  if (dirName.includes('biology')) subject = 'biology';
  else if (dirName.includes('chemistry')) subject = 'chemistry';
  else if (dirName.includes('physics')) subject = 'physics';
  else if (dirName.includes('evs') || dirName.includes('science')) subject = 'science';

  // Extract class number
  const classMatch = dirName.match(/class(\d+)/);
  const classNum = classMatch ? parseInt(classMatch[1]) : 0;

  return {
    filePath,
    relativePath,
    subject,
    classNum,
    topicId: data.topic_id || '',
    topicName: data.topic_name || '',
    total,
    counts,
    pcts,
    gapScore,
    missingLevels,
    neededQuestions,
    tier,
    tierLabel,
    totalNeeded: Object.values(neededQuestions).reduce((a, b) => a + b, 0),
  };
}

function formatPct(n) {
  return (n * 100).toFixed(1) + '%';
}

function padRight(str, len) {
  return String(str).padEnd(len);
}

function padLeft(str, len) {
  return String(str).padStart(len);
}

function printReport(results) {
  // Sort by gap score descending
  results.sort((a, b) => b.gapScore - a.gapScore);

  // Overall stats
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);
  const overallCounts = {};
  for (const level of COGNITIVE_LEVELS) {
    overallCounts[level] = results.reduce((s, r) => s + r.counts[level], 0);
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  COGNITIVE GAP ANALYSIS REPORT');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log();
  console.log(`Total files analyzed: ${results.length}`);
  console.log(`Total questions: ${totalQuestions}`);
  console.log();

  console.log('Overall Distribution:');
  console.log('┌────────────┬────────┬────────┬──────────┐');
  console.log('│ Level      │ Count  │ Actual │ Target   │');
  console.log('├────────────┼────────┼────────┼──────────┤');
  for (const level of COGNITIVE_LEVELS) {
    const count = overallCounts[level];
    const pct = formatPct(count / totalQuestions);
    const target = level === 'recall' ? '≤30%' : `≥${(MIN_ACCEPTABLE[level] * 100).toFixed(0)}%`;
    console.log(`│ ${padRight(level, 10)} │ ${padLeft(count, 6)} │ ${padLeft(pct, 6)} │ ${padLeft(target, 8)} │`);
  }
  console.log('└────────────┴────────┴────────┴──────────┘');
  console.log();

  // Tier breakdown
  const tiers = [1, 2, 3, 4];
  const tierNames = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };

  console.log('Tier Summary:');
  console.log('┌──────┬──────────────┬────────┬──────────────────────┐');
  console.log('│ Tier │ Priority     │ Files  │ Description          │');
  console.log('├──────┼──────────────┼────────┼──────────────────────┤');
  for (const t of tiers) {
    const count = results.filter(r => r.tier === t).length;
    const desc = t === 1 ? '<20 Qs or 100% recall'
               : t === 2 ? '>90% recall, ≥50 Qs'
               : t === 3 ? '70-90% recall'
               : '<70% recall (balanced)';
    console.log(`│  ${t}   │ ${padRight(tierNames[t], 12)} │ ${padLeft(count, 6)} │ ${padRight(desc, 20)} │`);
  }
  console.log('└──────┴──────────────┴────────┴──────────────────────┘');
  console.log();

  // Subject breakdown
  const subjects = ['biology', 'chemistry', 'physics', 'science', 'maths'];
  console.log('Subject Breakdown:');
  console.log('┌────────────┬────────┬──────┬──────┬──────┬──────┐');
  console.log('│ Subject    │ Files  │ T1   │ T2   │ T3   │ T4   │');
  console.log('├────────────┼────────┼──────┼──────┼──────┼──────┤');
  for (const subj of subjects) {
    const subjFiles = results.filter(r => r.subject === subj);
    const t1 = subjFiles.filter(r => r.tier === 1).length;
    const t2 = subjFiles.filter(r => r.tier === 2).length;
    const t3 = subjFiles.filter(r => r.tier === 3).length;
    const t4 = subjFiles.filter(r => r.tier === 4).length;
    console.log(`│ ${padRight(subj, 10)} │ ${padLeft(subjFiles.length, 6)} │ ${padLeft(t1, 4)} │ ${padLeft(t2, 4)} │ ${padLeft(t3, 4)} │ ${padLeft(t4, 4)} │`);
  }
  console.log('└────────────┴────────┴──────┴──────┴──────┴──────┘');
  console.log();

  // Detailed report for Tier 1 & 2 (science only for priority)
  for (const t of [1, 2]) {
    const tierFiles = results.filter(r => r.tier === t);
    if (tierFiles.length === 0) continue;

    console.log(`\n${'═'.repeat(67)}`);
    console.log(`  TIER ${t} — ${tierNames[t].toUpperCase()} PRIORITY (${tierFiles.length} files)`);
    console.log(`${'═'.repeat(67)}`);

    // Show science files first, then maths
    const scienceFiles = tierFiles.filter(r => r.subject !== 'maths');
    const mathsFiles = tierFiles.filter(r => r.subject === 'maths');

    if (scienceFiles.length > 0) {
      console.log(`\n  --- Science Files (${scienceFiles.length}) ---`);
      for (const r of scienceFiles.slice(0, 30)) {
        printFileDetail(r);
      }
      if (scienceFiles.length > 30) {
        console.log(`  ... and ${scienceFiles.length - 30} more science files`);
      }
    }

    if (mathsFiles.length > 0) {
      console.log(`\n  --- Maths Files (${mathsFiles.length}) ---`);
      // Just summary for maths
      console.log('  (Maths files are recall-heavy by nature — computation IS the cognitive skill)');
      console.log(`  Files: ${mathsFiles.length} | Avg questions: ${Math.round(mathsFiles.reduce((s, r) => s + r.total, 0) / mathsFiles.length)}`);
    }
  }

  // Top 10 highest-gap SCIENCE files
  console.log(`\n${'═'.repeat(67)}`);
  console.log('  TOP 10 HIGHEST-GAP SCIENCE FILES (Priority for expansion)');
  console.log(`${'═'.repeat(67)}`);

  const scienceResults = results.filter(r => ['biology', 'chemistry', 'physics', 'science'].includes(r.subject));
  scienceResults.sort((a, b) => b.gapScore - a.gapScore);

  for (let i = 0; i < Math.min(10, scienceResults.length); i++) {
    const r = scienceResults[i];
    console.log(`\n  #${i + 1}. ${r.relativePath}`);
    printFileDetail(r);
  }

  // Total questions needed
  const totalNeeded = results.reduce((s, r) => s + r.totalNeeded, 0);
  const scienceNeeded = scienceResults.reduce((s, r) => s + r.totalNeeded, 0);

  console.log(`\n${'═'.repeat(67)}`);
  console.log('  SUMMARY');
  console.log(`${'═'.repeat(67)}`);
  console.log(`  Total new questions needed (all files): ~${totalNeeded}`);
  console.log(`  Total new questions needed (science only): ~${scienceNeeded}`);
  console.log(`  Top 10 science files need: ~${scienceResults.slice(0, 10).reduce((s, r) => s + r.totalNeeded, 0)} new questions`);
}

function printFileDetail(r) {
  console.log(`     Topic: ${r.topicName} (${r.topicId})`);
  console.log(`     Class: ${r.classNum} | Subject: ${r.subject} | Total Qs: ${r.total} | Gap Score: ${r.gapScore.toFixed(1)}`);
  console.log(`     Distribution: ${COGNITIVE_LEVELS.map(l => `${l}:${r.counts[l]}`).join(' | ')}`);
  console.log(`     Percentages:  ${COGNITIVE_LEVELS.map(l => `${l}:${formatPct(r.pcts[l])}`).join(' | ')}`);
  if (r.missingLevels.length > 0) {
    console.log(`     Missing levels: ${r.missingLevels.join(', ')}`);
  }
  if (r.totalNeeded > 0) {
    const needs = COGNITIVE_LEVELS.filter(l => r.neededQuestions[l] > 0)
      .map(l => `${l}:+${r.neededQuestions[l]}`);
    console.log(`     Needed: ${needs.join(', ')} (total: +${r.totalNeeded})`);
  }
}

// Main
const questionsDir = path.join(__dirname, '..', 'questions', 'data');
console.log(`Scanning: ${questionsDir}\n`);

const files = findQuestionFiles(questionsDir);
console.log(`Found ${files.length} question files\n`);

const results = [];
for (const f of files) {
  try {
    results.push(analyzeFile(f));
  } catch (err) {
    console.error(`Error reading ${f}: ${err.message}`);
  }
}

printReport(results);

// Also write JSON report for programmatic use
const jsonReport = {
  generated: new Date().toISOString(),
  totalFiles: results.length,
  totalQuestions: results.reduce((s, r) => s + r.total, 0),
  overallDistribution: {},
  tiers: { 1: [], 2: [], 3: [], 4: [] },
  top10Science: [],
};

const totalQ = results.reduce((s, r) => s + r.total, 0);
for (const level of COGNITIVE_LEVELS) {
  const count = results.reduce((s, r) => s + r.counts[level], 0);
  jsonReport.overallDistribution[level] = { count, pct: (count / totalQ * 100).toFixed(1) + '%' };
}

for (const r of results) {
  jsonReport.tiers[r.tier].push({
    file: r.relativePath,
    subject: r.subject,
    classNum: r.classNum,
    topicName: r.topicName,
    total: r.total,
    gapScore: Math.round(r.gapScore * 10) / 10,
    counts: r.counts,
    needed: r.neededQuestions,
    totalNeeded: r.totalNeeded,
  });
}

const scienceResults2 = results.filter(r => ['biology', 'chemistry', 'physics', 'science'].includes(r.subject));
scienceResults2.sort((a, b) => b.gapScore - a.gapScore);
jsonReport.top10Science = scienceResults2.slice(0, 10).map(r => ({
  file: r.relativePath,
  subject: r.subject,
  classNum: r.classNum,
  topicName: r.topicName,
  total: r.total,
  gapScore: Math.round(r.gapScore * 10) / 10,
  counts: r.counts,
  needed: r.neededQuestions,
  totalNeeded: r.totalNeeded,
}));

const reportPath = path.join(__dirname, '..', 'scripts', 'gap-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
console.log(`\nJSON report written to: ${reportPath}`);
