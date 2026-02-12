/**
 * Convert Match Questions to MCQs
 *
 * This script converts all "match" type questions to multiple MCQ questions.
 * Each match pair becomes a separate MCQ where:
 * - The left item becomes part of the question
 * - All right items become the options
 * - The correct right item for that pair is the correct answer
 */

const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'questions', 'data');

// Patterns to convert match question text to MCQ question text
function generateMcqQuestionText(originalQuestion, leftItem) {
  const q = originalQuestion.toLowerCase();

  // Color matching
  if (q.includes('color') || q.includes('colour')) {
    return `What color is ${leftItem}?`;
  }

  // Group/category matching
  if (q.includes('group') || q.includes('belongs to') || q.includes('category')) {
    return `Which group does ${leftItem} belong to?`;
  }

  // Size matching
  if (q.includes('size')) {
    return `What size is ${leftItem}?`;
  }

  // Shape matching
  if (q.includes('shape')) {
    return `What shape is ${leftItem}?`;
  }

  // Location/habitat matching
  if (q.includes('where') || q.includes('lives') || q.includes('habitat')) {
    return `Where does ${leftItem} live?`;
  }

  // Property matching
  if (q.includes('property')) {
    return `What property is used to sort "${leftItem}"?`;
  }

  // Number matching (for math)
  if (q.includes('number') || q.includes('value') || q.includes('equal')) {
    return `What is the value of ${leftItem}?`;
  }

  // Place value / digit matching
  if (q.includes('place value') || q.includes('digit')) {
    return `What is the place value of ${leftItem}?`;
  }

  // Operation / result matching
  if (q.includes('result') || q.includes('answer') || q.includes('sum') || q.includes('product')) {
    return `What is the result of ${leftItem}?`;
  }

  // Unit matching
  if (q.includes('unit') || q.includes('measure')) {
    return `What unit is used for ${leftItem}?`;
  }

  // Fraction matching
  if (q.includes('fraction') || q.includes('part')) {
    return `What fraction represents ${leftItem}?`;
  }

  // Time matching
  if (q.includes('time') || q.includes('clock') || q.includes('hour')) {
    return `What time does ${leftItem} show?`;
  }

  // Money matching
  if (q.includes('money') || q.includes('rupee') || q.includes('coin') || q.includes('note')) {
    return `What is the value of ${leftItem}?`;
  }

  // Geometry matching
  if (q.includes('side') || q.includes('vertex') || q.includes('edge') || q.includes('face')) {
    return `How many does ${leftItem} have?`;
  }

  // Definition/term matching
  if (q.includes('definition') || q.includes('term') || q.includes('meaning')) {
    return `What is the meaning of ${leftItem}?`;
  }

  // Function/organ matching (Biology)
  if (q.includes('function') || q.includes('role') || q.includes('job')) {
    return `What is the function of ${leftItem}?`;
  }

  // Formula/symbol matching (Chemistry/Physics)
  if (q.includes('formula') || q.includes('symbol')) {
    return `What is the symbol/formula for ${leftItem}?`;
  }

  // Generic fallback - extract key concept from original question
  // "Match each X with its Y" -> "What is the Y of X?"
  const matchPattern = /match\s+(?:each\s+)?(.+?)\s+(?:with|to)\s+(?:its\s+)?(.+)/i;
  const match = originalQuestion.match(matchPattern);
  if (match) {
    const concept = match[2].replace(/\.$/, '').trim();
    return `What is the ${concept} of ${leftItem}?`;
  }

  // Ultimate fallback
  return `What matches with ${leftItem}?`;
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Convert a single match question to multiple MCQs
function convertMatchToMcqs(matchQuestion, startingQuestionNumber) {
  const mcqs = [];
  const pairs = matchQuestion.match_pairs;

  // Get all unique right values for options
  const allRightValues = [...new Set(pairs.map(p => p.right))];

  pairs.forEach((pair, index) => {
    // Create options from all right values
    let options = [];

    if (allRightValues.length >= 4) {
      // If we have 4+ unique options, use the correct one plus 3 random others
      const otherOptions = allRightValues.filter(v => v !== pair.right);
      const selectedOthers = shuffleArray(otherOptions).slice(0, 3);
      options = shuffleArray([pair.right, ...selectedOthers]);
    } else if (allRightValues.length >= 2) {
      // Use all available options
      options = shuffleArray([...allRightValues]);
    } else {
      // Only one option - skip this (shouldn't happen but just in case)
      console.warn(`Skipping pair with only one option: ${pair.left} -> ${pair.right}`);
      return;
    }

    // Ensure we have at least 2 options and at most 4
    options = options.slice(0, 4);

    // Find the correct answer letter
    const correctIndex = options.findIndex(o => o === pair.right);
    const correctLetter = String.fromCharCode(65 + correctIndex); // A, B, C, D

    // Generate question ID
    const newQuestionId = matchQuestion.question_id.replace(
      /Q(\d+)$/,
      `Q${String(startingQuestionNumber + index).padStart(3, '0')}`
    );

    // Create MCQ
    const mcq = {
      question_id: newQuestionId,
      type: 'mcq',
      concept_id: matchQuestion.concept_id,
      difficulty: matchQuestion.difficulty,
      question_text: generateMcqQuestionText(matchQuestion.question_text, pair.left),
      options: options.map((opt, i) => ({
        id: String.fromCharCode(65 + i),
        text: opt
      })),
      correct_answer: correctLetter
    };

    // Copy over optional fields if they exist
    if (matchQuestion.hint) {
      mcq.hint = matchQuestion.hint;
    }
    if (matchQuestion.tags) {
      mcq.tags = matchQuestion.tags;
    }

    mcqs.push(mcq);
  });

  return mcqs;
}

// Process a single question file
function processQuestionFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let data;

  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error(`Error parsing ${filePath}: ${e.message}`);
    return { converted: 0, newQuestions: 0 };
  }

  if (!data.questions || !Array.isArray(data.questions)) {
    return { converted: 0, newQuestions: 0 };
  }

  const matchQuestions = data.questions.filter(q => q.type === 'match');
  if (matchQuestions.length === 0) {
    return { converted: 0, newQuestions: 0 };
  }

  console.log(`Processing ${path.basename(filePath)}: ${matchQuestions.length} match questions found`);

  // Get the highest question number to start new IDs from
  let maxQuestionNum = 0;
  data.questions.forEach(q => {
    const match = q.question_id.match(/Q(\d+)$/);
    if (match) {
      maxQuestionNum = Math.max(maxQuestionNum, parseInt(match[1], 10));
    }
  });

  // Convert match questions and collect new MCQs
  const newMcqs = [];
  let currentQuestionNum = maxQuestionNum + 1;

  matchQuestions.forEach(matchQ => {
    const mcqs = convertMatchToMcqs(matchQ, currentQuestionNum);
    newMcqs.push(...mcqs);
    currentQuestionNum += mcqs.length;
  });

  // Remove match questions and add new MCQs
  data.questions = data.questions.filter(q => q.type !== 'match');
  data.questions.push(...newMcqs);

  // Update metadata if it exists
  if (data.metadata && data.metadata.question_count) {
    const byType = data.metadata.question_count.by_type || {};
    const matchCount = byType.match || 0;
    const mcqCount = byType.mcq || 0;

    byType.mcq = mcqCount + newMcqs.length;
    delete byType.match;

    data.metadata.question_count.total = data.questions.length;
    data.metadata.question_count.by_type = byType;
  }

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return {
    converted: matchQuestions.length,
    newQuestions: newMcqs.length
  };
}

// Find all JSON files in questions directory
function findQuestionFiles(dir) {
  const files = [];

  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

// Main execution
function main() {
  console.log('=== Match to MCQ Conversion Script ===\n');
  console.log(`Questions directory: ${QUESTIONS_DIR}\n`);

  if (!fs.existsSync(QUESTIONS_DIR)) {
    console.error(`Error: Questions directory not found: ${QUESTIONS_DIR}`);
    process.exit(1);
  }

  const files = findQuestionFiles(QUESTIONS_DIR);
  console.log(`Found ${files.length} question files\n`);

  let totalConverted = 0;
  let totalNewQuestions = 0;
  let filesModified = 0;

  for (const file of files) {
    const result = processQuestionFile(file);
    if (result.converted > 0) {
      totalConverted += result.converted;
      totalNewQuestions += result.newQuestions;
      filesModified++;
    }
  }

  console.log('\n=== Conversion Complete ===');
  console.log(`Files modified: ${filesModified}`);
  console.log(`Match questions converted: ${totalConverted}`);
  console.log(`New MCQ questions created: ${totalNewQuestions}`);
  console.log(`Net question increase: ${totalNewQuestions - totalConverted}`);
}

main();
