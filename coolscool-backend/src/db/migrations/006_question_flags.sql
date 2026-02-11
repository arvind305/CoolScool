-- Migration 006: Question Flags
-- Allows users to flag questions for review by admins.

CREATE TABLE question_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(30) NOT NULL,
    curriculum_id UUID REFERENCES curricula(id) ON DELETE SET NULL,
    flag_reason VARCHAR(30) NOT NULL CHECK (flag_reason IN (
        'incorrect_answer', 'unclear_question', 'wrong_grade',
        'wrong_subject', 'typo', 'other'
    )),
    user_comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'fixed', 'dismissed')),
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_question_flags_user ON question_flags(user_id);
CREATE INDEX idx_question_flags_question ON question_flags(question_id);
CREATE INDEX idx_question_flags_status ON question_flags(status);
CREATE INDEX idx_question_flags_reason ON question_flags(flag_reason);
CREATE INDEX idx_question_flags_created ON question_flags(created_at);

-- Prevent duplicate flags per user per question
CREATE UNIQUE INDEX idx_question_flags_user_question ON question_flags(user_id, question_id) WHERE status != 'dismissed';

-- Updated at trigger
CREATE TRIGGER update_question_flags_updated_at BEFORE UPDATE ON question_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
