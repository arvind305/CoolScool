// Parent Dashboard type definitions for Cool S-Cool

import type { UserRole } from './auth';
import type { ProficiencyBand, SessionSummary } from '@/lib/quiz-engine/types';

/**
 * Linked child account information
 */
export interface LinkedChild {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  role: UserRole;
  linkedAt: string;
  consentGiven: boolean;
}

/**
 * Summary stats for a child's progress
 */
export interface ChildProgressSummary {
  childId: string;
  totalXP: number;
  sessionsCompleted: number;
  topicsStarted: number;
  topicsMastered: number;
  averageAccuracy: number;
  totalTimeSpentMs: number;
  lastActiveAt: string | null;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Activity item for the activity feed
 */
export interface ActivityItem {
  id: string;
  childId: string;
  childName: string;
  childAvatar: string | null;
  type: 'session_completed' | 'topic_mastered' | 'achievement_earned' | 'streak_milestone';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    topicId?: string;
    topicName?: string;
    themeName?: string;
    xpEarned?: number;
    questionsCorrect?: number;
    questionsTotal?: number;
    proficiencyBand?: ProficiencyBand;
    achievementName?: string;
    streakDays?: number;
  };
}

/**
 * Subject-level progress for charts
 */
export interface SubjectProgress {
  subject: string;
  subjectName: string;
  topicsTotal: number;
  topicsStarted: number;
  topicsMastered: number;
  averageAccuracy: number;
  totalXP: number;
  totalTimeSpentMs: number;
}

/**
 * Topic-level progress detail
 */
export interface TopicProgressDetail {
  topicId: string;
  topicName: string;
  themeName: string;
  proficiencyBand: ProficiencyBand;
  proficiencyLabel: string;
  conceptsStarted: number;
  conceptsTotal: number;
  xpEarned: number;
  totalAttempts: number;
  accuracy: number;
  lastAttemptedAt: string | null;
  timeSpentMs: number;
}

/**
 * Full child progress data for the detailed view
 */
export interface ChildFullProgress {
  child: LinkedChild;
  summary: ChildProgressSummary;
  subjectProgress: SubjectProgress[];
  topicProgress: TopicProgressDetail[];
  recentSessions: SessionSummary[];
  strengths: string[];
  areasToImprove: string[];
}

/**
 * Combined data for a child card display
 */
export interface ChildCardData {
  child: LinkedChild;
  summary: ChildProgressSummary;
  recentActivity: ActivityItem[];
}

/**
 * Parent dashboard overview data
 */
export interface ParentDashboardData {
  children: ChildCardData[];
  activityFeed: ActivityItem[];
}
