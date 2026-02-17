-- Migration 008: Add cognitive_level column to questions table
-- Part of the Cognitive Depth Framework (see docs/COGNITIVE-DEPTH-FRAMEWORK.md)

-- Add cognitive_level column with CHECK constraint
ALTER TABLE questions ADD COLUMN cognitive_level VARCHAR(20) DEFAULT 'recall';

ALTER TABLE questions ADD CONSTRAINT check_cognitive_level
  CHECK (cognitive_level IN ('recall', 'compare', 'classify', 'scenario', 'exception', 'reason'));

-- Default all existing questions to 'recall'
UPDATE questions SET cognitive_level = 'recall' WHERE cognitive_level IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE questions ALTER COLUMN cognitive_level SET NOT NULL;

-- Index for efficient pool building by topic + cognitive level
CREATE INDEX idx_questions_topic_cognitive_level ON questions(topic_id_str, cognitive_level);
