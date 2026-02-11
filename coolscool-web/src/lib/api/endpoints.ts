/**
 * API Endpoints
 *
 * Centralized endpoint constants for all API calls.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coolscool.onrender.com';

export const ENDPOINTS = {
  // Auth
  AUTH_GOOGLE: '/api/v1/auth/google',
  AUTH_REFRESH: '/api/v1/auth/refresh',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_ME: '/api/v1/auth/me',

  // Progress
  PROGRESS: '/api/v1/progress',
  PROGRESS_SUMMARY: '/api/v1/progress/summary',
  PROGRESS_TOPIC: (topicId: string) => `/api/v1/progress/topics/${topicId}`,
  PROGRESS_EXPORT: '/api/v1/progress/export',
  PROGRESS_IMPORT: '/api/v1/progress/import',

  // Analytics
  PROGRESS_TRENDS: '/api/v1/progress/trends',
  PROGRESS_SUBJECTS: '/api/v1/progress/subjects',
  PROGRESS_STREAK: '/api/v1/progress/streak',
  PROGRESS_WEAK_AREAS: '/api/v1/progress/weak-areas',

  // Flags
  FLAGS: '/api/v1/flags',
  FLAGS_STATS: '/api/v1/flags/stats',
  FLAG: (flagId: string) => `/api/v1/flags/${flagId}`,

  // Sessions
  SESSIONS: '/api/v1/sessions',
  SESSION: (sessionId: string) => `/api/v1/sessions/${sessionId}`,
  SESSION_START: (sessionId: string) => `/api/v1/sessions/${sessionId}/start`,
  SESSION_QUESTION: (sessionId: string) => `/api/v1/sessions/${sessionId}/question`,
  SESSION_ANSWER: (sessionId: string) => `/api/v1/sessions/${sessionId}/answer`,
  SESSION_SKIP: (sessionId: string) => `/api/v1/sessions/${sessionId}/skip`,
  SESSION_PAUSE: (sessionId: string) => `/api/v1/sessions/${sessionId}/pause`,
  SESSION_RESUME: (sessionId: string) => `/api/v1/sessions/${sessionId}/resume`,
  SESSION_END: (sessionId: string) => `/api/v1/sessions/${sessionId}/end`,
  SESSION_SUMMARY: (sessionId: string) => `/api/v1/sessions/${sessionId}/summary`,

  // Settings
  SETTINGS: '/api/v1/settings',

  // Parent
  PARENT_CHILDREN: '/api/v1/parent/children',
  PARENT_CHILD: (childId: string) => `/api/v1/parent/children/${childId}`,
  PARENT_CHILD_PROGRESS: (childId: string) => `/api/v1/parent/children/${childId}/progress`,
  PARENT_CHILD_SESSIONS: (childId: string) => `/api/v1/parent/children/${childId}/sessions`,
  PARENT_CHILD_CONSENT: (childId: string) => `/api/v1/parent/children/${childId}/consent`,
  PARENT_ACTIVITY: '/api/v1/parent/activity',

  // CAM / Curriculum (legacy - uses default curriculum)
  CAM: '/api/v1/cam',
  CAM_THEMES: '/api/v1/cam/themes',
  CAM_THEME: (themeId: string) => `/api/v1/cam/themes/${themeId}`,
  CAM_TOPIC: (topicId: string) => `/api/v1/cam/topics/${topicId}`,

  // Curricula
  CURRICULA: '/api/v1/curricula',
  CURRICULA_OVERVIEW: '/api/v1/curricula/overview',
  CURRICULUM: (curriculumId: string) => `/api/v1/curricula/${curriculumId}`,
  CURRICULUM_OVERVIEW: (curriculumId: string) => `/api/v1/curricula/${curriculumId}/overview`,

  // Curriculum-scoped CAM (recommended)
  CURRICULUM_CAM: (curriculumId: string) => `/api/v1/curricula/${curriculumId}/cam`,
  CURRICULUM_THEMES: (curriculumId: string) => `/api/v1/curricula/${curriculumId}/themes`,
  CURRICULUM_THEME: (curriculumId: string, themeId: string) => `/api/v1/curricula/${curriculumId}/themes/${themeId}`,
  CURRICULUM_TOPICS: (curriculumId: string) => `/api/v1/curricula/${curriculumId}/topics`,
  CURRICULUM_TOPIC: (curriculumId: string, topicId: string) => `/api/v1/curricula/${curriculumId}/topics/${topicId}`,
  CURRICULUM_TOPIC_QUESTIONS: (curriculumId: string, topicId: string) => `/api/v1/curricula/${curriculumId}/topics/${topicId}/questions`,
} as const;
