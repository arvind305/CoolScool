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
    const cam = data.data;
    return {
      cam_version: cam.cam_version || cam.camVersion || '1.0',
      board: cam.board,
      class_level: cam.class_level || cam.classLevel,
      subject: cam.subject,
      themes: cam.themes || [],
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
        match_pairs: q.match_pairs,
        ordering_items: q.ordering_items,
      })),
      canonical_explanation: data.data.canonical_explanation?.text,
    };
  } catch (error) {
    console.error(`Error fetching question bank for ${topicId}:`, error);
    return null;
  }
}

// ============================================
// Legacy Functions (Backward Compatibility)
// ============================================

// Map of known topic IDs to their file names (for static data loading fallback)
const QUESTION_BANK_FILES: Record<string, string> = {
  'T01.01': 'T01.01-place-value-number-sense.json',
  'T01.02': 'T01.02-natural-whole-numbers.json',
  'T01.03': 'T01.03-roman-numerals.json',
  'T02.01': 'T02.01-addition-subtraction.json',
  'T02.02': 'T02.02-multiplication.json',
  'T02.03': 'T02.03-division.json',
  'T02.04': 'T02.04-order-of-operations.json',
  'T03.01': 'T03.01-fractions.json',
  'T03.02': 'T03.02-decimals.json',
  'T04.01': 'T04.01-factors-multiples.json',
  'T04.02': 'T04.02-divisibility.json',
  'T04.03': 'T04.03-hcf-lcm.json',
  'T05.01': 'T05.01-negative-numbers.json',
  'T06.01': 'T06.01-basic-geometrical-ideas.json',
  'T06.02': 'T06.02-elementary-shapes.json',
  'T06.03': 'T06.03-polygons.json',
  'T06.04': 'T06.04-circles.json',
  'T06.05': 'T06.05-3d-shapes.json',
  'T07.01': 'T07.01-length-distance.json',
  'T07.02': 'T07.02-mass-weight.json',
  'T07.03': 'T07.03-capacity-volume.json',
  'T07.04': 'T07.04-time.json',
  'T07.05': 'T07.05-perimeter-area.json',
  'T07.06': 'T07.06-money.json',
  'T08.01': 'T08.01-percentage.json',
  'T09.01': 'T09.01-data-collection-organization.json',
  'T09.02': 'T09.02-data-representation.json',
  'T09.03': 'T09.03-data-interpretation.json',
  'T09.04': 'T09.04-basic-statistics.json',
  'T10.01': 'T10.01-number-patterns.json',
  'T10.02': 'T10.02-geometric-patterns.json',
  'T10.03': 'T10.03-patterns-real-life.json',
};

/**
 * Fetch CAM (Curriculum Aligned Map) for a given board/class/subject
 * First tries API, then falls back to static file for ICSE Class 5 Math
 */
export async function fetchCAM(
  board: string,
  classLevel: number,
  subject: string
): Promise<CAM | null> {
  // First try to find the curriculum and fetch via API
  const curriculum = await findCurriculumByBoardClassSubject(board, classLevel, subject);
  if (curriculum) {
    const cam = await fetchCAMByCurriculumId(curriculum.id);
    if (cam) return cam;
  }

  // Fallback to static file for ICSE Class 5 Mathematics
  if (board.toLowerCase() === 'icse' && classLevel === 5 && subject.toLowerCase() === 'mathematics') {
    try {
      const response = await fetch('/cam/data/icse-class5-mathematics-cam.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch CAM: ${response.status}`);
      }
      const data = await response.json();
      return {
        cam_version: data.version,
        board: data.board.toLowerCase(),
        class_level: data.class,
        subject: data.subject.toLowerCase(),
        themes: data.themes.map((theme: CAMTheme) => ({
          theme_id: theme.theme_id,
          theme_name: theme.theme_name,
          theme_order: theme.theme_order,
          topics: theme.topics,
        })),
      };
    } catch (error) {
      console.error('Error fetching CAM from static file:', error);
      return null;
    }
  }

  console.warn(`No CAM data available for ${board} Class ${classLevel} ${subject}`);
  return null;
}

/**
 * Fetch question bank for a specific topic (still uses static files)
 */
export async function fetchQuestionBank(topicId: string): Promise<QuestionBank | null> {
  const fileName = QUESTION_BANK_FILES[topicId];
  if (!fileName) {
    console.warn(`No question bank file mapping for topic: ${topicId}`);
    return null;
  }

  try {
    const response = await fetch(`/questions/data/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch question bank: ${response.status}`);
    }
    const data = await response.json();
    return {
      topic_id: data.topic_id,
      questions: data.questions,
      canonical_explanation: data.canonical_explanation?.text,
    };
  } catch (error) {
    console.error(`Error fetching question bank for ${topicId}:`, error);
    return null;
  }
}

/**
 * Get question count for a topic (without loading full bank)
 */
export async function fetchQuestionCount(topicId: string): Promise<number> {
  const questionBank = await fetchQuestionBank(topicId);
  return questionBank?.questions?.length || 0;
}

/**
 * Fetch question counts for all topics in parallel
 */
export async function fetchAllQuestionCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const promises = Object.keys(QUESTION_BANK_FILES).map(async (topicId) => {
    const count = await fetchQuestionCount(topicId);
    counts.set(topicId, count);
  });

  await Promise.all(promises);
  return counts;
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
