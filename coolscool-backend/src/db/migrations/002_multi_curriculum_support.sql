-- Migration: 002_multi_curriculum_support.sql
-- Description: Add support for multiple boards, classes, and subjects
--
-- This migration introduces a `curricula` table as the parent entity
-- and scopes all content (themes, topics, concepts, questions) to a curriculum.

-- ============================================
-- CURRICULA TABLE (New)
-- ============================================
-- Each unique combination of board/class/subject is a curriculum
CREATE TABLE curricula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board VARCHAR(30) NOT NULL,              -- 'ICSE', 'CBSE', 'STATE_MH', 'STATE_KA', 'IGCSE'
    class_level INTEGER NOT NULL,            -- 1-12
    subject VARCHAR(50) NOT NULL,            -- 'Mathematics', 'Science', 'English'
    academic_year VARCHAR(20),               -- '2025-2026'
    cam_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    display_name VARCHAR(255),               -- 'ICSE Class 5 Mathematics'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(board, class_level, subject)
);

CREATE INDEX idx_curricula_board ON curricula(board);
CREATE INDEX idx_curricula_class ON curricula(class_level);
CREATE INDEX idx_curricula_subject ON curricula(subject);
CREATE INDEX idx_curricula_active ON curricula(is_active);

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================
-- Create curriculum entry for existing ICSE Class 5 Mathematics
INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name)
VALUES ('ICSE', 5, 'Mathematics', '2025-2026', '1.0.0', 'ICSE Class 5 Mathematics');

-- ============================================
-- MODIFY THEMES TABLE
-- ============================================
-- Add curriculum_id foreign key
ALTER TABLE themes ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

-- Populate curriculum_id for existing themes
UPDATE themes SET curriculum_id = (
    SELECT id FROM curricula WHERE board = 'ICSE' AND class_level = 5 AND subject = 'Mathematics'
);

-- Make curriculum_id NOT NULL after population
ALTER TABLE themes ALTER COLUMN curriculum_id SET NOT NULL;

-- Drop old unique constraint and add new composite unique
ALTER TABLE themes DROP CONSTRAINT IF EXISTS themes_theme_id_key;
ALTER TABLE themes ADD CONSTRAINT themes_curriculum_theme_unique UNIQUE (curriculum_id, theme_id);

-- Drop old board/class/subject columns (now in curricula table)
ALTER TABLE themes DROP COLUMN IF EXISTS board;
ALTER TABLE themes DROP COLUMN IF EXISTS class_level;
ALTER TABLE themes DROP COLUMN IF EXISTS subject;

CREATE INDEX idx_themes_curriculum ON themes(curriculum_id);

-- ============================================
-- MODIFY TOPICS TABLE
-- ============================================
-- Add curriculum_id for denormalized fast queries
ALTER TABLE topics ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

-- Populate from themes
UPDATE topics t SET curriculum_id = (
    SELECT th.curriculum_id FROM themes th WHERE th.id = t.theme_id
);

ALTER TABLE topics ALTER COLUMN curriculum_id SET NOT NULL;

-- Drop old unique constraint and add new composite unique
ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_topic_id_key;
ALTER TABLE topics ADD CONSTRAINT topics_curriculum_topic_unique UNIQUE (curriculum_id, topic_id);

CREATE INDEX idx_topics_curriculum ON topics(curriculum_id);

-- ============================================
-- MODIFY CONCEPTS TABLE
-- ============================================
-- Add curriculum_id for denormalized fast queries
ALTER TABLE concepts ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

-- Populate from topics
UPDATE concepts c SET curriculum_id = (
    SELECT t.curriculum_id FROM topics t WHERE t.id = c.topic_id
);

ALTER TABLE concepts ALTER COLUMN curriculum_id SET NOT NULL;

-- Drop old unique constraint and add new composite unique
ALTER TABLE concepts DROP CONSTRAINT IF EXISTS concepts_concept_id_key;
ALTER TABLE concepts ADD CONSTRAINT concepts_curriculum_concept_unique UNIQUE (curriculum_id, concept_id);

CREATE INDEX idx_concepts_curriculum ON concepts(curriculum_id);

-- ============================================
-- MODIFY QUESTIONS TABLE
-- ============================================
-- Add curriculum_id for denormalized fast queries
ALTER TABLE questions ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

-- Populate from concepts
UPDATE questions q SET curriculum_id = (
    SELECT c.curriculum_id FROM concepts c WHERE c.id = q.concept_id
);

ALTER TABLE questions ALTER COLUMN curriculum_id SET NOT NULL;

-- Drop old unique constraint and add new composite unique
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_id_key;
ALTER TABLE questions ADD CONSTRAINT questions_curriculum_question_unique UNIQUE (curriculum_id, question_id);

CREATE INDEX idx_questions_curriculum ON questions(curriculum_id);

-- ============================================
-- MODIFY CANONICAL_EXPLANATIONS TABLE
-- ============================================
ALTER TABLE canonical_explanations ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

UPDATE canonical_explanations ce SET curriculum_id = (
    SELECT t.curriculum_id FROM topics t WHERE t.id = ce.topic_id
);

ALTER TABLE canonical_explanations ALTER COLUMN curriculum_id SET NOT NULL;

CREATE INDEX idx_explanations_curriculum ON canonical_explanations(curriculum_id);

-- ============================================
-- MODIFY QUIZ_SESSIONS TABLE
-- ============================================
-- Add curriculum context to sessions
ALTER TABLE quiz_sessions ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

-- Populate existing sessions (assume ICSE Class 5 Math)
UPDATE quiz_sessions SET curriculum_id = (
    SELECT id FROM curricula WHERE board = 'ICSE' AND class_level = 5 AND subject = 'Mathematics'
);

ALTER TABLE quiz_sessions ALTER COLUMN curriculum_id SET NOT NULL;

CREATE INDEX idx_sessions_curriculum ON quiz_sessions(curriculum_id);

-- ============================================
-- MODIFY PROGRESS TABLES
-- ============================================
-- Concept progress
ALTER TABLE concept_progress ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

UPDATE concept_progress SET curriculum_id = (
    SELECT id FROM curricula WHERE board = 'ICSE' AND class_level = 5 AND subject = 'Mathematics'
);

ALTER TABLE concept_progress ALTER COLUMN curriculum_id SET NOT NULL;

-- Drop old unique and add curriculum-scoped unique
ALTER TABLE concept_progress DROP CONSTRAINT IF EXISTS concept_progress_user_id_concept_id_key;
ALTER TABLE concept_progress ADD CONSTRAINT concept_progress_user_curriculum_concept_unique
    UNIQUE (user_id, curriculum_id, concept_id);

CREATE INDEX idx_concept_progress_curriculum ON concept_progress(curriculum_id);

-- Topic progress
ALTER TABLE topic_progress ADD COLUMN curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE;

UPDATE topic_progress SET curriculum_id = (
    SELECT id FROM curricula WHERE board = 'ICSE' AND class_level = 5 AND subject = 'Mathematics'
);

ALTER TABLE topic_progress ALTER COLUMN curriculum_id SET NOT NULL;

-- Drop old unique and add curriculum-scoped unique
ALTER TABLE topic_progress DROP CONSTRAINT IF EXISTS topic_progress_user_id_topic_id_str_key;
ALTER TABLE topic_progress ADD CONSTRAINT topic_progress_user_curriculum_topic_unique
    UNIQUE (user_id, curriculum_id, topic_id_str);

CREATE INDEX idx_topic_progress_curriculum ON topic_progress(curriculum_id);

-- ============================================
-- ADD USER CURRICULUM PREFERENCES
-- ============================================
-- Users can have a default/active curriculum
ALTER TABLE users ADD COLUMN default_curriculum_id UUID REFERENCES curricula(id) ON DELETE SET NULL;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_curricula_updated_at BEFORE UPDATE ON curricula
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER VIEWS
-- ============================================
-- View for easy curriculum content browsing
CREATE OR REPLACE VIEW curriculum_overview AS
SELECT
    c.id as curriculum_id,
    c.board,
    c.class_level,
    c.subject,
    c.display_name,
    c.is_active,
    COUNT(DISTINCT th.id) as theme_count,
    COUNT(DISTINCT t.id) as topic_count,
    COUNT(DISTINCT co.id) as concept_count,
    COUNT(DISTINCT q.id) as question_count
FROM curricula c
LEFT JOIN themes th ON th.curriculum_id = c.id
LEFT JOIN topics t ON t.curriculum_id = c.id
LEFT JOIN concepts co ON co.curriculum_id = c.id
LEFT JOIN questions q ON q.curriculum_id = c.id
GROUP BY c.id, c.board, c.class_level, c.subject, c.display_name, c.is_active;
