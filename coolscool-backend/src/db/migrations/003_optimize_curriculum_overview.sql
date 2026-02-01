-- Migration 003: Optimize curriculum_overview view
-- Replaces the Cartesian-product JOIN approach with correlated subqueries
-- to eliminate the performance bottleneck causing 500 errors on /curricula/overview

CREATE OR REPLACE VIEW curriculum_overview AS
SELECT
    c.id as curriculum_id,
    c.board,
    c.class_level,
    c.subject,
    c.display_name,
    c.is_active,
    (SELECT COUNT(*) FROM themes WHERE curriculum_id = c.id) as theme_count,
    (SELECT COUNT(*) FROM topics WHERE curriculum_id = c.id) as topic_count,
    (SELECT COUNT(*) FROM concepts WHERE curriculum_id = c.id) as concept_count,
    (SELECT COUNT(*) FROM questions WHERE curriculum_id = c.id) as question_count
FROM curricula c;
