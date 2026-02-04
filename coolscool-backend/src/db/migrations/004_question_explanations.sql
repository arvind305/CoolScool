-- Add per-question explanation columns
-- explanation_correct: shown when student answers correctly (reinforces the concept)
-- explanation_incorrect: shown when student answers incorrectly (explains step-by-step)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_correct TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_incorrect TEXT;
