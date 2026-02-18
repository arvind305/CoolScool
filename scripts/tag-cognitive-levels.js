#!/usr/bin/env node

/**
 * Auto-tag cognitive_level on all question JSON files under questions/data/.
 *
 * Valid levels: recall, compare, classify, scenario, exception, reason
 *
 * Skips the 2 files that already have manually curated tags:
 *   - class7-biology/T10.01-classification-of-plants-and-animals.json
 *   - class3/T08.02-mental-mathematics.json
 */

const fs = require("fs");
const path = require("path");

const QUESTIONS_DIR = path.join(__dirname, "..", "questions", "data");

const VALID_LEVELS = new Set([
  "recall",
  "compare",
  "classify",
  "scenario",
  "exception",
  "reason",
]);

const SKIP_FILES = new Set([
  path.join("class7-biology", "T10.01-classification-of-plants-and-animals.json"),
  path.join("class3", "T08.02-mental-mathematics.json"),
]);

// --- Pattern-matching rules ---

// Indian names commonly used in scenario questions
const INDIAN_NAMES =
  /\b(Riya|Amit|Priya|Rohan|Meera|Arjun|Ananya|Neha|Vikram|Sanjay|Kavita|Rahul|Suresh|Anil|Pooja|Deepa|Raj|Simran|Kiran|Arun|Sita|Geeta|Mohan|Ram|Shyam|Akhil|Vinod|Sunita|Ramesh|Nisha|Asha|Ravi|Preeti|Jaya|Suman|Rekha|Lata|Veena|Vijay|Sunil|Mira|Alok|Leela|Tara|Ankita|Gaurav|Sneha|Tanvi|Aarav|Ishaan|Aditi|Samir|Dev|Maya|Shruti|Swati|Aisha|Naveen|Manan|Aryan|Kriti|Divya|Komal|Sarita|Rita|Seema|Parul|Varsha|Nitin|Ashok|Sachin|Dinesh|Ganesh|Manish|Rakesh|Shivam|Akash|Bhavya|Ankit)\b/;

// Story/scenario starters — "In a" restricted to real-world settings, not instrument descriptions
const SCENARIO_STARTERS =
  /^(A student|A farmer|A boy|A girl|A man|A woman|A person|A teacher|A shopkeeper|A merchant|A child|A doctor|An engineer|During a|During an|One day|At a|At the|On a|While\s+\w+ing|Imagine|Suppose|Consider|In a (zoo|farm|kitchen|garden|market|school|playground|laboratory|lab|hospital|library|park|shop|store|museum|factory|office|classroom|village|city|town|forest|jungle))/i;

// Real-world place/context keywords
const SCENARIO_PLACES =
  /\b(zoo|farm|kitchen|garden|market|school|playground|laboratory|lab|hospital|library|park|shop|store|museum|factory|office|classroom|home|house|river|lake|pond|field|road|railway|station|airport|temple|church|mosque|village|city|town|forest|mountain|beach|ocean|sea|desert|jungle)\b/i;

// --- Classification functions ---

function isReason(text) {
  const lower = text.toLowerCase();
  if (/^why\s/i.test(text)) return true;
  if (/^explain\s+why/i.test(text)) return true;
  if (/^give\s+a?\s*reason/i.test(text)) return true;
  if (/^justify/i.test(text)) return true;
  if (/\breason\s+for\b/.test(lower)) return true;
  if (/\breason\s+behind\b/.test(lower)) return true;
  if (/\bwhy\s+(is|are|do|does|did|was|were|can|could|should|would|will|has|have|had)\b/.test(lower)) return true;
  if (/\bexplain\s+(why|how|the\s+reason)\b/.test(lower)) return true;
  if (/\bgive\s+(a\s+)?reason\b/.test(lower)) return true;
  return false;
}

// Relational/role names used in scenarios
const RELATIONAL_NAMES =
  /\b(Grandma|Grandmother|Grandpa|Grandfather|Mother|Father|Uncle|Aunt|Brother|Sister|Mr\.|Mrs\.|Ms\.|Dr\.)\b/;

function isScenario(text) {
  if (INDIAN_NAMES.test(text)) return true;
  if (SCENARIO_STARTERS.test(text)) return true;
  if (SCENARIO_PLACES.test(text)) return true;
  if (RELATIONAL_NAMES.test(text)) return true;
  return false;
}

function isException(text) {
  const lower = text.toLowerCase();
  if (/\bactually\b/.test(lower)) return true;
  if (/\breally\s+a\b/.test(lower)) return true;
  if (/\bnot\s+a\b/.test(lower) && /\bwhich\b/.test(lower)) return true;
  if (/\bseems?\s+like\b/.test(lower)) return true;
  if (/\btrick\b/.test(lower)) return true;
  if (/\bmisconception\b/.test(lower)) return true;
  if (/\bdoes\s*n['o]t\s+belong\b/.test(lower)) return true;
  if (/\bdo\s*n['o]t\s+belong\b/.test(lower)) return true;
  if (/\bnot\s+true\b/.test(lower)) return true;
  if (/\bincorrect\b/.test(lower) && /\bwhich\b/.test(lower)) return true;
  if (/\bwrong\b/.test(lower) && /\bwhich\b/.test(lower)) return true;
  if (/\bnot\s+correct\b/.test(lower)) return true;
  if (/\bexcept\b/.test(lower)) return true;
  if (/\bodd\s+one\s+out\b/.test(lower)) return true;
  if (/\bwhich\b.*\bis\s+not\b/.test(lower)) return true;
  if (/\bwhich\b.*\bare\s+not\b/.test(lower)) return true;
  if (/\bwhich\b.*\bdoes\s+not\b/.test(lower)) return true;
  if (/\bwhich\b.*\bdo\s+not\b/.test(lower)) return true;
  if (/\bwhich\b.*\bcannot\b/.test(lower)) return true;
  return false;
}

function isCompare(text) {
  const lower = text.toLowerCase();
  // Specific comparison phrases (not just "different" alone)
  if (/\bdifferences?\s+between\b/.test(lower)) return true;
  if (/\bdiffers?\s+from\b/.test(lower)) return true;
  if (/\bdifferent\s+from\b/.test(lower)) return true;
  if (/\bdifferentiate\b/.test(lower)) return true;
  if (/\bdistinguish\s+between\b/.test(lower)) return true;
  if (/\bdistinction\s+between\b/.test(lower)) return true;
  if (/\bcompare\b/.test(lower)) return true;
  if (/\bunlike\b/.test(lower)) return true;
  if (/\bwhereas\b/.test(lower)) return true;
  if (/\bmore\s+than\b/.test(lower) && /\bwhich\b/.test(lower)) return true;
  if (/\bless\s+than\b/.test(lower) && /\bwhich\b/.test(lower)) return true;
  if (/\bwhich\s+\w*\s*(has|is)\s+more\b/.test(lower)) return true;
  if (/\bwhich\s+\w*\s*(has|is)\s+less\b/.test(lower)) return true;
  // "which [noun] is greater/bigger/..." — allow 0-2 words between which and is
  if (/\bwhich\s+(?:\w+\s+){0,2}(is|are|was)\s+(greater|smaller|bigger|larger|heavier|lighter|taller|shorter|longer|faster|slower|farther|closer|nearer|higher|lower|thicker|thinner|wider|narrower)\b/.test(lower)) return true;
  if (/\bhow\s+(is|are|does|do)\b.*\bdifferent\s+from\b/.test(lower)) return true;
  if (/\bwhile\b/.test(lower) && /\bis\b.*\bis\b/.test(lower)) return true;
  if (/\bsimilarit(y|ies)\b/.test(lower)) return true;
  if (/\bsame\s+as\b/.test(lower) && /\bor\b/.test(lower)) return true;
  // Direct comparative adjective + "than" patterns
  if (/\b(greater|more|less|fewer|higher|lower)\s+\w+\s+than\b/.test(lower)) return true;
  return false;
}

function isClassify(text) {
  const lower = text.toLowerCase();
  if (/\bbelongs?\s+to\b/.test(lower)) return true;
  if (/\bis\s+classified\s+as\b/.test(lower)) return true;
  if (/\bidentify\s+the\b/.test(lower)) return true;
  if (/\bwhat\s+type\s+of\b/.test(lower)) return true;
  if (/\bwhich\s+type\s+of\b/.test(lower)) return true;
  if (/\bwhich\s+class\b/.test(lower)) return true;
  if (/\bwhich\s+categor(y|ies)\b/.test(lower)) return true;
  if (/\bwhich\s+group\b/.test(lower)) return true;
  if (/\bclassify\b/.test(lower)) return true;
  if (/\bcategorise\b/.test(lower) || /\bcategorize\b/.test(lower)) return true;
  if (/\ban\s+animal\s+with\b/.test(lower)) return true;
  if (/\ba\s+substance\s+that\b/.test(lower)) return true;
  if (/\ba\s+plant\s+that\b/.test(lower)) return true;
  if (/\ban\s+organism\s+that\b/.test(lower)) return true;
  if (/\bunder\s+which\b/.test(lower)) return true;
  if (/\bgroup\s+the\b/.test(lower)) return true;
  if (/\bsort\s+the\b/.test(lower)) return true;
  // "most likely a/from/:" — given description, identify category
  if (/\bmost\s+likely\s*(a|an|from|be|:|\?|$)/.test(lower)) return true;
  if (/\bis\s+(a|an)\s+example\s+of\b/.test(lower)) return true;
  // "This is a ___ joint/cell/number/..." pattern after feature description
  if (/\bthis\s+(is|type)\s+(a|an|of)\b/.test(lower) && lower.length > 60) return true;
  // "An animal/cell/object has... Which/It is..." — feature-based identification
  if (/\b(it|this|the\s+cell|the\s+animal|the\s+organism|the\s+substance)\s+(is|belongs|could\s+be)\b/.test(lower) && /\bhas\b/.test(lower)) return true;
  // "works similarly" / "works like" — identify from analogy
  if (/\bworks?\s+(like|similarly)\b/.test(lower)) return true;
  if (/\bsimilar\s+to\b/.test(lower) && /\bwhich\b/.test(lower)) return true;
  return false;
}

/**
 * Determine cognitive_level for a question based on question_text.
 * Priority order: reason > exception > scenario > compare > classify > recall
 * (Higher-level tags take precedence when multiple patterns match)
 */
function tagQuestion(questionText) {
  const text = (questionText || "").trim();
  if (!text) return "recall";

  // Check in priority order (most specific / highest-level first)
  if (isReason(text)) return "reason";
  if (isException(text)) return "exception";
  if (isScenario(text)) return "scenario";
  if (isCompare(text)) return "compare";
  if (isClassify(text)) return "classify";

  return "recall";
}

/**
 * Reorder question object keys so cognitive_level appears right after difficulty.
 */
function reorderQuestionKeys(question, cogLevel) {
  const ordered = {};
  for (const key of Object.keys(question)) {
    ordered[key] = question[key];
    if (key === "difficulty") {
      ordered["cognitive_level"] = cogLevel;
    }
  }
  // If difficulty wasn't in the keys (shouldn't happen), add at end
  if (!("cognitive_level" in ordered)) {
    ordered["cognitive_level"] = cogLevel;
  }
  // Remove duplicate if cognitive_level was already in original keys after difficulty
  // (it got added both by the loop and after difficulty)
  // Actually the loop would set it from original, then we override after difficulty.
  // Let's do it more carefully:
  const result = {};
  let addedCogLevel = false;
  for (const key of Object.keys(question)) {
    if (key === "cognitive_level") continue; // skip original position
    result[key] = question[key];
    if (key === "difficulty" && !addedCogLevel) {
      result["cognitive_level"] = cogLevel;
      addedCogLevel = true;
    }
  }
  if (!addedCogLevel) {
    result["cognitive_level"] = cogLevel;
  }
  return result;
}

// --- Main ---

function walkJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsonFiles(fullPath));
    } else if (entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const forceRetag = process.argv.includes("--force");
  const files = walkJsonFiles(QUESTIONS_DIR);
  console.log(`Found ${files.length} JSON files under questions/data/`);
  if (forceRetag) console.log("  --force: re-tagging all questions (ignoring existing tags)");
  console.log("");

  const globalCounts = {
    recall: 0,
    compare: 0,
    classify: 0,
    scenario: 0,
    exception: 0,
    reason: 0,
  };
  let totalQuestions = 0;
  let filesProcessed = 0;
  let filesSkipped = 0;
  const highRecallFiles = []; // files where >90% are recall

  for (const filePath of files) {
    const relPath = path.relative(QUESTIONS_DIR, filePath);

    // Skip already-tagged files
    if (SKIP_FILES.has(relPath)) {
      filesSkipped++;
      console.log(`SKIP: ${relPath} (already tagged)`);
      continue;
    }

    let data;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`ERROR reading ${relPath}: ${err.message}`);
      continue;
    }

    if (!data.questions || !Array.isArray(data.questions)) {
      console.error(`WARN: ${relPath} has no questions array, skipping`);
      continue;
    }

    const fileCounts = {
      recall: 0,
      compare: 0,
      classify: 0,
      scenario: 0,
      exception: 0,
      reason: 0,
    };

    const updatedQuestions = [];
    for (const q of data.questions) {
      let cogLevel;

      // If already set to a valid value, keep it (unless --force)
      if (!forceRetag && q.cognitive_level && VALID_LEVELS.has(q.cognitive_level)) {
        cogLevel = q.cognitive_level;
      } else {
        cogLevel = tagQuestion(q.question_text);
      }

      const reordered = reorderQuestionKeys(q, cogLevel);
      updatedQuestions.push(reordered);

      fileCounts[cogLevel]++;
      globalCounts[cogLevel]++;
      totalQuestions++;
    }

    data.questions = updatedQuestions;

    // Update metadata.question_count.by_cognitive_level
    if (data.metadata && data.metadata.question_count) {
      data.metadata.question_count.by_cognitive_level = { ...fileCounts };
    } else if (data.metadata) {
      data.metadata.question_count = {
        total: updatedQuestions.length,
        by_cognitive_level: { ...fileCounts },
      };
    }

    // Write back with 2-space indent
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    filesProcessed++;

    // Check if >90% recall
    const total = updatedQuestions.length;
    if (total > 0 && fileCounts.recall / total > 0.9) {
      highRecallFiles.push({
        file: relPath,
        total,
        recall: fileCounts.recall,
        pct: ((fileCounts.recall / total) * 100).toFixed(1),
      });
    }
  }

  // --- Summary ---
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Files found:     ${files.length}`);
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files skipped:   ${filesSkipped}`);
  console.log(`Total questions: ${totalQuestions}`);
  console.log("");
  console.log("Cognitive Level Distribution:");
  console.log("-".repeat(40));
  for (const [level, count] of Object.entries(globalCounts)) {
    const pct = totalQuestions > 0 ? ((count / totalQuestions) * 100).toFixed(1) : "0.0";
    console.log(`  ${level.padEnd(12)} ${String(count).padStart(6)}  (${pct}%)`);
  }
  console.log("-".repeat(40));
  console.log(`  ${"TOTAL".padEnd(12)} ${String(totalQuestions).padStart(6)}`);

  if (highRecallFiles.length > 0) {
    console.log(`\nFiles with >90% recall (${highRecallFiles.length} files — may need manual review):`);
    for (const f of highRecallFiles) {
      console.log(`  ${f.file} — ${f.recall}/${f.total} recall (${f.pct}%)`);
    }
  } else {
    console.log("\nNo files with >90% recall.");
  }
}

main();
