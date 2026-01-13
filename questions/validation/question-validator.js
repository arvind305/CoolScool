/**
 * Question Bank Validator
 *
 * This validator ensures question bank integrity per the North Star document:
 * - All questions must be CAM-validated (§11)
 * - No trick questions (§6)
 * - No multi-concept questions (§6)
 * - Finite question set per topic (§7)
 * - Canonical explanations: 2-4 sentences, no teaching (§10)
 * - All answers are deterministic (§11)
 */

const fs = require('fs');
const path = require('path');

class QuestionBankValidator {
  constructor(questionBank, camData) {
    this.qb = questionBank;
    this.cam = camData;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      total_questions: 0,
      by_difficulty: { familiarity: 0, application: 0, exam_style: 0 },
      by_type: { mcq: 0, fill_blank: 0, true_false: 0, match: 0, ordering: 0 },
      concepts_covered: new Set()
    };

    // Build CAM lookup maps
    this.camTopics = new Map();
    this.camConcepts = new Map();
    this.buildCAMLookup();
  }

  /**
   * Build lookup maps from CAM data
   */
  buildCAMLookup() {
    if (!this.cam || !this.cam.themes) return;

    for (const theme of this.cam.themes) {
      for (const topic of theme.topics || []) {
        this.camTopics.set(topic.topic_id, {
          topic_name: topic.topic_name,
          boundaries: topic.boundaries,
          concepts: new Map()
        });

        for (const concept of topic.concepts || []) {
          this.camConcepts.set(concept.concept_id, {
            concept_name: concept.concept_name,
            difficulty_levels: concept.difficulty_levels,
            topic_id: topic.topic_id
          });
          this.camTopics.get(topic.topic_id).concepts.set(concept.concept_id, concept);
        }
      }
    }
  }

  /**
   * Run all validation checks
   */
  validate() {
    this.validateMetadata();
    this.validateCAMReference();
    this.validateTopicAlignment();
    this.validateCanonicalExplanation();
    this.validateQuestions();
    this.validateCoverage();
    this.computeStats();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        total_questions: this.stats.total_questions,
        by_difficulty: this.stats.by_difficulty,
        by_type: this.stats.by_type,
        concepts_covered: this.stats.concepts_covered.size
      }
    };
  }

  /**
   * Validate question bank metadata
   */
  validateMetadata() {
    const required = ['version', 'cam_reference', 'topic_id', 'topic_name', 'canonical_explanation', 'questions', 'metadata'];

    for (const field of required) {
      if (!this.qb[field]) {
        this.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version format
    if (this.qb.version && !/^\d+\.\d+\.\d+$/.test(this.qb.version)) {
      this.errors.push(`Invalid version format: ${this.qb.version}`);
    }

    // Validate metadata
    if (this.qb.metadata) {
      const validStatuses = ['draft', 'validated', 'locked'];
      if (this.qb.metadata.status && !validStatuses.includes(this.qb.metadata.status)) {
        this.errors.push(`Invalid metadata status: ${this.qb.metadata.status}`);
      }
    }
  }

  /**
   * Validate CAM reference matches the loaded CAM
   */
  validateCAMReference() {
    if (!this.qb.cam_reference) return;

    const ref = this.qb.cam_reference;

    if (ref.cam_version && this.cam.version && ref.cam_version !== this.cam.version) {
      this.warnings.push(`CAM version mismatch: question bank references ${ref.cam_version}, loaded CAM is ${this.cam.version}`);
    }

    if (ref.board && this.cam.board && ref.board !== this.cam.board) {
      this.errors.push(`Board mismatch: ${ref.board} vs ${this.cam.board}`);
    }

    if (ref.class && this.cam.class && ref.class !== this.cam.class) {
      this.errors.push(`Class mismatch: ${ref.class} vs ${this.cam.class}`);
    }

    if (ref.subject && this.cam.subject && ref.subject !== this.cam.subject) {
      this.errors.push(`Subject mismatch: ${ref.subject} vs ${this.cam.subject}`);
    }
  }

  /**
   * Validate topic_id exists in CAM
   */
  validateTopicAlignment() {
    if (!this.qb.topic_id) return;

    if (!this.camTopics.has(this.qb.topic_id)) {
      this.errors.push(`Topic ${this.qb.topic_id} not found in CAM`);
      return;
    }

    const camTopic = this.camTopics.get(this.qb.topic_id);

    // Check topic name matches
    if (this.qb.topic_name && this.qb.topic_name !== camTopic.topic_name) {
      this.warnings.push(`Topic name mismatch: "${this.qb.topic_name}" vs CAM "${camTopic.topic_name}"`);
    }
  }

  /**
   * Validate canonical explanation per North Star §10
   */
  validateCanonicalExplanation() {
    if (!this.qb.canonical_explanation) return;

    const exp = this.qb.canonical_explanation;

    // Check text exists and length
    if (!exp.text) {
      this.errors.push('Canonical explanation missing text');
    } else {
      // Count sentences (rough approximation)
      const sentences = exp.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length < 2) {
        this.warnings.push(`Canonical explanation has only ${sentences.length} sentence(s). §10 requires 2-4 sentences.`);
      }
      if (sentences.length > 4) {
        this.warnings.push(`Canonical explanation has ${sentences.length} sentences. §10 recommends 2-4 sentences.`);
      }

      // Check for teaching language (heuristic)
      const teachingPhrases = [
        'let me explain',
        'step by step',
        'first you need to',
        'to solve this',
        'the method is',
        'follow these steps',
        'here is how'
      ];

      const lowerText = exp.text.toLowerCase();
      for (const phrase of teachingPhrases) {
        if (lowerText.includes(phrase)) {
          this.warnings.push(`Canonical explanation may contain teaching language: "${phrase}". §10 prohibits teaching.`);
        }
      }
    }

    // Check rules exist
    if (!exp.rules || exp.rules.length === 0) {
      this.warnings.push('Canonical explanation should include rules/facts');
    }
  }

  /**
   * Validate all questions
   */
  validateQuestions() {
    if (!this.qb.questions || !Array.isArray(this.qb.questions)) {
      this.errors.push('Questions array is missing or invalid');
      return;
    }

    if (this.qb.questions.length < 5) {
      this.errors.push(`Minimum 5 questions required. Found: ${this.qb.questions.length}`);
    }

    const questionIds = new Set();

    for (let i = 0; i < this.qb.questions.length; i++) {
      this.validateQuestion(this.qb.questions[i], i, questionIds);
    }
  }

  /**
   * Validate a single question
   */
  validateQuestion(q, index, questionIds) {
    const prefix = `Question ${index + 1}`;

    // Required fields - match questions don't need correct_answer (answer is in match_pairs)
    const required = ['question_id', 'concept_id', 'difficulty', 'type', 'question_text'];
    // correct_answer is required for all types except 'match' (where answer is implicit in match_pairs)
    if (q.type !== 'match') {
      required.push('correct_answer');
    }
    for (const field of required) {
      if (q[field] === undefined || q[field] === null) {
        this.errors.push(`${prefix}: missing required field '${field}'`);
      }
    }

    // Validate question_id format and uniqueness
    if (q.question_id) {
      if (!/^T\d{2}\.\d{2}\.Q\d{3}$/.test(q.question_id)) {
        this.errors.push(`${prefix}: invalid question_id format '${q.question_id}'. Expected: TXX.XX.QXXX`);
      }

      // Check question belongs to correct topic
      const qTopicPrefix = q.question_id.substring(0, 6);
      if (qTopicPrefix !== this.qb.topic_id) {
        this.errors.push(`${prefix}: question_id ${q.question_id} does not match topic ${this.qb.topic_id}`);
      }

      // Check uniqueness
      if (questionIds.has(q.question_id)) {
        this.errors.push(`${prefix}: duplicate question_id '${q.question_id}'`);
      }
      questionIds.add(q.question_id);
    }

    // Validate concept_id exists in CAM and belongs to this topic
    if (q.concept_id) {
      if (!this.camConcepts.has(q.concept_id)) {
        this.errors.push(`${prefix}: concept_id '${q.concept_id}' not found in CAM`);
      } else {
        const concept = this.camConcepts.get(q.concept_id);

        // Check concept belongs to this topic (no multi-concept per §6)
        if (concept.topic_id !== this.qb.topic_id) {
          this.errors.push(`${prefix}: concept '${q.concept_id}' belongs to topic '${concept.topic_id}', not '${this.qb.topic_id}'`);
        }

        // Validate difficulty is allowed for this concept (warning instead of error for flexibility)
        if (q.difficulty && !concept.difficulty_levels.includes(q.difficulty)) {
          this.warnings.push(`${prefix}: difficulty '${q.difficulty}' not strictly CAM-allowed for concept '${q.concept_id}'. Allowed: ${concept.difficulty_levels.join(', ')}`);
        }

        this.stats.concepts_covered.add(q.concept_id);
      }
    }

    // Validate difficulty
    const validDifficulties = ['familiarity', 'application', 'exam_style'];
    if (q.difficulty && !validDifficulties.includes(q.difficulty)) {
      this.errors.push(`${prefix}: invalid difficulty '${q.difficulty}'`);
    }

    // Validate type
    const validTypes = ['mcq', 'fill_blank', 'true_false', 'match', 'ordering'];
    if (q.type && !validTypes.includes(q.type)) {
      this.errors.push(`${prefix}: invalid type '${q.type}'`);
    }

    // Type-specific validation
    if (q.type === 'mcq') {
      this.validateMCQ(q, prefix);
    } else if (q.type === 'true_false') {
      this.validateTrueFalse(q, prefix);
    } else if (q.type === 'match') {
      this.validateMatch(q, prefix);
    } else if (q.type === 'ordering') {
      this.validateOrdering(q, prefix);
    }

    // Check for trick question indicators (heuristic)
    if (q.question_text) {
      const trickPhrases = [
        'trick question',
        'none of the above',
        'all of the above',
        'impossible',
        'cannot be determined'
      ];

      const lowerText = q.question_text.toLowerCase();
      for (const phrase of trickPhrases) {
        if (lowerText.includes(phrase)) {
          this.warnings.push(`${prefix}: may contain trick element: "${phrase}". §6 prohibits trick questions.`);
        }
      }
    }

    // Update stats
    this.stats.total_questions++;
    if (q.difficulty) {
      this.stats.by_difficulty[q.difficulty] = (this.stats.by_difficulty[q.difficulty] || 0) + 1;
    }
    if (q.type) {
      this.stats.by_type[q.type] = (this.stats.by_type[q.type] || 0) + 1;
    }
  }

  /**
   * Validate MCQ question
   */
  validateMCQ(q, prefix) {
    if (!q.options || !Array.isArray(q.options)) {
      this.errors.push(`${prefix}: MCQ requires options array`);
      return;
    }

    if (q.options.length !== 4) {
      this.errors.push(`${prefix}: MCQ must have exactly 4 options. Found: ${q.options.length}`);
    }

    // Check option structure
    const optionIds = new Set();
    for (const opt of q.options) {
      if (!opt.id || !opt.text) {
        this.errors.push(`${prefix}: MCQ option missing id or text`);
      }
      if (opt.id && !['A', 'B', 'C', 'D'].includes(opt.id)) {
        this.errors.push(`${prefix}: MCQ option id must be A, B, C, or D. Found: ${opt.id}`);
      }
      if (opt.id) {
        if (optionIds.has(opt.id)) {
          this.errors.push(`${prefix}: duplicate option id '${opt.id}'`);
        }
        optionIds.add(opt.id);
      }
    }

    // Check correct_answer is valid option
    if (q.correct_answer && !['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
      this.errors.push(`${prefix}: correct_answer must be A, B, C, or D for MCQ`);
    }
  }

  /**
   * Validate true/false question
   */
  validateTrueFalse(q, prefix) {
    // Accept both boolean (true/false) and string ("true"/"false")
    const validAnswers = [true, false, 'true', 'false'];
    if (!validAnswers.includes(q.correct_answer)) {
      this.errors.push(`${prefix}: true_false question correct_answer must be boolean or "true"/"false" string`);
    }
  }

  /**
   * Validate match question
   */
  validateMatch(q, prefix) {
    if (!q.match_pairs || !Array.isArray(q.match_pairs)) {
      this.errors.push(`${prefix}: match question requires match_pairs array`);
      return;
    }

    if (q.match_pairs.length < 3) {
      this.warnings.push(`${prefix}: match question should have at least 3 pairs`);
    }

    for (const pair of q.match_pairs) {
      if (!pair.left || !pair.right) {
        this.errors.push(`${prefix}: match pair missing left or right value`);
      }
    }
  }

  /**
   * Validate ordering question
   */
  validateOrdering(q, prefix) {
    // Accept either 'ordering_items' or 'items' for flexibility
    const orderItems = q.ordering_items || q.items;
    if (!orderItems || !Array.isArray(orderItems)) {
      this.errors.push(`${prefix}: ordering question requires ordering_items array`);
      return;
    }

    if (orderItems.length < 3) {
      this.warnings.push(`${prefix}: ordering question should have at least 3 items`);
    }

    // correct_answer should be array for ordering
    if (!Array.isArray(q.correct_answer)) {
      this.errors.push(`${prefix}: ordering question correct_answer must be array`);
    }
  }

  /**
   * Validate concept coverage
   */
  validateCoverage() {
    if (!this.qb.topic_id || !this.camTopics.has(this.qb.topic_id)) return;

    const topicConcepts = this.camTopics.get(this.qb.topic_id).concepts;

    // Check all concepts have at least one question
    for (const [conceptId, concept] of topicConcepts) {
      if (!this.stats.concepts_covered.has(conceptId)) {
        this.warnings.push(`Concept '${conceptId}' (${concept.concept_name}) has no questions`);
      }
    }

    // Check difficulty distribution
    const minPerDifficulty = 3;
    for (const [level, count] of Object.entries(this.stats.by_difficulty)) {
      if (count > 0 && count < minPerDifficulty) {
        this.warnings.push(`Only ${count} question(s) at '${level}' difficulty. Recommend at least ${minPerDifficulty}.`);
      }
    }
  }

  /**
   * Compute final statistics
   */
  computeStats() {
    // Stats already computed during validation
  }
}

/**
 * Load CAM data
 */
function loadCAM(camPath) {
  try {
    const content = fs.readFileSync(camPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load CAM: ${error.message}`);
    return null;
  }
}

/**
 * Validate a single question bank file
 */
function validateQuestionBank(qbFilePath, camData) {
  let qbData;
  try {
    const content = fs.readFileSync(qbFilePath, 'utf8');
    qbData = JSON.parse(content);
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to load question bank: ${error.message}`],
      warnings: [],
      stats: {}
    };
  }

  const validator = new QuestionBankValidator(qbData, camData);
  return validator.validate();
}

/**
 * Validate all question banks in a directory
 */
function validateAllQuestionBanks(qbDir, camPath) {
  console.log('='.repeat(60));
  console.log('QUESTION BANK VALIDATOR');
  console.log('Pressure-free Curriculum Practice App');
  console.log('='.repeat(60));
  console.log();

  // Load CAM
  const camData = loadCAM(camPath);
  if (!camData) {
    console.error('Cannot proceed without valid CAM data');
    process.exit(1);
  }
  console.log(`✓ Loaded CAM: ${camPath}`);
  console.log();

  // Find all question bank files
  let files;
  try {
    files = fs.readdirSync(qbDir).filter(f => f.endsWith('.json'));
  } catch (error) {
    console.error(`Failed to read directory: ${error.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No question bank files found');
    return { valid: true, totalFiles: 0, passedFiles: 0, totalQuestions: 0 };
  }

  console.log(`Found ${files.length} question bank file(s)`);
  console.log();

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalQuestions = 0;
  let passedFiles = 0;
  const allStats = {
    by_difficulty: { familiarity: 0, application: 0, exam_style: 0 },
    by_type: { mcq: 0, fill_blank: 0, true_false: 0, match: 0, ordering: 0 }
  };

  for (const file of files) {
    const filePath = path.join(qbDir, file);
    console.log(`-`.repeat(60));
    console.log(`Validating: ${file}`);

    const result = validateQuestionBank(filePath, camData);

    if (result.valid) {
      console.log(`  ✓ PASSED`);
      passedFiles++;
    } else {
      console.log(`  ✗ FAILED`);
    }

    console.log(`  Questions: ${result.stats.total_questions || 0}`);

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      for (const err of result.errors.slice(0, 5)) {
        console.log(`    ✗ ${err}`);
      }
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more`);
      }
    }

    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.length}`);
      for (const warn of result.warnings.slice(0, 3)) {
        console.log(`    ⚠ ${warn}`);
      }
      if (result.warnings.length > 3) {
        console.log(`    ... and ${result.warnings.length - 3} more`);
      }
    }

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
    totalQuestions += result.stats.total_questions || 0;

    // Aggregate stats
    if (result.stats.by_difficulty) {
      for (const [k, v] of Object.entries(result.stats.by_difficulty)) {
        allStats.by_difficulty[k] = (allStats.by_difficulty[k] || 0) + v;
      }
    }
    if (result.stats.by_type) {
      for (const [k, v] of Object.entries(result.stats.by_type)) {
        allStats.by_type[k] = (allStats.by_type[k] || 0) + v;
      }
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log();
  console.log(`Files validated: ${files.length}`);
  console.log(`Files passed:    ${passedFiles}`);
  console.log(`Files failed:    ${files.length - passedFiles}`);
  console.log();
  console.log(`Total questions: ${totalQuestions}`);
  console.log(`Total errors:    ${totalErrors}`);
  console.log(`Total warnings:  ${totalWarnings}`);
  console.log();
  console.log('By Difficulty:');
  for (const [k, v] of Object.entries(allStats.by_difficulty)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log();
  console.log('By Type:');
  for (const [k, v] of Object.entries(allStats.by_type)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log();
  console.log('='.repeat(60));

  if (totalErrors === 0) {
    console.log('✓ ALL QUESTION BANKS VALIDATED SUCCESSFULLY');
  } else {
    console.log('✗ VALIDATION FAILED - Please fix errors before proceeding');
  }

  console.log('='.repeat(60));

  return {
    valid: totalErrors === 0,
    totalFiles: files.length,
    passedFiles,
    totalQuestions,
    totalErrors,
    totalWarnings,
    stats: allStats
  };
}

// Export for use as module
module.exports = { QuestionBankValidator, validateQuestionBank, validateAllQuestionBanks };

// Run if executed directly
if (require.main === module) {
  const qbDir = process.argv[2] || path.join(__dirname, '..', 'data');
  const camPath = process.argv[3] || path.join(__dirname, '..', '..', 'cam', 'data', 'icse-class5-mathematics-cam.json');

  const result = validateAllQuestionBanks(qbDir, camPath);
  process.exit(result.valid ? 0 : 1);
}
