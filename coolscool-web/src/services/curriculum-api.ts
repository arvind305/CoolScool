/**
 * Curriculum API Service
 * Fetches curricula, themes, topics, and questions from the backend API.
 *
 * Supports two modes:
 * 1. Curriculum-based (recommended): Uses curriculumId to fetch content
 * 2. Legacy board/class/subject: For backward compatibility
 */

import type { CAM, CAMTheme, CAMTopic, QuestionBank } from '@/lib/quiz-engine/types';
import type { Curriculum, CurriculumWithCounts } from '@/lib/api/types';
import { ENDPOINTS } from '@/lib/api/endpoints';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coolscool.onrender.com';

// ============================================
// Curriculum API Functions
// ============================================

/**
 * Fetch all active curricula
 */
export async function fetchCurricula(): Promise<Curriculum[]> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.CURRICULA}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch curricula: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.curricula || [];
  } catch (error) {
    console.error('Error fetching curricula:', error);
    return [];
  }
}

/**
 * Fetch all curricula with content counts
 */
export async function fetchCurriculaOverview(): Promise<CurriculumWithCounts[]> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.CURRICULA_OVERVIEW}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch curricula overview: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.curricula || [];
  } catch (error) {
    console.error('Error fetching curricula overview:', error);
    return [];
  }
}

/**
 * Fetch single curriculum by ID
 */
export async function fetchCurriculumById(curriculumId: string): Promise<Curriculum | null> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.CURRICULUM(curriculumId)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch curriculum: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.curriculum || null;
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    return null;
  }
}

/**
 * Find curriculum by board/class/subject
 */
export async function findCurriculumByBoardClassSubject(
  board: string,
  classLevel: number,
  subject: string
): Promise<Curriculum | null> {
  const curricula = await fetchCurricula();
  return curricula.find(
    c =>
      c.board.toLowerCase() === board.toLowerCase() &&
      c.classLevel === classLevel &&
      c.subject.toLowerCase() === subject.toLowerCase()
  ) || null;
}

// ============================================
// Curriculum-Scoped CAM Functions
// ============================================

/**
 * Fetch full CAM structure for a curriculum
 */
export async function fetchCAMByCurriculumId(curriculumId: string): Promise<CAM | null> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.CURRICULUM_CAM(curriculumId)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch CAM: ${response.status}`);
    }
    const data = await response.json();

    if (!data.success || !data.data) {
      return null;
    }

    // Transform API response to CAM type
    // API wraps in data.data.cam with camelCase keys
    const cam = data.data.cam || data.data;
    return {
      cam_version: cam.cam_version || cam.camVersion || cam.version || '1.0',
      board: cam.board,
      class_level: cam.class_level ?? cam.classLevel,
      subject: cam.subject,
      themes: (cam.themes || []).map((theme: Record<string, unknown>) => ({
        theme_id: theme.theme_id || theme.themeId,
        theme_name: theme.theme_name || theme.themeName,
        theme_order: theme.theme_order ?? theme.order,
        topics: ((theme.topics as Record<string, unknown>[]) || []).map((topic: Record<string, unknown>) => ({
          topic_id: topic.topic_id || topic.topicId,
          topic_name: topic.topic_name || topic.topicName,
          topic_order: topic.topic_order ?? topic.order,
          concepts: ((topic.concepts as Record<string, unknown>[]) || []).map((concept: Record<string, unknown>) => ({
            concept_id: concept.concept_id || concept.conceptId,
            concept_name: concept.concept_name || concept.conceptName,
            difficulty_levels: concept.difficulty_levels || concept.difficultyLevels || [],
          })),
        })),
      })),
    };
  } catch (error) {
    console.error('Error fetching CAM:', error);
    return null;
  }
}

/**
 * Fetch themes for a curriculum
 */
export async function fetchThemesByCurriculumId(curriculumId: string): Promise<CAMTheme[]> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.CURRICULUM_THEMES(curriculumId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch themes: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.themes || [];
  } catch (error) {
    console.error('Error fetching themes:', error);
    return [];
  }
}

/**
 * Fetch single theme with topics
 */
export async function fetchThemeByCurriculumId(
  curriculumId: string,
  themeId: string
): Promise<CAMTheme | null> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.CURRICULUM_THEME(curriculumId, themeId)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch theme: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.theme || null;
  } catch (error) {
    console.error('Error fetching theme:', error);
    return null;
  }
}

/**
 * Fetch single topic with concepts
 */
export async function fetchTopicByCurriculumId(
  curriculumId: string,
  topicId: string
): Promise<CAMTopic | null> {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.CURRICULUM_TOPIC(curriculumId, topicId)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch topic: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.topic || null;
  } catch (error) {
    console.error('Error fetching topic:', error);
    return null;
  }
}

// ============================================
// Curriculum-Scoped Question Bank Functions
// ============================================

/**
 * Fetch question bank for a topic from the backend API
 */
export async function fetchQuestionBankByCurriculumId(
  curriculumId: string,
  topicId: string
): Promise<QuestionBank | null> {
  try {
    const response = await fetch(
      `${API_URL}${ENDPOINTS.CURRICULUM_TOPIC_QUESTIONS(curriculumId, topicId)}`
    );
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch question bank: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success || !data.data) return null;

    return {
      topic_id: data.data.topic_id,
      questions: data.data.questions.map((q: Record<string, unknown>) => ({
        question_id: q.question_id,
        concept_id: q.concept_id,
        difficulty: q.difficulty,
        type: q.type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        ordering_items: q.ordering_items,
        explanation_correct: q.explanation_correct,
        explanation_incorrect: q.explanation_incorrect,
        image_url: q.image_url || undefined,
        option_images: q.option_images || undefined,
      })),
      canonical_explanation: data.data.canonical_explanation?.text,
    };
  } catch (error) {
    console.error(`Error fetching question bank for ${topicId}:`, error);
    return null;
  }
}

/**
 * Fetch CAM (Curriculum Aligned Map) for a given board/class/subject
 */
export async function fetchCAM(
  board: string,
  classLevel: number,
  subject: string
): Promise<CAM | null> {
  const curriculum = await findCurriculumByBoardClassSubject(board, classLevel, subject);
  if (curriculum) {
    const cam = await fetchCAMByCurriculumId(curriculum.id);
    if (cam) return cam;
  }

  console.warn(`No CAM data available for ${board} Class ${classLevel} ${subject}`);
  return null;
}

/**
 * Check if content is available for a board/class/subject combination
 * Now uses the API to check for available curricula
 */
export async function hasContentForAsync(
  board: string,
  classLevel: number,
  subject: string
): Promise<boolean> {
  const curriculum = await findCurriculumByBoardClassSubject(board, classLevel, subject);
  return curriculum !== null;
}

/**
 * Synchronous check - checks against cached curricula list
 * Falls back to async check if no cache available
 */
let _curriculaCache: Curriculum[] | null = null;

export function hasContentFor(board: string, classLevel: number, subject: string): boolean {
  if (_curriculaCache) {
    return _curriculaCache.some(
      c =>
        c.board.toLowerCase() === board.toLowerCase() &&
        c.classLevel === classLevel &&
        c.subject.toLowerCase() === subject.toLowerCase()
    );
  }
  // Before cache is populated, allow all ICSE Mathematics classes
  return board.toLowerCase() === 'icse' && subject.toLowerCase() === 'mathematics';
}

/**
 * Initialize the curricula cache for synchronous hasContentFor checks
 */
export async function initCurriculaCache(): Promise<void> {
  _curriculaCache = await fetchCurricula();
}

/**
 * Set the curricula cache directly (avoids duplicate API call when data is already available)
 */
export function setCurriculaCache(curricula: Curriculum[]): void {
  _curriculaCache = curricula;
}

/**
 * Get themes from the API
 * @deprecated Use fetchThemesByCurriculumId instead
 */
export async function fetchThemesFromAPI(
  board: string,
  classLevel: number,
  subject: string,
  accessToken?: string
): Promise<CAMTheme[]> {
  // Find curriculum first
  const curriculum = await findCurriculumByBoardClassSubject(board, classLevel, subject);
  if (curriculum) {
    return fetchThemesByCurriculumId(curriculum.id);
  }

  // Fallback to static data
  const cam = await fetchCAM(board, classLevel, subject);
  return cam?.themes || [];
}
