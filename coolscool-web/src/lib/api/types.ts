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
