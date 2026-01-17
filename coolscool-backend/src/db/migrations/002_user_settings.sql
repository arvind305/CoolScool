-- User Settings Table
-- Version: 1.0.1
-- Description: Stores user preferences and settings

CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    preferred_time_mode VARCHAR(20) NOT NULL DEFAULT 'unlimited'
        CHECK (preferred_time_mode IN ('unlimited', '10min', '5min', '3min')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- Apply updated_at trigger
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
