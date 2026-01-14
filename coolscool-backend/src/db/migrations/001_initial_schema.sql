-- Cool S-Cool Database Schema
-- Version: 1.0.0
-- Description: Initial schema for enterprise quiz application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'child', -- 'child', 'parent', 'admin'
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL, -- For child accounts
    parental_consent_given BOOLEAN DEFAULT FALSE,
    parental_consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_parent_id ON users(parent_id);

-- ============================================
-- THEMES TABLE (T01, T02, etc.)
-- ============================================
CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme_id VARCHAR(10) UNIQUE NOT NULL,
    theme_name VARCHAR(255) NOT NULL,
    theme_order INTEGER NOT NULL,
    cam_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    board VARCHAR(20) NOT NULL DEFAULT 'ICSE',
    class_level INTEGER NOT NULL DEFAULT 5,
    subject VARCHAR(50) NOT NULL DEFAULT 'Mathematics',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_themes_theme_id ON themes(theme_id);
CREATE INDEX idx_themes_order ON themes(theme_order);

-- ============================================
-- TOPICS TABLE (T01.01, T01.02, etc.)
-- ============================================
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
    topic_id VARCHAR(20) UNIQUE NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    topic_order INTEGER NOT NULL,
    boundaries_in_scope JSONB DEFAULT '[]',
    boundaries_out_of_scope JSONB DEFAULT '[]',
    numeric_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_topics_topic_id ON topics(topic_id);
CREATE INDEX idx_topics_theme_id ON topics(theme_id);
CREATE INDEX idx_topics_order ON topics(topic_order);

-- ============================================
-- CONCEPTS TABLE (T01.01.C01, T01.01.C02, etc.)
-- ============================================
CREATE TABLE concepts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    concept_id VARCHAR(30) UNIQUE NOT NULL,
    concept_name TEXT NOT NULL,
    difficulty_levels VARCHAR(20)[] NOT NULL DEFAULT ARRAY['familiarity', 'application', 'exam_style'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_concepts_concept_id ON concepts(concept_id);
CREATE INDEX idx_concepts_topic_id ON concepts(topic_id);

-- ============================================
-- CANONICAL EXPLANATIONS TABLE
-- ============================================
CREATE TABLE canonical_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE UNIQUE,
    explanation_text TEXT NOT NULL,
    rules TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_explanations_topic_id ON canonical_explanations(topic_id);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id VARCHAR(30) UNIQUE NOT NULL,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    concept_id_str VARCHAR(30) NOT NULL, -- Denormalized for fast lookup
    topic_id_str VARCHAR(20) NOT NULL,   -- Denormalized
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('familiarity', 'application', 'exam_style')),
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'fill_blank', 'true_false', 'match', 'ordering')),
    question_text TEXT NOT NULL,
    options JSONB, -- For MCQ: [{"id": "A", "text": "..."}, ...]
    correct_answer JSONB NOT NULL, -- String, boolean, or array depending on type
    match_pairs JSONB, -- For match type
    ordering_items JSONB, -- For ordering type
    hint TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_questions_question_id ON questions(question_id);
CREATE INDEX idx_questions_concept_id ON questions(concept_id);
CREATE INDEX idx_questions_concept_id_str ON questions(concept_id_str);
CREATE INDEX idx_questions_topic_id_str ON questions(topic_id_str);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_topic_difficulty ON questions(topic_id_str, difficulty);

-- ============================================
-- QUIZ SESSIONS TABLE
-- ============================================
CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_status VARCHAR(20) NOT NULL DEFAULT 'not_started'
        CHECK (session_status IN ('not_started', 'in_progress', 'paused', 'completed', 'abandoned')),
    time_mode VARCHAR(20) NOT NULL DEFAULT 'unlimited'
        CHECK (time_mode IN ('unlimited', '10min', '5min', '3min')),
    time_limit_ms INTEGER, -- NULL for unlimited
    topic_id_str VARCHAR(20) NOT NULL,
    topic_name VARCHAR(255) NOT NULL,

    -- Progress tracking
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    questions_skipped INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    current_question_index INTEGER DEFAULT 0,
    time_elapsed_ms INTEGER DEFAULT 0,

    -- Question queue (IDs only - questions fetched on demand)
    question_queue UUID[] NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_sessions_status ON quiz_sessions(session_status);
CREATE INDEX idx_sessions_user_status ON quiz_sessions(user_id, session_status);
CREATE INDEX idx_sessions_topic ON quiz_sessions(topic_id_str);

-- ============================================
-- SESSION ANSWERS TABLE
-- ============================================
CREATE TABLE session_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    question_index INTEGER NOT NULL,
    user_answer JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    time_taken_ms INTEGER,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_session_answers_session ON session_answers(session_id);
CREATE INDEX idx_session_answers_question ON session_answers(question_id);

-- ============================================
-- CONCEPT PROGRESS TABLE (Per-user mastery)
-- ============================================
CREATE TABLE concept_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    concept_id_str VARCHAR(30) NOT NULL,
    current_difficulty VARCHAR(20) NOT NULL DEFAULT 'familiarity',

    -- Total stats
    total_attempts INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,

    -- Mastery by difficulty (matches existing quiz engine structure)
    mastery_data JSONB NOT NULL DEFAULT '{
        "familiarity": {"attempts": 0, "correct": 0, "streak": 0, "mastered": false, "mastered_at": null, "recent_attempts": []},
        "application": {"attempts": 0, "correct": 0, "streak": 0, "mastered": false, "mastered_at": null, "recent_attempts": []},
        "exam_style": {"attempts": 0, "correct": 0, "streak": 0, "mastered": false, "mastered_at": null, "recent_attempts": []}
    }',

    last_attempted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, concept_id)
);

CREATE INDEX idx_concept_progress_user ON concept_progress(user_id);
CREATE INDEX idx_concept_progress_concept ON concept_progress(concept_id_str);
CREATE INDEX idx_concept_progress_user_concept ON concept_progress(user_id, concept_id_str);

-- ============================================
-- TOPIC PROGRESS TABLE (Aggregated/cached)
-- ============================================
CREATE TABLE topic_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id_str VARCHAR(20) NOT NULL,
    proficiency_band VARCHAR(50) NOT NULL DEFAULT 'not_started'
        CHECK (proficiency_band IN ('not_started', 'building_familiarity', 'growing_confidence', 'consistent_understanding', 'exam_ready')),

    concepts_count INTEGER DEFAULT 0,
    concepts_started INTEGER DEFAULT 0,
    concepts_mastered INTEGER DEFAULT 0,

    total_attempts INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,

    last_attempted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, topic_id_str)
);

CREATE INDEX idx_topic_progress_user ON topic_progress(user_id);
CREATE INDEX idx_topic_progress_topic ON topic_progress(topic_id_str);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    device_info JSONB
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    details JSONB
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concept_progress_updated_at BEFORE UPDATE ON concept_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_progress_updated_at BEFORE UPDATE ON topic_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
