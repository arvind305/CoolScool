/**
 * CAM Controller
 *
 * Handles Curriculum Authority Model (CAM) read-only endpoints.
 * Authentication is optional for CAM endpoints to allow browsing.
 *
 * Per North Star §5: All content is derived from a curriculum-specific CAM
 * Per North Star §15: Content from different curricula must never mix
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import * as CurriculumModel from '../models/curriculum.model.js';
import * as QuestionModel from '../models/question.model.js';

// Interface definitions
interface Theme {
  id: string;
  theme_id: string;
  theme_name: string;
  theme_order: number;
  cam_version: string;
  curriculum_id: string;
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
  curriculum_id: string;
}

interface Concept {
  id: string;
  topic_id: string;
  concept_id: string;
  concept_name: string;
  difficulty_levels: string[];
  curriculum_id: string;
}

interface CanonicalExplanation {
  explanation_text: string;
  rules: string[];
}

/**
 * Helper to get curriculum_id from request
 * Returns the curriculumId param or falls back to default curriculum
 */
async function getCurriculumId(req: Request): Promise<string | null> {
  // Check URL params first
  if (req.params.curriculumId) {
    return req.params.curriculumId;
  }

  // Fall back to default curriculum for backwards compatibility
  const defaultCurriculum = await CurriculumModel.getDefault();
  return defaultCurriculum?.id || null;
}

// GET /curricula/:curriculumId/cam - Get full curriculum structure
export async function getFullCurriculum(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const curriculumId = await getCurriculumId(req);

    if (!curriculumId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NO_CURRICULUM',
          message: 'No curriculum found',
        },
      });
      return;
    }

    // Get curriculum info
    const curriculum = await CurriculumModel.findById(curriculumId);
    if (!curriculum) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CURRICULUM_NOT_FOUND',
          message: 'Curriculum not found',
        },
      });
      return;
    }

    // Get all themes for this curriculum
    const themesResult = await query<Theme>(
      'SELECT * FROM themes WHERE curriculum_id = $1 ORDER BY theme_order',
      [curriculumId]
    );

    // Get all topics for this curriculum
    const topicsResult = await query<Topic & { theme_id_str: string }>(
      `SELECT t.*, th.theme_id as theme_id_str
       FROM topics t
       JOIN themes th ON t.theme_id = th.id
       WHERE t.curriculum_id = $1
       ORDER BY th.theme_order, t.topic_order`,
      [curriculumId]
    );

    // Get all concepts for this curriculum
    const conceptsResult = await query<Concept & { topic_id_str: string }>(
      `SELECT c.*, t.topic_id as topic_id_str
       FROM concepts c
       JOIN topics t ON c.topic_id = t.id
       WHERE c.curriculum_id = $1
       ORDER BY t.topic_order, c.concept_id`,
      [curriculumId]
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
        curriculum_id: concept.curriculum_id,
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
        curriculum_id: topic.curriculum_id,
        concepts: conceptsMap.get(topic.topic_id) || [],
      });
    }

    // Build final structure
    const themes = themesResult.rows.map(theme => ({
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

    res.status(200).json({
      success: true,
      data: {
        cam: {
          curriculumId: curriculum.id,
          version: curriculum.cam_version,
          board: curriculum.board,
          classLevel: curriculum.class_level,
          subject: curriculum.subject,
          displayName: curriculum.display_name,
          themes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /curricula/:curriculumId/themes - List all themes for curriculum
export async function getThemes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const curriculumId = await getCurriculumId(req);

    if (!curriculumId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NO_CURRICULUM',
          message: 'No curriculum found',
        },
      });
      return;
    }

    const result = await query<Theme>(
      'SELECT * FROM themes WHERE curriculum_id = $1 ORDER BY theme_order',
      [curriculumId]
    );

    res.status(200).json({
      success: true,
      data: {
        curriculumId,
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

// GET /curricula/:curriculumId/themes/:themeId - Get single theme with topics
export async function getTheme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const curriculumId = await getCurriculumId(req);
    const { themeId } = req.params;

    if (!curriculumId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NO_CURRICULUM',
          message: 'No curriculum found',
        },
      });
      return;
    }

    const themeResult = await query<Theme>(
      'SELECT * FROM themes WHERE curriculum_id = $1 AND theme_id = $2',
      [curriculumId, themeId]
    );

    if (!themeResult.rows[0]) {
      res.status(404).json({
        success: false,
        error: {
          code: 'THEME_NOT_FOUND',
          message: 'Theme not found in this curriculum',
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
       WHERE th.curriculum_id = $1 AND th.theme_id = $2
       ORDER BY t.topic_order`,
      [curriculumId, themeId]
    );

    res.status(200).json({
      success: true,
      data: {
        curriculumId,
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

// GET /curricula/:curriculumId/topics/:topicId - Get single topic with concepts
export async function getTopic(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const curriculumId = await getCurriculumId(req);
    const { topicId } = req.params;

    if (!curriculumId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NO_CURRICULUM',
          message: 'No curriculum found',
        },
      });
      return;
    }

    const topicResult = await query<Topic & { theme_id_str: string; theme_name: string }>(
      `SELECT t.*, th.theme_id as theme_id_str, th.theme_name
       FROM topics t
       JOIN themes th ON t.theme_id = th.id
       WHERE t.curriculum_id = $1 AND t.topic_id = $2`,
      [curriculumId, topicId]
    );

    if (!topicResult.rows[0]) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found in this curriculum',
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
       WHERE c.curriculum_id = $1 AND t.topic_id = $2
       ORDER BY c.concept_id`,
      [curriculumId, topicId]
    );

    // Get canonical explanation if exists
    const explanationResult = await query<CanonicalExplanation>(
      `SELECT ce.explanation_text, ce.rules
       FROM canonical_explanations ce
       JOIN topics t ON ce.topic_id = t.id
       WHERE ce.curriculum_id = $1 AND t.topic_id = $2`,
      [curriculumId, topicId]
    );

    const explanation = explanationResult.rows[0] || null;

    // Get question counts per difficulty
    const questionCountResult = await query<{ difficulty: string; count: string }>(
      `SELECT difficulty, COUNT(*) as count
       FROM questions
       WHERE curriculum_id = $1 AND topic_id_str = $2
       GROUP BY difficulty`,
      [curriculumId, topicId]
    );

    const questionCounts: Record<string, number> = {};
    for (const row of questionCountResult.rows) {
      questionCounts[row.difficulty] = parseInt(row.count, 10);
    }

    res.status(200).json({
      success: true,
      data: {
        curriculumId,
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

// GET /curricula/:curriculumId/topics/:topicId/questions - Get question bank for a topic
export async function getTopicQuestions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const curriculumId = await getCurriculumId(req);
    const { topicId } = req.params;

    if (!curriculumId) {
      res.status(404).json({
        success: false,
        error: { code: 'NO_CURRICULUM', message: 'No curriculum found' },
      });
      return;
    }

    const questions = await QuestionModel.getQuestionsByTopic(curriculumId!, topicId as string);

    // Get canonical explanation
    const explanationResult = await query<CanonicalExplanation>(
      `SELECT ce.explanation_text, ce.rules
       FROM canonical_explanations ce
       JOIN topics t ON ce.topic_id = t.id
       WHERE ce.curriculum_id = $1 AND t.topic_id = $2`,
      [curriculumId, topicId]
    );
    const explanation = explanationResult.rows[0] || null;

    res.status(200).json({
      success: true,
      data: {
        topic_id: topicId,
        curriculum_id: curriculumId,
        canonical_explanation: explanation
          ? { text: explanation.explanation_text, rules: explanation.rules }
          : null,
        questions: questions.map(q => ({
          question_id: q.question_id,
          concept_id: q.concept_id_str,
          difficulty: q.difficulty,
          type: q.question_type,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          match_pairs: q.match_pairs,
          ordering_items: q.ordering_items,
          hint: q.hint,
          tags: q.tags,
          explanation_correct: q.explanation_correct,
          explanation_incorrect: q.explanation_incorrect,
          image_url: q.image_url || null,
          option_images: q.option_images || null,
        })),
        question_count: questions.length,
      },
    });
  } catch (error) {
    next(error);
  }
}
