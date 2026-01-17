/**
 * Query Keys
 *
 * Centralized query key factory for React Query.
 * Using a factory pattern for type-safe and consistent keys.
 */

export const queryKeys = {
  // Progress
  progress: {
    all: ['progress'] as const,
    detail: (board: string, classLevel: number, subject: string) =>
      ['progress', board, classLevel, subject] as const,
    summary: () => ['progress', 'summary'] as const,
    topic: (topicId: string) => ['progress', 'topic', topicId] as const,
  },

  // Sessions
  sessions: {
    all: ['sessions'] as const,
    list: (board: string, classLevel: number, subject: string) =>
      ['sessions', board, classLevel, subject] as const,
    detail: (sessionId: string) => ['sessions', sessionId] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
  },

  // Parent
  parent: {
    all: ['parent'] as const,
    children: () => ['parent', 'children'] as const,
    child: (childId: string) => ['parent', 'child', childId] as const,
    childProgress: (childId: string) => ['parent', 'child', childId, 'progress'] as const,
    childSessions: (childId: string) => ['parent', 'child', childId, 'sessions'] as const,
    activity: (childId?: string) => ['parent', 'activity', childId] as const,
  },

  // CAM / Curriculum
  cam: {
    all: ['cam'] as const,
    detail: (board: string, classLevel: number, subject: string) =>
      ['cam', board, classLevel, subject] as const,
    themes: () => ['cam', 'themes'] as const,
    topic: (topicId: string) => ['cam', 'topic', topicId] as const,
  },
} as const;

// Type helpers
export type QueryKeys = typeof queryKeys;
