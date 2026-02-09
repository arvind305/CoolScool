-- Migration: 005_user_profiles.sql
-- Description: Add user profiles table for extended user information

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Personal info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),

    -- Education
    grade INTEGER CHECK (grade BETWEEN 1 AND 12),
    school_name VARCHAR(255),

    -- Location
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',

    -- About
    bio TEXT,

    -- Parent/Guardian info
    parent_guardian_name VARCHAR(200),
    parent_guardian_phone VARCHAR(20),
    parent_guardian_email VARCHAR(255),
    parent_guardian_relationship VARCHAR(50),

    -- Learning preferences
    preferred_language VARCHAR(50) DEFAULT 'English',
    learning_style VARCHAR(50),
    subjects_of_interest TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_profile
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

INSERT INTO user_profiles (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
