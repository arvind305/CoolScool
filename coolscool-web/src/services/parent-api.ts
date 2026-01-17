// Parent API service with mock data for Cool S-Cool
// This provides mock data until backend APIs are implemented

import type {
  LinkedChild,
  ChildProgressSummary,
  ActivityItem,
  SubjectProgress,
  TopicProgressDetail,
  ChildFullProgress,
  ChildCardData,
  ParentDashboardData,
} from '@/types/parent';
import type { SessionSummary, ProficiencyBand } from '@/lib/quiz-engine/types';

// Mock data for development
const MOCK_CHILDREN: LinkedChild[] = [
  {
    id: 'child-1',
    displayName: 'Aarav Kumar',
    avatarUrl: null,
    email: 'aarav@example.com',
    role: 'child',
    linkedAt: '2024-09-15T10:00:00Z',
    consentGiven: true,
  },
  {
    id: 'child-2',
    displayName: 'Priya Sharma',
    avatarUrl: null,
    email: 'priya@example.com',
    role: 'child',
    linkedAt: '2024-10-01T14:30:00Z',
    consentGiven: true,
  },
];

const MOCK_SUMMARIES: Record<string, ChildProgressSummary> = {
  'child-1': {
    childId: 'child-1',
    totalXP: 2450,
    sessionsCompleted: 28,
    topicsStarted: 12,
    topicsMastered: 4,
    averageAccuracy: 78,
    totalTimeSpentMs: 5400000, // 1.5 hours
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    currentStreak: 5,
    longestStreak: 12,
  },
  'child-2': {
    childId: 'child-2',
    totalXP: 1820,
    sessionsCompleted: 19,
    topicsStarted: 8,
    topicsMastered: 2,
    averageAccuracy: 85,
    totalTimeSpentMs: 3600000, // 1 hour
    lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    currentStreak: 3,
    longestStreak: 7,
  },
};

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'activity-1',
    childId: 'child-1',
    childName: 'Aarav',
    childAvatar: null,
    type: 'session_completed',
    title: 'Completed Practice Session',
    description: 'Addition: 2 Digits with Carryover',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      topicId: 'T01.01',
      topicName: 'Addition: 2 Digits with Carryover',
      themeName: 'Addition',
      xpEarned: 85,
      questionsCorrect: 8,
      questionsTotal: 10,
    },
  },
  {
    id: 'activity-2',
    childId: 'child-1',
    childName: 'Aarav',
    childAvatar: null,
    type: 'topic_mastered',
    title: 'Mastered Topic!',
    description: 'Simple Addition reached Exam Ready',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    metadata: {
      topicId: 'T01.00',
      topicName: 'Simple Addition',
      themeName: 'Addition',
      proficiencyBand: 'exam_ready' as ProficiencyBand,
    },
  },
  {
    id: 'activity-3',
    childId: 'child-2',
    childName: 'Priya',
    childAvatar: null,
    type: 'session_completed',
    title: 'Completed Practice Session',
    description: 'Multiplication Tables: 2 to 5',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      topicId: 'T03.01',
      topicName: 'Multiplication Tables: 2 to 5',
      themeName: 'Multiplication',
      xpEarned: 120,
      questionsCorrect: 12,
      questionsTotal: 12,
    },
  },
  {
    id: 'activity-4',
    childId: 'child-1',
    childName: 'Aarav',
    childAvatar: null,
    type: 'streak_milestone',
    title: '5-Day Streak!',
    description: 'Practiced for 5 days in a row',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    metadata: {
      streakDays: 5,
    },
  },
  {
    id: 'activity-5',
    childId: 'child-2',
    childName: 'Priya',
    childAvatar: null,
    type: 'achievement_earned',
    title: 'Achievement Unlocked',
    description: 'Perfect Score - Got 100% on a quiz!',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      achievementName: 'Perfect Score',
    },
  },
];

const MOCK_SUBJECT_PROGRESS: Record<string, SubjectProgress[]> = {
  'child-1': [
    {
      subject: 'mathematics',
      subjectName: 'Mathematics',
      topicsTotal: 33,
      topicsStarted: 12,
      topicsMastered: 4,
      averageAccuracy: 78,
      totalXP: 2450,
      totalTimeSpentMs: 5400000,
    },
  ],
  'child-2': [
    {
      subject: 'mathematics',
      subjectName: 'Mathematics',
      topicsTotal: 33,
      topicsStarted: 8,
      topicsMastered: 2,
      averageAccuracy: 85,
      totalXP: 1820,
      totalTimeSpentMs: 3600000,
    },
  ],
};

const MOCK_TOPIC_PROGRESS: Record<string, TopicProgressDetail[]> = {
  'child-1': [
    {
      topicId: 'T01.00',
      topicName: 'Simple Addition',
      themeName: 'Addition',
      proficiencyBand: 'exam_ready',
      proficiencyLabel: 'Exam Ready',
      conceptsStarted: 5,
      conceptsTotal: 5,
      xpEarned: 450,
      totalAttempts: 45,
      accuracy: 92,
      lastAttemptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      timeSpentMs: 900000,
    },
    {
      topicId: 'T01.01',
      topicName: 'Addition: 2 Digits with Carryover',
      themeName: 'Addition',
      proficiencyBand: 'consistent_understanding',
      proficiencyLabel: 'Consistent Understanding',
      conceptsStarted: 4,
      conceptsTotal: 5,
      xpEarned: 380,
      totalAttempts: 38,
      accuracy: 78,
      lastAttemptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      timeSpentMs: 720000,
    },
    {
      topicId: 'T02.00',
      topicName: 'Simple Subtraction',
      themeName: 'Subtraction',
      proficiencyBand: 'growing_confidence',
      proficiencyLabel: 'Growing Confidence',
      conceptsStarted: 3,
      conceptsTotal: 5,
      xpEarned: 220,
      totalAttempts: 22,
      accuracy: 72,
      lastAttemptedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      timeSpentMs: 480000,
    },
    {
      topicId: 'T03.01',
      topicName: 'Multiplication Tables: 2 to 5',
      themeName: 'Multiplication',
      proficiencyBand: 'building_familiarity',
      proficiencyLabel: 'Building Familiarity',
      conceptsStarted: 2,
      conceptsTotal: 4,
      xpEarned: 150,
      totalAttempts: 15,
      accuracy: 65,
      lastAttemptedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      timeSpentMs: 360000,
    },
  ],
  'child-2': [
    {
      topicId: 'T01.00',
      topicName: 'Simple Addition',
      themeName: 'Addition',
      proficiencyBand: 'consistent_understanding',
      proficiencyLabel: 'Consistent Understanding',
      conceptsStarted: 5,
      conceptsTotal: 5,
      xpEarned: 350,
      totalAttempts: 35,
      accuracy: 88,
      lastAttemptedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      timeSpentMs: 600000,
    },
    {
      topicId: 'T03.01',
      topicName: 'Multiplication Tables: 2 to 5',
      themeName: 'Multiplication',
      proficiencyBand: 'exam_ready',
      proficiencyLabel: 'Exam Ready',
      conceptsStarted: 4,
      conceptsTotal: 4,
      xpEarned: 520,
      totalAttempts: 52,
      accuracy: 95,
      lastAttemptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      timeSpentMs: 840000,
    },
  ],
};

const MOCK_SESSIONS: Record<string, SessionSummary[]> = {
  'child-1': [
    {
      session_id: 'sess-1',
      topic_id: 'T01.01',
      topic_name: 'Addition: 2 Digits with Carryover',
      time_mode: 'unlimited',
      status: 'completed',
      total_questions: 10,
      questions_answered: 10,
      questions_correct: 8,
      questions_skipped: 0,
      xp_earned: 85,
      time_elapsed_ms: 480000,
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      session_id: 'sess-2',
      topic_id: 'T01.00',
      topic_name: 'Simple Addition',
      time_mode: 'unlimited',
      status: 'completed',
      total_questions: 15,
      questions_answered: 15,
      questions_correct: 14,
      questions_skipped: 0,
      xp_earned: 140,
      time_elapsed_ms: 600000,
      started_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'child-2': [
    {
      session_id: 'sess-3',
      topic_id: 'T03.01',
      topic_name: 'Multiplication Tables: 2 to 5',
      time_mode: 'unlimited',
      status: 'completed',
      total_questions: 12,
      questions_answered: 12,
      questions_correct: 12,
      questions_skipped: 0,
      xp_earned: 120,
      time_elapsed_ms: 540000,
      started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// Simulated network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get list of linked children for the current parent
 */
export async function getLinkedChildren(): Promise<LinkedChild[]> {
  await delay(300);
  return MOCK_CHILDREN;
}

/**
 * Get progress summary for a specific child
 */
export async function getChildProgressSummary(
  childId: string
): Promise<ChildProgressSummary | null> {
  await delay(200);
  return MOCK_SUMMARIES[childId] || null;
}

/**
 * Get recent activity for all children or a specific child
 */
export async function getActivityFeed(
  childId?: string,
  limit = 10
): Promise<ActivityItem[]> {
  await delay(250);
  let activities = MOCK_ACTIVITIES;
  if (childId) {
    activities = activities.filter((a) => a.childId === childId);
  }
  return activities.slice(0, limit);
}

/**
 * Get full parent dashboard data (children + activity feed)
 */
export async function getParentDashboardData(): Promise<ParentDashboardData> {
  await delay(400);

  const childrenData: ChildCardData[] = MOCK_CHILDREN.map((child) => ({
    child,
    summary: MOCK_SUMMARIES[child.id],
    recentActivity: MOCK_ACTIVITIES.filter((a) => a.childId === child.id).slice(
      0,
      3
    ),
  }));

  return {
    children: childrenData,
    activityFeed: MOCK_ACTIVITIES.slice(0, 10),
  };
}

/**
 * Get full progress data for a specific child
 */
export async function getChildFullProgress(
  childId: string
): Promise<ChildFullProgress | null> {
  await delay(400);

  const child = MOCK_CHILDREN.find((c) => c.id === childId);
  if (!child) return null;

  const summary = MOCK_SUMMARIES[childId];
  if (!summary) return null;

  const topicProgress = MOCK_TOPIC_PROGRESS[childId] || [];

  // Determine strengths (high accuracy topics)
  const strengths = topicProgress
    .filter((t) => t.accuracy >= 80)
    .map((t) => t.topicName)
    .slice(0, 3);

  // Determine areas to improve (low accuracy or not started much)
  const areasToImprove = topicProgress
    .filter((t) => t.accuracy < 70 || t.proficiencyBand === 'building_familiarity')
    .map((t) => t.topicName)
    .slice(0, 3);

  return {
    child,
    summary,
    subjectProgress: MOCK_SUBJECT_PROGRESS[childId] || [],
    topicProgress,
    recentSessions: MOCK_SESSIONS[childId] || [],
    strengths: strengths.length > 0 ? strengths : ['Keep practicing!'],
    areasToImprove:
      areasToImprove.length > 0 ? areasToImprove : ['Great progress so far!'],
  };
}

/**
 * Link a new child to the parent account
 * (Mock implementation - would call backend API)
 */
export async function linkChild(childEmail: string): Promise<{
  success: boolean;
  message: string;
  child?: LinkedChild;
}> {
  await delay(500);

  // Mock validation
  if (!childEmail || !childEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  // Mock checking if already linked
  const existing = MOCK_CHILDREN.find((c) => c.email === childEmail);
  if (existing) {
    return { success: false, message: 'This child is already linked to your account.' };
  }

  // Mock success (in reality, this would send an invitation)
  return {
    success: true,
    message: 'Invitation sent! The child will appear once they accept.',
  };
}

/**
 * Unlink a child from the parent account
 * (Mock implementation - would call backend API)
 */
export async function unlinkChild(childId: string): Promise<{
  success: boolean;
  message: string;
}> {
  await delay(300);

  const child = MOCK_CHILDREN.find((c) => c.id === childId);
  if (!child) {
    return { success: false, message: 'Child not found.' };
  }

  // Mock success
  return {
    success: true,
    message: `${child.displayName} has been unlinked from your account.`,
  };
}
