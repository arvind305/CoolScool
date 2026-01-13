/**
 * CAM Controller
 *
 * Handles Curriculum Authority Model (CAM) read-only endpoints.
 * Authentication is optional for CAM endpoints to allow browsing.
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';

// Interface definitions
interface Theme {
  id: string;
  theme_id: string;
  theme_name: string;
  theme_order: number;
  cam_version: string;
  board: string;
  class_level: number;
  subject: string;
}

interface Topic {
  id: string;
  theme_id: string;
  topic_id: string;
  topic_name: string;
  topic_order: number;
  boundaries_in_scope: string[];
  boundaries_out_of_scope: string[];
  numeric_limits: Record<string, unknown>;
}

interface Concept {
  id: string;
  topic_id: string;
  concept_id: string;
  concept_name: string;
  difficulty_levels: string[];
}

interface CanonicalExplanation {
  explanation_text: string;
  rules: string[];
}

// GET /cam - Get full curriculum structure
export async function getFullCurriculum(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get all themes
    const themesResult = await query<Theme>(
      'SELECT * FROM themes ORDER BY theme_order'
    );

    // Get all topics
    const topicsResult = await query<Topic & { theme_id_str: string }>(
      `SELECT t.*, th.theme_id as theme_id_str
       FROM topics t
       JOIN themes th ON t.theme_id = th.id
       ORDER BY th.theme_order, t.topic_order`
    );

    // Get all concepts
    const conceptsResult = await query<Concept & { topic_id_str: string }>(
      `SELECT c.*, t.topic_id as topic_id_str
       FROM concepts c
       JOIN topics t ON c.topic_id = t.id
       ORDER BY t.topic_order, c.concept_id`
    );

    // Build hierarchical structure
    const topicsMap = new Map<string, (Topic & { concepts: Concept[] })[]>();
    const conceptsMap = new Map<string, Concept[]>();

    // Group concepts by topic
    for (const concept of conceptsResult.rows) {
      if (!conceptsMap.has(concept.topic_id_str)) {
        conceptsMap.set(concept.topic_id_str, []);
      }
      conceptsMap.get(concept.topic_id_str)!.push({
        id: concept.id,
        topic_id: concept.topic_id,
        concept_id: concept.concept_id,
        concept_name: concept.concept_name,
        difficulty_levels: concept.difficulty_levels,
      });
    }

    // Group topics by theme
    for (const topic of topicsResult.rows) {
      if (!topicsMap.has(topic.theme_id_str)) {
        topicsMap.set(topic.theme_id_str, []);
      }
      topicsMap.get(topic.theme_id_str)!.push({
        id: topic.id,
        theme_id: topic.theme_id,
        topic_id: topic.topic_id,
        topic_name: topic.topic_name,
        topic_order: topic.topic_order,
        boundaries_in_scope: topic.boundaries_in_scope || [],
        boundaries_out_of_scope: topic.boundaries_out_of_scope || [],
        numeric_limits: topic.numeric_limits || {},
        concepts: conceptsMap.get(topic.topic_id) || [],
      });
    }

    // Build final structure
    const curriculum = themesResult.rows.map(theme => ({
      themeId: theme.theme_id,
      themeName: theme.theme_name,
      order: theme.theme_order,
      topics: (topicsMap.get(theme.theme_id) || []).map(topic => ({
        topicId: topic.topic_id,
        topicName: topic.topic_name,
        order: topic.topic_order,
        boundaries: {
          inScope: topic.boundaries_in_scope,
          outOfScope: topic.boundaries_out_of_scope,
        },
        numericLimits: topic.numeric_limits,
        concepts: topic.concepts.map(concept => ({
          conceptId: concept.concept_id,
          conceptName: concept.concept_name,
          difficultyLevels: concept.difficulty_levels,
        })),
      })),
    }));

    const theme0 = themesResult.rows[0];
    res.status(200).json({
      success: true,
      data: {
        cam: {
          version: theme0?.cam_version || '1.0.0',
          board: theme0?.board || 'ICSE',
          classLevel: theme0?.class_level || 5,
          subject: theme0?.subject || 'Mathematics',
          themes: curriculum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /cam/themes - List all themes
export async function getThemes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await query<Theme>(
      'SELECT * FROM themes ORDER BY theme_order'
    );

    res.status(200).json({
      success: true,
      data: {
        themes: result.rows.map(theme => ({
          themeId: theme.theme_id,
          themeName: theme.theme_name,
          order: theme.theme_order,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /cam/themes/:themeId - Get single theme with topics
export async function getTheme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { themeId } = req.params;

    const themeResult = await query<Theme>(
      'SELECT * FROM themes WHERE theme_id = $1',
      [themeId]
    );

    if (!themeResult.rows[0]) {
      res.status(404).json({
        success: false,
        error: {
          code: 'THEME_NOT_FOUND',
          message: 'Theme not found',
        },
      });
      return;
    }

    const theme = themeResult.rows[0];

    // Get topics for this theme
    const topicsResult = await query<Topic>(
      `SELECT t.*
       FROM topics t
       JOIN themes th ON t.theme_id = th.id
       WHERE th.theme_id = $1
       ORDER BY t.topic_order`,
      [themeId]
    );

    res.status(200).json({
      success: true,
      data: {
        theme: {
          themeId: theme.theme_id,
          themeName: theme.theme_name,
          order: theme.theme_order,
          topics: topicsResult.rows.map(topic => ({
            topicId: topic.topic_id,
            topicName: topic.topic_name,
            order: topic.topic_order,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /cam/topics/:topicId - Get single topic with concepts
export async function getTopic(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { topicId } = req.params;

    const topicResult = await query<Topic & { theme_id_str: string; theme_name: string }>(
      `SELECT t.*, th.theme_id as theme_id_str, th.theme_name
       FROM topics t
       JOIN themes th ON t.theme_id = th.id
       WHERE t.topic_id = $1`,
      [topicId]
    );

    if (!topicResult.rows[0]) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
      return;
    }

    const topic = topicResult.rows[0];

    // Get concepts for this topic
    const conceptsResult = await query<Concept>(
      `SELECT c.*
       FROM concepts c
       JOIN topics t ON c.topic_id = t.id
       WHERE t.topic_id = $1
       ORDER BY c.concept_id`,
      [topicId]
    );

    // Get canonical explanation if exists
    const explanationResult = await query<CanonicalExplanation>(
      `SELECT ce.explanation_text, ce.rules
       FROM canonical_explanations ce
       JOIN topics t ON ce.topic_id = t.id
       WHERE t.topic_id = $1`,
      [topicId]
    );

    const explanation = explanationResult.rows[0] || null;

    // Get question counts per difficulty
    const questionCountResult = await query<{ difficulty: string; count: string }>(
      `SELECT difficulty, COUNT(*) as count
       FROM questions
       WHERE topic_id_str = $1
       GROUP BY difficulty`,
      [topicId]
    );

    const questionCounts: Record<string, number> = {};
    for (const row of questionCountResult.rows) {
      questionCounts[row.difficulty] = parseInt(row.count, 10);
    }

    res.status(200).json({
      success: true,
      data: {
        topic: {
          topicId: topic.topic_id,
          topicName: topic.topic_name,
          order: topic.topic_order,
          theme: {
            themeId: topic.theme_id_str,
            themeName: topic.theme_name,
          },
          boundaries: {
            inScope: topic.boundaries_in_scope || [],
            outOfScope: topic.boundaries_out_of_scope || [],
          },
          numericLimits: topic.numeric_limits || {},
          concepts: conceptsResult.rows.map(concept => ({
            conceptId: concept.concept_id,
            conceptName: concept.concept_name,
            difficultyLevels: concept.difficulty_levels,
          })),
          explanation: explanation
            ? {
                text: explanation.explanation_text,
                rules: explanation.rules,
              }
            : null,
          questionCounts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
