/**
 * Question Auditor
 *
 * Comprehensive audit of all questions for:
 * - Structural validity (correct_answer matches options)
 * - Mathematical accuracy (where verifiable)
 * - Consistency checks
 *
 * Run: node questions/validation/question-auditor.js
 */

const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '../data');

// Track all issues found
const issues = [];
const warnings = [];
let totalQuestions = 0;

/**
 * Load all question files
 */
function loadAllQuestionBanks() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
  const banks = [];

  for (const file of files) {
    const filePath = path.join(QUESTIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    banks.push({ file, data });
  }

  return banks;
}

/**
 * Validate a single question
 */
function validateQuestion(question, topicId, fileName) {
  const errors = [];
  const warns = [];

  // Basic structure checks
  if (!question.question_id) {
    errors.push('Missing question_id');
  }
  if (!question.question_text) {
    errors.push('Missing question_text');
  }
  if (!question.correct_answer) {
    errors.push('Missing correct_answer');
  }
  if (!question.type) {
    errors.push('Missing type');
  }

  // Type-specific validation
  switch (question.type) {
    case 'mcq':
      validateMCQ(question, errors, warns);
      break;
    case 'true_false':
      validateTrueFalse(question, errors, warns);
      break;
    case 'fill_blank':
      validateFillBlank(question, errors, warns);
      break;
    case 'ordering':
      validateOrdering(question, errors, warns);
      break;
    case 'match':
      validateMatch(question, errors, warns);
      break;
  }

  // Mathematical content checks
  validateMathContent(question, errors, warns);

  return { errors, warns };
}

/**
 * Validate MCQ questions
 */
function validateMCQ(question, errors, warns) {
  if (!question.options || !Array.isArray(question.options)) {
    errors.push('MCQ missing options array');
    return;
  }

  if (question.options.length < 2) {
    errors.push('MCQ has fewer than 2 options');
  }

  if (question.options.length > 4) {
    warns.push('MCQ has more than 4 options');
  }

  const optionIds = question.options.map(o => o.id);

  if (!optionIds.includes(question.correct_answer)) {
    errors.push(`MCQ correct_answer "${question.correct_answer}" does not match any option ID. Options: ${optionIds.join(', ')}`);
  }

  // Check for duplicate option IDs
  const uniqueIds = new Set(optionIds);
  if (uniqueIds.size !== optionIds.length) {
    errors.push('MCQ has duplicate option IDs');
  }

  // Check for empty option text
  for (const opt of question.options) {
    if (!opt.text || opt.text.trim() === '') {
      errors.push(`MCQ option ${opt.id} has empty text`);
    }
  }
}

/**
 * Validate True/False questions
 */
function validateTrueFalse(question, errors, warns) {
  const answer = String(question.correct_answer).toLowerCase();
  if (answer !== 'true' && answer !== 'false') {
    errors.push(`True/False correct_answer "${question.correct_answer}" is not True or False`);
  }
}

/**
 * Validate Fill-in-the-blank questions
 */
function validateFillBlank(question, errors, warns) {
  if (!question.correct_answer || String(question.correct_answer).trim() === '') {
    errors.push('Fill-blank has empty correct_answer');
  }

  // Check for reasonable answer length
  const answer = String(question.correct_answer);
  if (answer.length > 100) {
    warns.push('Fill-blank answer is unusually long');
  }
}

/**
 * Validate Ordering questions
 */
function validateOrdering(question, errors, warns) {
  if (!question.ordering_items || !Array.isArray(question.ordering_items)) {
    errors.push('Ordering question missing ordering_items array');
    return;
  }

  if (!Array.isArray(question.correct_answer)) {
    errors.push('Ordering correct_answer must be an array');
    return;
  }

  // Check that correct_answer contains same items as ordering_items
  const sortedItems = [...question.ordering_items].sort();
  const sortedAnswer = [...question.correct_answer].sort();

  if (sortedItems.length !== sortedAnswer.length) {
    errors.push('Ordering correct_answer length does not match ordering_items');
  } else {
    for (let i = 0; i < sortedItems.length; i++) {
      if (sortedItems[i] !== sortedAnswer[i]) {
        errors.push('Ordering correct_answer contains different items than ordering_items');
        break;
      }
    }
  }
}

/**
 * Validate Match questions
 */
function validateMatch(question, errors, warns) {
  if (!question.match_pairs || !Array.isArray(question.match_pairs)) {
    errors.push('Match question missing match_pairs array');
    return;
  }

  for (const pair of question.match_pairs) {
    if (!pair.left || !pair.right) {
      errors.push('Match pair missing left or right value');
    }
  }
}

/**
 * Validate mathematical content for common question patterns
 */
function validateMathContent(question, errors, warns) {
  const text = question.question_text.toLowerCase();

  // Place value vs Face value check
  if (text.includes('face value') && question.type === 'mcq') {
    validateFaceValue(question, errors, warns);
  }

  if (text.includes('place value') && !text.includes('face value') && question.type === 'mcq') {
    validatePlaceValue(question, errors, warns);
  }

  // Expanded form checks
  if (text.includes('expanded form') && question.type === 'mcq') {
    validateExpandedForm(question, errors, warns);
  }

  // Greater/Smaller comparison checks
  if ((text.includes('greater') || text.includes('smaller') || text.includes('ascending') || text.includes('descending')) && question.type === 'mcq') {
    validateComparison(question, errors, warns);
  }

  // Basic arithmetic checks where possible
  if (question.type === 'fill_blank') {
    validateArithmeticFillBlank(question, errors, warns);
  }
}

/**
 * Validate face value questions
 * Face value = the digit itself
 */
function validateFaceValue(question, errors, warns) {
  const text = question.question_text;

  // Extract the digit being asked about
  const digitMatch = text.match(/face value of (\d)/i);
  if (!digitMatch) return;

  const digit = digitMatch[1];
  const correctOption = question.options.find(o => o.id === question.correct_answer);

  if (correctOption) {
    const answerText = correctOption.text.replace(/,/g, '').trim();
    // Face value should be the digit itself
    if (answerText !== digit) {
      warns.push(`Face value question: digit is ${digit}, but correct answer is "${correctOption.text}". Face value should equal the digit itself.`);
    }
  }
}

/**
 * Validate place value questions
 */
function validatePlaceValue(question, errors, warns) {
  // Complex validation - just flag for manual review if suspicious
  const text = question.question_text;

  // Extract number and digit
  const numberMatch = text.match(/(\d[\d,]*)/);
  const digitMatch = text.match(/(?:of|digit)\s+(\d)\b/i);

  if (!numberMatch || !digitMatch) return;

  // Just add a warning for manual review of place value questions
  warns.push(`Place value question - verify manually: "${text.substring(0, 60)}..."`);
}

/**
 * Validate expanded form questions
 */
function validateExpandedForm(question, errors, warns) {
  // Flag for manual review
  warns.push(`Expanded form question - verify manually: "${question.question_text.substring(0, 60)}..."`);
}

/**
 * Validate comparison questions
 */
function validateComparison(question, errors, warns) {
  const text = question.question_text;

  // Extract numbers from the question
  const numbers = text.match(/\d[\d,]*/g);
  if (!numbers || numbers.length < 2) return;

  // Convert to actual numbers for comparison
  const nums = numbers.map(n => parseInt(n.replace(/,/g, '')));

  if (text.includes('greater')) {
    const maxNum = Math.max(...nums);
    const correctOption = question.options.find(o => o.id === question.correct_answer);
    if (correctOption) {
      const answerNum = parseInt(correctOption.text.replace(/,/g, ''));
      if (!isNaN(answerNum) && answerNum !== maxNum && !text.includes('how much')) {
        warns.push(`Greater-than question: expected ${maxNum} but answer is ${answerNum}`);
      }
    }
  }
}

/**
 * Validate arithmetic fill-in-the-blank
 */
function validateArithmeticFillBlank(question, errors, warns) {
  const text = question.question_text;

  // Simple addition/subtraction check
  const simpleArithMatch = text.match(/(\d+)\s*([+\-×÷])\s*(\d+)\s*=/);
  if (simpleArithMatch) {
    const a = parseInt(simpleArithMatch[1]);
    const op = simpleArithMatch[2];
    const b = parseInt(simpleArithMatch[3]);
    const answer = String(question.correct_answer).replace(/,/g, '');

    let expected;
    switch (op) {
      case '+': expected = a + b; break;
      case '-': expected = a - b; break;
      case '×': expected = a * b; break;
      case '÷': expected = a / b; break;
    }

    if (expected !== undefined && String(expected) !== answer) {
      errors.push(`Arithmetic: ${a} ${op} ${b} = ${expected}, but answer is "${question.correct_answer}"`);
    }
  }
}

/**
 * Run the full audit
 */
function runAudit() {
  console.log('='.repeat(70));
  console.log('QUESTION BANK COMPREHENSIVE AUDIT');
  console.log('='.repeat(70));
  console.log('');

  const banks = loadAllQuestionBanks();
  console.log(`Found ${banks.length} question bank files\n`);

  for (const { file, data } of banks) {
    const topicId = data.topic_id;
    const questions = data.questions || [];

    for (const question of questions) {
      totalQuestions++;
      const result = validateQuestion(question, topicId, file);

      if (result.errors.length > 0) {
        issues.push({
          file,
          topicId,
          questionId: question.question_id,
          questionText: question.question_text,
          type: question.type,
          correctAnswer: question.correct_answer,
          errors: result.errors
        });
      }

      if (result.warns.length > 0) {
        warnings.push({
          file,
          topicId,
          questionId: question.question_id,
          questionText: question.question_text,
          type: question.type,
          correctAnswer: question.correct_answer,
          warnings: result.warns
        });
      }
    }
  }

  // Print results
  console.log('='.repeat(70));
  console.log('AUDIT RESULTS');
  console.log('='.repeat(70));
  console.log(`Total questions audited: ${totalQuestions}`);
  console.log(`Critical errors found: ${issues.length}`);
  console.log(`Warnings (need review): ${warnings.length}`);
  console.log('');

  if (issues.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('CRITICAL ERRORS (MUST FIX)');
    console.log('='.repeat(70));

    for (const issue of issues) {
      console.log(`\n[ERROR] ${issue.questionId} in ${issue.file}`);
      console.log(`  Question: "${issue.questionText.substring(0, 80)}${issue.questionText.length > 80 ? '...' : ''}"`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  Correct Answer: ${JSON.stringify(issue.correctAnswer)}`);
      for (const err of issue.errors) {
        console.log(`  ❌ ${err}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('WARNINGS (MANUAL REVIEW RECOMMENDED)');
    console.log('='.repeat(70));

    for (const warn of warnings) {
      console.log(`\n[WARN] ${warn.questionId} in ${warn.file}`);
      console.log(`  Question: "${warn.questionText.substring(0, 80)}${warn.questionText.length > 80 ? '...' : ''}"`);
      console.log(`  Type: ${warn.type}`);
      console.log(`  Correct Answer: ${JSON.stringify(warn.correctAnswer)}`);
      for (const w of warn.warnings) {
        console.log(`  ⚠️  ${w}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`✓ Total questions: ${totalQuestions}`);
  console.log(`✗ Critical errors: ${issues.length}`);
  console.log(`⚠ Warnings: ${warnings.length}`);

  if (issues.length === 0) {
    console.log('\n✅ No critical structural errors found.');
  } else {
    console.log(`\n❌ ${issues.length} CRITICAL ERRORS REQUIRE IMMEDIATE ATTENTION`);
  }

  // Return for programmatic use
  return { totalQuestions, issues, warnings };
}

// Run the audit
runAudit();
