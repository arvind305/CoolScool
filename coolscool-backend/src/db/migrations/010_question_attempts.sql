-- Migration 010: Create question_attempts table for audit trail
-- Records every question attempt for analytics and mastery tracking.

CREATE TABLE IF NOT EXISTS question_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    concept_id_str VARCHAR(30) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    time_taken_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_concept ON question_attempts(user_id, concept_id_str);
CREATE INDEX IF NOT EXISTS idx_question_attempts_created_at ON question_attempts(created_at);
