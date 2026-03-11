-- 012_gamification.sql
-- Achievement definitions, user achievements, daily challenges, and daily challenge attempts

-- Achievement definitions (seeded, not user-created)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achievement_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL,
  icon VARCHAR(20) NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's earned achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(achievement_id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Daily challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_date DATE UNIQUE NOT NULL,
  question_id UUID NOT NULL REFERENCES questions(id),
  bonus_xp INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User attempts on daily challenges
CREATE TABLE IF NOT EXISTS daily_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id),
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Seed 15 achievement definitions
INSERT INTO achievements (achievement_id, name, description, category, icon, xp_reward, criteria, sort_order) VALUES
  ('first_quiz', 'First Steps', 'Complete your first quiz session', 'milestone', 'rocket', 50, '{"type":"sessions","value":1}', 1),
  ('sessions_10', 'Dedicated Learner', 'Complete 10 quiz sessions', 'milestone', 'book', 100, '{"type":"sessions","value":10}', 2),
  ('sessions_50', 'Quiz Champion', 'Complete 50 quiz sessions', 'milestone', 'trophy', 250, '{"type":"sessions","value":50}', 3),
  ('sessions_100', 'Century Scorer', 'Complete 100 quiz sessions', 'milestone', 'crown', 500, '{"type":"sessions","value":100}', 4),
  ('streak_3', 'Getting Started', 'Maintain a 3-day streak', 'streak', 'fire', 50, '{"type":"streak","value":3}', 5),
  ('streak_5', 'On a Roll', 'Maintain a 5-day streak', 'streak', 'fire', 100, '{"type":"streak","value":5}', 6),
  ('streak_10', 'Unstoppable', 'Maintain a 10-day streak', 'streak', 'lightning', 200, '{"type":"streak","value":10}', 7),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day streak', 'streak', 'lightning', 500, '{"type":"streak","value":30}', 8),
  ('perfect_session', 'Perfect Score', 'Get 100% in a quiz session', 'accuracy', 'star', 75, '{"type":"perfect_session","value":1}', 9),
  ('perfect_5', 'Perfection Streak', 'Get 100% in 5 quiz sessions', 'accuracy', 'star', 200, '{"type":"perfect_sessions","value":5}', 10),
  ('xp_1000', 'XP Collector', 'Earn 1,000 XP', 'milestone', 'gem', 100, '{"type":"xp","value":1000}', 11),
  ('xp_5000', 'XP Hoarder', 'Earn 5,000 XP', 'milestone', 'gem', 250, '{"type":"xp","value":5000}', 12),
  ('topic_mastery_1', 'First Mastery', 'Master your first topic', 'mastery', 'target', 100, '{"type":"topics_mastered","value":1}', 13),
  ('topic_mastery_5', 'Knowledge Seeker', 'Master 5 topics', 'mastery', 'target', 250, '{"type":"topics_mastered","value":5}', 14),
  ('daily_challenge_7', 'Daily Warrior', 'Complete 7 daily challenges correctly', 'streak', 'shield', 150, '{"type":"daily_challenges","value":7}', 15)
ON CONFLICT (achievement_id) DO NOTHING;
