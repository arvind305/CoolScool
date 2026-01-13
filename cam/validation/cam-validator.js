/**
 * CAM (Curriculum Authority Model) Validator
 *
 * This validator ensures CAM integrity per the North Star document:
 * - All content must be CAM-validated
 * - Any uncertainty must result in rejection, not guessing
 * - Child trust is non-negotiable
 */

const fs = require('fs');
const path = require('path');

class CAMValidator {
  constructor(camData) {
    this.cam = camData;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      themes: 0,
      topics: 0,
      concepts: 0,
      boundaries_defined: 0
    };
  }

  /**
   * Run all validation checks
   * @returns {object} Validation result with errors, warnings, and stats
   */
  validate() {
    this.validateMetadata();
    this.validateStructure();
    this.validateUniqueIds();
    this.validateBoundaries();
    this.validateDifficultyLevels();
    this.validateCompleteness();
    this.computeStats();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.stats
    };
  }

  /**
   * Validate CAM metadata
   */
  validateMetadata() {
    const required = ['version', 'board', 'class', 'subject', 'academic_year', 'metadata'];

    for (const field of required) {
      if (!this.cam[field]) {
        this.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version format
    if (this.cam.version && !/^\d+\.\d+\.\d+$/.test(this.cam.version)) {
      this.errors.push(`Invalid version format: ${this.cam.version}. Expected: X.Y.Z`);
    }

    // Validate academic year format
    if (this.cam.academic_year && !/^\d{4}-\d{4}$/.test(this.cam.academic_year)) {
      this.errors.push(`Invalid academic_year format: ${this.cam.academic_year}. Expected: YYYY-YYYY`);
    }

    // Validate metadata status
    if (this.cam.metadata) {
      const validStatuses = ['draft', 'validated', 'locked'];
      if (!validStatuses.includes(this.cam.metadata.status)) {
        this.errors.push(`Invalid metadata status: ${this.cam.metadata.status}`);
      }
    }
  }

  /**
   * Validate hierarchical structure
   */
  validateStructure() {
    if (!this.cam.themes || !Array.isArray(this.cam.themes)) {
      this.errors.push('Missing or invalid themes array');
      return;
    }

    if (this.cam.themes.length === 0) {
      this.errors.push('CAM must have at least one theme');
      return;
    }

    for (const theme of this.cam.themes) {
      this.validateTheme(theme);
    }
  }

  /**
   * Validate a single theme
   */
  validateTheme(theme) {
    const requiredFields = ['theme_id', 'theme_name', 'theme_order', 'topics'];

    for (const field of requiredFields) {
      if (!theme[field] && theme[field] !== 0) {
        this.errors.push(`Theme missing required field: ${field}`);
      }
    }

    // Validate theme_id format
    if (theme.theme_id && !/^T\d{2}$/.test(theme.theme_id)) {
      this.errors.push(`Invalid theme_id format: ${theme.theme_id}. Expected: TXX`);
    }

    // Validate topics
    if (theme.topics) {
      if (!Array.isArray(theme.topics)) {
        this.errors.push(`Theme ${theme.theme_id}: topics must be an array`);
      } else if (theme.topics.length === 0) {
        this.errors.push(`Theme ${theme.theme_id}: must have at least one topic`);
      } else {
        for (const topic of theme.topics) {
          this.validateTopic(topic, theme.theme_id);
        }
      }
    }
  }

  /**
   * Validate a single topic
   */
  validateTopic(topic, themeId) {
    const requiredFields = ['topic_id', 'topic_name', 'topic_order', 'concepts', 'boundaries'];

    for (const field of requiredFields) {
      if (!topic[field] && topic[field] !== 0) {
        this.errors.push(`Topic in ${themeId} missing required field: ${field}`);
      }
    }

    // Validate topic_id format and parent reference
    if (topic.topic_id) {
      if (!/^T\d{2}\.\d{2}$/.test(topic.topic_id)) {
        this.errors.push(`Invalid topic_id format: ${topic.topic_id}. Expected: TXX.XX`);
      }

      // Check topic belongs to correct theme
      const topicThemePrefix = topic.topic_id.split('.')[0];
      if (topicThemePrefix !== themeId) {
        this.errors.push(`Topic ${topic.topic_id} does not match parent theme ${themeId}`);
      }
    }

    // Validate concepts
    if (topic.concepts) {
      if (!Array.isArray(topic.concepts)) {
        this.errors.push(`Topic ${topic.topic_id}: concepts must be an array`);
      } else if (topic.concepts.length === 0) {
        this.errors.push(`Topic ${topic.topic_id}: must have at least one concept`);
      } else {
        for (const concept of topic.concepts) {
          this.validateConcept(concept, topic.topic_id);
        }
      }
    }
  }

  /**
   * Validate a single concept
   */
  validateConcept(concept, topicId) {
    const requiredFields = ['concept_id', 'concept_name', 'difficulty_levels'];

    for (const field of requiredFields) {
      if (!concept[field]) {
        this.errors.push(`Concept in ${topicId} missing required field: ${field}`);
      }
    }

    // Validate concept_id format
    if (concept.concept_id) {
      if (!/^T\d{2}\.\d{2}\.C\d{2}$/.test(concept.concept_id)) {
        this.errors.push(`Invalid concept_id format: ${concept.concept_id}. Expected: TXX.XX.CXX`);
      }

      // Check concept belongs to correct topic
      const conceptTopicPrefix = concept.concept_id.split('.C')[0];
      if (conceptTopicPrefix !== topicId) {
        this.errors.push(`Concept ${concept.concept_id} does not match parent topic ${topicId}`);
      }
    }

    // Validate difficulty_levels
    if (concept.difficulty_levels) {
      const validLevels = ['familiarity', 'application', 'exam_style'];
      for (const level of concept.difficulty_levels) {
        if (!validLevels.includes(level)) {
          this.errors.push(`Concept ${concept.concept_id}: invalid difficulty level '${level}'`);
        }
      }
    }
  }

  /**
   * Validate all IDs are unique
   */
  validateUniqueIds() {
    const themeIds = new Set();
    const topicIds = new Set();
    const conceptIds = new Set();

    for (const theme of this.cam.themes || []) {
      // Check theme ID uniqueness
      if (themeIds.has(theme.theme_id)) {
        this.errors.push(`Duplicate theme_id: ${theme.theme_id}`);
      }
      themeIds.add(theme.theme_id);

      for (const topic of theme.topics || []) {
        // Check topic ID uniqueness
        if (topicIds.has(topic.topic_id)) {
          this.errors.push(`Duplicate topic_id: ${topic.topic_id}`);
        }
        topicIds.add(topic.topic_id);

        for (const concept of topic.concepts || []) {
          // Check concept ID uniqueness
          if (conceptIds.has(concept.concept_id)) {
            this.errors.push(`Duplicate concept_id: ${concept.concept_id}`);
          }
          conceptIds.add(concept.concept_id);
        }
      }
    }
  }

  /**
   * Validate boundaries are properly defined
   */
  validateBoundaries() {
    for (const theme of this.cam.themes || []) {
      for (const topic of theme.topics || []) {
        if (!topic.boundaries) {
          this.errors.push(`Topic ${topic.topic_id}: missing boundaries definition`);
          continue;
        }

        // Check in_scope
        if (!topic.boundaries.in_scope || !Array.isArray(topic.boundaries.in_scope)) {
          this.errors.push(`Topic ${topic.topic_id}: missing or invalid in_scope boundary`);
        } else if (topic.boundaries.in_scope.length === 0) {
          this.errors.push(`Topic ${topic.topic_id}: in_scope cannot be empty`);
        }

        // Check out_of_scope
        if (!topic.boundaries.out_of_scope || !Array.isArray(topic.boundaries.out_of_scope)) {
          this.errors.push(`Topic ${topic.topic_id}: missing or invalid out_of_scope boundary`);
        } else if (topic.boundaries.out_of_scope.length === 0) {
          this.warnings.push(`Topic ${topic.topic_id}: out_of_scope is empty (consider adding explicit exclusions)`);
        }

        this.stats.boundaries_defined++;
      }
    }
  }

  /**
   * Validate difficulty levels are appropriate
   */
  validateDifficultyLevels() {
    for (const theme of this.cam.themes || []) {
      for (const topic of theme.topics || []) {
        const topicLevels = new Set();

        for (const concept of topic.concepts || []) {
          for (const level of concept.difficulty_levels || []) {
            topicLevels.add(level);
          }
        }

        // Per North Star: Each topic must include familiarity, application, exam-style
        const requiredLevels = ['familiarity', 'application', 'exam_style'];
        for (const level of requiredLevels) {
          if (!topicLevels.has(level)) {
            this.warnings.push(`Topic ${topic.topic_id}: missing '${level}' difficulty level across concepts`);
          }
        }
      }
    }
  }

  /**
   * Validate CAM completeness
   */
  validateCompleteness() {
    // Check for minimum expected themes (ICSE Grade 5 Maths should have 10)
    const expectedThemes = 10;
    if (this.cam.themes && this.cam.themes.length < expectedThemes) {
      this.warnings.push(`Expected ${expectedThemes} themes, found ${this.cam.themes.length}`);
    }

    // Validate theme ordering is sequential
    const themeOrders = (this.cam.themes || []).map(t => t.theme_order).sort((a, b) => a - b);
    for (let i = 0; i < themeOrders.length; i++) {
      if (themeOrders[i] !== i + 1) {
        this.warnings.push(`Theme ordering is not sequential. Found gap at position ${i + 1}`);
        break;
      }
    }
  }

  /**
   * Compute statistics
   */
  computeStats() {
    this.stats.themes = (this.cam.themes || []).length;

    for (const theme of this.cam.themes || []) {
      this.stats.topics += (theme.topics || []).length;

      for (const topic of theme.topics || []) {
        this.stats.concepts += (topic.concepts || []).length;
      }
    }
  }
}

/**
 * Main validation function
 */
function validateCAM(camFilePath) {
  console.log('='.repeat(60));
  console.log('CAM VALIDATOR');
  console.log('Pressure-free Curriculum Practice App');
  console.log('='.repeat(60));
  console.log();

  // Read CAM file
  let camData;
  try {
    const fileContent = fs.readFileSync(camFilePath, 'utf8');
    camData = JSON.parse(fileContent);
    console.log(`✓ Loaded CAM file: ${camFilePath}`);
  } catch (error) {
    console.error(`✗ Failed to load CAM file: ${error.message}`);
    process.exit(1);
  }

  // Run validation
  const validator = new CAMValidator(camData);
  const result = validator.validate();

  console.log();
  console.log('-'.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('-'.repeat(60));
  console.log();

  // Display statistics
  console.log('STATISTICS:');
  console.log(`  Themes:     ${result.stats.themes}`);
  console.log(`  Topics:     ${result.stats.topics}`);
  console.log(`  Concepts:   ${result.stats.concepts}`);
  console.log(`  Boundaries: ${result.stats.boundaries_defined}`);
  console.log();

  // Display errors
  if (result.errors.length > 0) {
    console.log(`ERRORS (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`  ✗ ${error}`);
    }
    console.log();
  }

  // Display warnings
  if (result.warnings.length > 0) {
    console.log(`WARNINGS (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
    console.log();
  }

  // Final verdict
  console.log('-'.repeat(60));
  if (result.valid) {
    console.log('✓ CAM VALIDATION PASSED');
    console.log('  The CAM is structurally valid and ready for review.');
  } else {
    console.log('✗ CAM VALIDATION FAILED');
    console.log('  Please fix the errors above before proceeding.');
  }
  console.log('-'.repeat(60));

  return result;
}

// Export for use as module
module.exports = { CAMValidator, validateCAM };

// Run if executed directly
if (require.main === module) {
  const camPath = process.argv[2] || path.join(__dirname, '..', 'data', 'icse-class5-mathematics-cam.json');
  const result = validateCAM(camPath);
  process.exit(result.valid ? 0 : 1);
}
