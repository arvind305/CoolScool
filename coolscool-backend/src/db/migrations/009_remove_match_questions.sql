-- Migration 009: Remove match-type questions and disallow the type
-- The frontend no longer supports match-type questions.
-- Any match questions in the DB are ghost entries from old seeds that render as blank.

-- Step 1: Delete all match-type questions from the database
DELETE FROM questions WHERE question_type = 'match';

-- Step 2: Update the CHECK constraint to exclude 'match'
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN ('mcq', 'fill_blank', 'true_false', 'ordering'));
