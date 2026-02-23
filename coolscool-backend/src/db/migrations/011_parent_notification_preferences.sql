-- Migration 011: Parent notification preferences
-- Stores notification settings for parent users

CREATE TABLE IF NOT EXISTS parent_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_digest VARCHAR(20) NOT NULL DEFAULT 'weekly' CHECK (email_digest IN ('daily', 'weekly', 'off')),
  low_accuracy_alerts BOOLEAN NOT NULL DEFAULT true,
  inactivity_alerts BOOLEAN NOT NULL DEFAULT true,
  inactivity_threshold_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
