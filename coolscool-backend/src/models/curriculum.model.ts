/**
 * Curriculum Model
 *
 * Database operations for curricula (board/class/subject combinations).
 * Each unique combination represents a curriculum that scopes all content.
 *
 * Per North Star §5 (CAM Authority) and §15 (Board Isolation):
 * - All content is derived from a curriculum-specific CAM
 * - Content from different curricula must never mix
 */

import { query } from '../db/index.js';

export interface Curriculum {
  id: string;
  board: string;
  class_level: number;
  subject: string;
  academic_year: string | null;
  cam_version: string;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CurriculumOverview extends Curriculum {
  theme_count: number;
  topic_count: number;
  concept_count: number;
  question_count: number;
}

/**
 * Find all curricula
 */
export async function findAll(activeOnly = true): Promise<Curriculum[]> {
  const whereClause = activeOnly ? 'WHERE is_active = true' : '';
  const result = await query<Curriculum>(
    `SELECT * FROM curricula ${whereClause} ORDER BY board, class_level, subject`
  );
  return result.rows;
}

/**
 * Find curriculum by ID
 */
export async function findById(id: string): Promise<Curriculum | null> {
  const result = await query<Curriculum>(
    'SELECT * FROM curricula WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find curriculum by board, class, and subject
 */
export async function findByBoardClassSubject(
  board: string,
  classLevel: number,
  subject: string
): Promise<Curriculum | null> {
  const result = await query<Curriculum>(
    'SELECT * FROM curricula WHERE board = $1 AND class_level = $2 AND subject = $3',
    [board, classLevel, subject]
  );
  return result.rows[0] || null;
}

/**
 * Get curriculum overview with content counts
 */
export async function getOverview(activeOnly = true): Promise<CurriculumOverview[]> {
  const whereClause = activeOnly ? 'WHERE is_active = true' : '';
  const result = await query<CurriculumOverview>(
    `SELECT * FROM curriculum_overview ${whereClause}`
  );
  return result.rows;
}

/**
 * Get single curriculum overview by ID
 */
export async function getOverviewById(id: string): Promise<CurriculumOverview | null> {
  const result = await query<CurriculumOverview>(
    'SELECT * FROM curriculum_overview WHERE curriculum_id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new curriculum
 */
export async function create(curriculum: {
  board: string;
  class_level: number;
  subject: string;
  academic_year?: string;
  cam_version?: string;
  display_name?: string;
  description?: string;
  is_active?: boolean;
}): Promise<Curriculum> {
  const result = await query<Curriculum>(
    `INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      curriculum.board,
      curriculum.class_level,
      curriculum.subject,
      curriculum.academic_year || null,
      curriculum.cam_version || '1.0.0',
      curriculum.display_name || `${curriculum.board} Class ${curriculum.class_level} ${curriculum.subject}`,
      curriculum.description || null,
      curriculum.is_active ?? true,
    ]
  );
  return result.rows[0]!;
}

/**
 * Update curriculum
 */
export async function update(
  id: string,
  updates: Partial<Pick<Curriculum, 'academic_year' | 'cam_version' | 'display_name' | 'description' | 'is_active'>>
): Promise<Curriculum | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.academic_year !== undefined) {
    fields.push(`academic_year = $${paramIndex++}`);
    values.push(updates.academic_year);
  }
  if (updates.cam_version !== undefined) {
    fields.push(`cam_version = $${paramIndex++}`);
    values.push(updates.cam_version);
  }
  if (updates.display_name !== undefined) {
    fields.push(`display_name = $${paramIndex++}`);
    values.push(updates.display_name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updates.is_active);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await query<Curriculum>(
    `UPDATE curricula SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Check if curriculum exists and is active
 */
export async function exists(id: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM curricula WHERE id = $1 AND is_active = true) as exists',
    [id]
  );
  return result.rows[0]?.exists || false;
}

/**
 * Get default curriculum (first active one, for backwards compatibility)
 */
export async function getDefault(): Promise<Curriculum | null> {
  const result = await query<Curriculum>(
    'SELECT * FROM curricula WHERE is_active = true ORDER BY created_at LIMIT 1'
  );
  return result.rows[0] || null;
}
