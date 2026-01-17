/**
 * Curriculum API Service
 * Fetches themes, topics, and question banks from the backend or static files
 */

import type { CAM, CAMTheme, QuestionBank } from '@/lib/quiz-engine/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coolscool.onrender.com';

// Map of known topic IDs to their file names (for static data loading)
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
 * Currently loads from static file, will switch to API later
 */
export async function fetchCAM(
  board: string,
  classLevel: number,
  subject: string
): Promise<CAM | null> {
  // For now, only support ICSE Class 5 Mathematics
  if (board.toLowerCase() === 'icse' && classLevel === 5 && subject.toLowerCase() === 'mathematics') {
    try {
      const response = await fetch('/cam/data/icse-class5-mathematics-cam.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch CAM: ${response.status}`);
      }
      const data = await response.json();
      // Transform to CAM type
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
      console.error('Error fetching CAM:', error);
      return null;
    }
  }

  // For other boards/classes, return null (no data available yet)
  console.warn(`No CAM data available for ${board} Class ${classLevel} ${subject}`);
  return null;
}

/**
 * Fetch question bank for a specific topic
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
 */
export function hasContentFor(board: string, classLevel: number, subject: string): boolean {
  // Currently only ICSE Class 5 Mathematics has content
  return (
    board.toLowerCase() === 'icse' &&
    classLevel === 5 &&
    subject.toLowerCase() === 'mathematics'
  );
}

/**
 * Get themes from the API (future implementation)
 */
export async function fetchThemesFromAPI(
  board: string,
  classLevel: number,
  subject: string,
  accessToken?: string
): Promise<CAMTheme[]> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(
      `${API_URL}/api/v1/curriculum/${board}/${classLevel}/${subject}/themes`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch themes: ${response.status}`);
    }

    const data = await response.json();
    return data.themes || [];
  } catch (error) {
    console.error('Error fetching themes from API:', error);
    // Fallback to static data
    const cam = await fetchCAM(board, classLevel, subject);
    return cam?.themes || [];
  }
}
