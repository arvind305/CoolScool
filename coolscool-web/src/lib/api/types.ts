/**
 * API Types
 *
 * Common types for API responses and errors.
 */

// Standard API response wrapper
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: APIErrorData;
}

// Error data structure
export interface APIErrorData {
  code: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Pagination parameters
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// User settings
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  preferredTimeMode: 'unlimited' | '10min' | '5min' | '3min';
}

// Parent types
export interface LinkedChild {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  linkedAt: string;
  parentalConsentGiven: boolean;
}

export interface ChildProgressSummary {
  childId: string;
  totalXp: number;
  sessionsCompleted: number;
  topicsStarted: number;
  topicsTotal: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  childId: string;
  childName: string;
  type: 'session_completed' | 'topic_started' | 'milestone_reached';
  description: string;
  timestamp: string;
  metadata: {
    topicId?: string;
    topicName?: string;
    xpEarned?: number;
    questionsCorrect?: number;
    questionsTotal?: number;
    proficiencyBand?: string;
  };
}

export interface ChildFullProgress {
  child: LinkedChild;
  summary: {
    totalXp: number;
    sessionsCompleted: number;
    topicsStarted: number;
    topicsTotal: number;
    averageAccuracy: number;
  };
  topics: {
    topicId: string;
    topicName: string;
    proficiencyBand: string;
    conceptsStarted: number;
    conceptsTotal: number;
    xpEarned: number;
    lastAttemptedAt: string | null;
  }[];
  recentSessions: {
    id: string;
    topicId: string;
    topicName: string;
    questionsAnswered: number;
    questionsCorrect: number;
    xpEarned: number;
    completedAt: string;
  }[];
}

export interface ChildSession {
  id: string;
  topicId: string;
  topicName: string;
  status: string;
  timeMode: string;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsSkipped: number;
  xpEarned: number;
  timeElapsedMs: number;
  createdAt: string;
  completedAt: string | null;
}

// Weekly summary types
export interface WeekStats {
  sessionsCompleted: number;
  questionsAnswered: number;
  questionsCorrect: number;
  accuracy: number;
  xpEarned: number;
  timeSpentMs: number;
}

export interface WeeklySummary {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  deltas: {
    sessions: number;
    questions: number;
    accuracy: number;
    xp: number;
  };
}

// Subject breakdown (from analytics)
export interface SubjectBreakdownItem {
  subject: string;
  sessions: number;
  questions: number;
  correct: number;
  accuracy: number;
}

// Areas of concern
export interface AreaOfConcern {
  topicId: string;
  topicName: string;
  subject: string;
  accuracy: number;
  trend: 'declining' | 'consistently_low';
  recentAccuracy: number;
  previousAccuracy: number;
  totalAttempts: number;
}

// Session detail (drill-down)
export interface SessionDetailAnswer {
  questionId: string;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation: string | null;
  answeredAt: string;
}

export interface SessionDetail {
  sessionId: string;
  topicId: string;
  topicName: string;
  questionsAnswered: number;
  questionsCorrect: number;
  xpEarned: number;
  timeElapsedMs: number;
  completedAt: string | null;
  answers: SessionDetailAnswer[];
}

// Notification preferences
export interface NotificationPreferences {
  emailDigest: 'daily' | 'weekly' | 'off';
  lowAccuracyAlerts: boolean;
  inactivityAlerts: boolean;
  inactivityThresholdDays: number;
}

// Curriculum types
export interface Curriculum {
  id: string;
  board: string;
  classLevel: number;
  subject: string;
  displayName: string;
  description?: string;
  academicYear: string | null;
  camVersion: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurriculumWithCounts extends Curriculum {
  counts: {
    themes: number;
    topics: number;
    concepts: number;
    questions: number;
  };
}

export interface CurriculaListResponse {
  curricula: Curriculum[];
}

export interface CurriculaOverviewResponse {
  curricula: CurriculumWithCounts[];
}

// Gamification types
export interface Achievement {
  achievementId: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  xpReward: number;
  sortOrder: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface AchievementStats {
  earned: number;
  total: number;
  recentAchievements: Achievement[];
}

export interface LevelInfo {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  progress: number;
  totalXp: number;
}

export interface AwardedAchievement {
  achievementId: string;
  name: string;
  description: string | null;
  icon: string;
  xpReward: number;
}

export interface DailyChallenge {
  challenge: {
    id: string;
    challengeDate: string;
    bonusXp: number;
    question: {
      id: string;
      question_id: string;
      question_type: string;
      question_text: string;
      options: { id: string; text: string }[] | null;
      image_url: string | null;
    };
  } | null;
  attempted: boolean;
  result: {
    isCorrect: boolean;
    xpEarned: number;
  } | null;
}

export interface DailyChallengeResult {
  isCorrect: boolean;
  xpEarned: number;
  correctAnswer: string;
  explanation: string | null;
}

// Progress types
export interface UserProgress {
  userId: string;
  totalXp: number;
  sessionsCompleted: number;
  topicsStarted: number;
  topicsTotal: number;
  topics: TopicProgress[];
}

export interface TopicProgress {
  topicId: string;
  topicName: string;
  proficiencyBand: string;
  bandLabel: string;
  bandMessage: string;
  conceptsStarted: number;
  conceptsTotal: number;
  xpEarned: number;
  lastAttemptedAt: string | null;
}

export interface ProgressSummary {
  totalXp: number;
  sessionsCompleted: number;
  topicsStarted: number;
  topicsTotal: number;
  proficiencyBreakdown: Record<string, number>;
}
