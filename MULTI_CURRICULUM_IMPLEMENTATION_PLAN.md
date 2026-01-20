# Multi-Curriculum Implementation Plan

This document outlines all changes required to support multiple boards, classes, and subjects in CoolScool.

---

## Overview

### New Data Model

```
curricula (NEW)
    ├── id (UUID)
    ├── board (ICSE, CBSE, STATE_MH, etc.)
    ├── class_level (1-12)
    ├── subject (Mathematics, Science, English)
    └── is_active, display_name, etc.

themes
    └── curriculum_id (FK) ← NEW

topics
    └── curriculum_id (FK) ← NEW (denormalized)

concepts
    └── curriculum_id (FK) ← NEW (denormalized)

questions
    └── curriculum_id (FK) ← NEW (denormalized)

users
    └── default_curriculum_id (FK) ← NEW
```

### Unique Constraints Change

| Table | Old Unique | New Unique |
|-------|-----------|------------|
| themes | `theme_id` | `(curriculum_id, theme_id)` |
| topics | `topic_id` | `(curriculum_id, topic_id)` |
| concepts | `concept_id` | `(curriculum_id, concept_id)` |
| questions | `question_id` | `(curriculum_id, question_id)` |

---

## 1. Database Migration

**File:** `coolscool-backend/src/db/migrations/002_multi_curriculum_support.sql`

**Status:** ✅ COMPLETE (2026-01-20)

**What it does:**
- Creates `curricula` table
- Adds `curriculum_id` to all content tables
- Migrates existing data to ICSE Class 5 Mathematics curriculum
- Updates unique constraints
- Adds user curriculum preference

**Migration Results:**
- Curriculum created: `ICSE Class 5 Mathematics` (ID: 91e53635-0858-48e2-b663-ab285f7f9cde)
- Themes migrated: 10/10 ✓
- Topics migrated: 32/32 ✓
- Concepts migrated: 163/163 ✓
- Questions migrated: 1600/1600 ✓
- Unique constraints updated to curriculum-scoped ✓
- `curriculum_overview` view created ✓
- User `default_curriculum_id` column added ✓

**Notes:**
- Fixed database.ts to enable SSL for Neon in development mode
- Migration ran in transaction for safety
- All existing data preserved and linked to curriculum

---

## 2. Backend Model Changes

### 2.1 New Curriculum Model

**Create:** `coolscool-backend/src/models/curriculum.model.ts`

```typescript
import { pool } from '../config/database.js';

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

export async function findAll(activeOnly = true): Promise<Curriculum[]> {
  const query = activeOnly
    ? 'SELECT * FROM curricula WHERE is_active = true ORDER BY board, class_level, subject'
    : 'SELECT * FROM curricula ORDER BY board, class_level, subject';
  const result = await pool.query(query);
  return result.rows;
}

export async function findById(id: string): Promise<Curriculum | null> {
  const result = await pool.query('SELECT * FROM curricula WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function findByBoardClassSubject(
  board: string,
  classLevel: number,
  subject: string
): Promise<Curriculum | null> {
  const result = await pool.query(
    'SELECT * FROM curricula WHERE board = $1 AND class_level = $2 AND subject = $3',
    [board, classLevel, subject]
  );
  return result.rows[0] || null;
}

export async function create(curriculum: Omit<Curriculum, 'id' | 'created_at' | 'updated_at'>): Promise<Curriculum> {
  const result = await pool.query(
    `INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      curriculum.board,
      curriculum.class_level,
      curriculum.subject,
      curriculum.academic_year,
      curriculum.cam_version,
      curriculum.display_name,
      curriculum.description,
      curriculum.is_active,
    ]
  );
  return result.rows[0];
}

export async function getOverview(): Promise<any[]> {
  const result = await pool.query('SELECT * FROM curriculum_overview WHERE is_active = true');
  return result.rows;
}
```

### 2.2 Update CAM Model

**Modify:** `coolscool-backend/src/models/cam.model.ts`

Add `curriculum_id` parameter to all queries:

```typescript
// Before
export async function getThemes(): Promise<Theme[]> {
  const result = await pool.query('SELECT * FROM themes ORDER BY theme_order');
  return result.rows;
}

// After
export async function getThemes(curriculumId: string): Promise<Theme[]> {
  const result = await pool.query(
    'SELECT * FROM themes WHERE curriculum_id = $1 ORDER BY theme_order',
    [curriculumId]
  );
  return result.rows;
}

// Apply same pattern to:
// - getTopics(curriculumId, themeId?)
// - getConcepts(curriculumId, topicId?)
// - getTopicById(curriculumId, topicId)
// - etc.
```

### 2.3 Update Question Model

**Modify:** `coolscool-backend/src/models/question.model.ts`

```typescript
// Before
export async function getQuestionsByTopic(topicId: string): Promise<Question[]> {
  const result = await pool.query(
    'SELECT * FROM questions WHERE topic_id_str = $1',
    [topicId]
  );
  return result.rows;
}

// After
export async function getQuestionsByTopic(curriculumId: string, topicId: string): Promise<Question[]> {
  const result = await pool.query(
    'SELECT * FROM questions WHERE curriculum_id = $1 AND topic_id_str = $2',
    [curriculumId, topicId]
  );
  return result.rows;
}
```

### 2.4 Update Progress Models

**Modify:** `coolscool-backend/src/models/progress.model.ts`

Add curriculum_id to all progress queries:

```typescript
export async function getConceptProgress(
  userId: string,
  curriculumId: string,
  conceptId: string
): Promise<ConceptProgress | null> {
  const result = await pool.query(
    'SELECT * FROM concept_progress WHERE user_id = $1 AND curriculum_id = $2 AND concept_id_str = $3',
    [userId, curriculumId, conceptId]
  );
  return result.rows[0] || null;
}

export async function getTopicProgress(
  userId: string,
  curriculumId: string,
  topicId: string
): Promise<TopicProgress | null> {
  const result = await pool.query(
    'SELECT * FROM topic_progress WHERE user_id = $1 AND curriculum_id = $2 AND topic_id_str = $3',
    [userId, curriculumId, topicId]
  );
  return result.rows[0] || null;
}
```

### 2.5 Update User Model

**Modify:** `coolscool-backend/src/models/user.model.ts`

```typescript
export async function setDefaultCurriculum(userId: string, curriculumId: string): Promise<void> {
  await pool.query(
    'UPDATE users SET default_curriculum_id = $1 WHERE id = $2',
    [curriculumId, userId]
  );
}

export async function getDefaultCurriculum(userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT default_curriculum_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.default_curriculum_id || null;
}
```

---

## 3. Backend API Changes

### 3.1 New Curriculum Routes

**Create:** `coolscool-backend/src/routes/curriculum.routes.ts`

```typescript
import { Router } from 'express';
import * as curriculumController from '../controllers/curriculum.controller.js';

const router = Router();

// GET /api/v1/curricula - List all active curricula
router.get('/', curriculumController.listCurricula);

// GET /api/v1/curricula/:id - Get curriculum details
router.get('/:id', curriculumController.getCurriculum);

// GET /api/v1/curricula/:id/overview - Get curriculum with counts
router.get('/:id/overview', curriculumController.getCurriculumOverview);

export default router;
```

**Create:** `coolscool-backend/src/controllers/curriculum.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import * as curriculumModel from '../models/curriculum.model.js';

export async function listCurricula(req: Request, res: Response, next: NextFunction) {
  try {
    const curricula = await curriculumModel.findAll();
    res.json({ data: curricula });
  } catch (error) {
    next(error);
  }
}

export async function getCurriculum(req: Request, res: Response, next: NextFunction) {
  try {
    const curriculum = await curriculumModel.findById(req.params.id);
    if (!curriculum) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }
    res.json({ data: curriculum });
  } catch (error) {
    next(error);
  }
}

export async function getCurriculumOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await curriculumModel.getOverview();
    res.json({ data: overview });
  } catch (error) {
    next(error);
  }
}
```

### 3.2 Update CAM Routes

**Modify:** `coolscool-backend/src/routes/cam.routes.ts`

```typescript
// Before
router.get('/themes', camController.getThemes);

// After - curriculum_id required
router.get('/curricula/:curriculumId/themes', camController.getThemes);
router.get('/curricula/:curriculumId/topics', camController.getTopics);
router.get('/curricula/:curriculumId/topics/:topicId', camController.getTopicById);
router.get('/curricula/:curriculumId/concepts', camController.getConcepts);
```

### 3.3 Update Session Routes

**Modify:** `coolscool-backend/src/routes/session.routes.ts`

```typescript
// Session creation requires curriculum context
router.post('/curricula/:curriculumId/sessions', sessionController.createSession);

// Or pass curriculum_id in body
router.post('/sessions', sessionController.createSession);
// Body: { curriculum_id: "...", topic_id: "T01.01", time_mode: "unlimited" }
```

### 3.4 Register New Routes

**Modify:** `coolscool-backend/src/app.ts`

```typescript
import curriculumRoutes from './routes/curriculum.routes.js';

// Add curriculum routes
app.use('/api/v1/curricula', curriculumRoutes);
```

---

## 4. Frontend Changes

### 4.1 Curriculum Context Provider

**Create:** `coolscool-web/src/contexts/CurriculumContext.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface Curriculum {
  id: string;
  board: string;
  class_level: number;
  subject: string;
  display_name: string;
}

interface CurriculumContextType {
  curricula: Curriculum[];
  currentCurriculum: Curriculum | null;
  setCurrentCurriculum: (curriculum: Curriculum) => void;
  isLoading: boolean;
}

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

export function CurriculumProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [currentCurriculum, setCurrentCurriculum] = useState<Curriculum | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCurricula() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/curricula`);
        const data = await response.json();
        setCurricula(data.data);

        // Set default curriculum (from user preference or first available)
        if (data.data.length > 0 && !currentCurriculum) {
          setCurrentCurriculum(data.data[0]);
        }
      } catch (error) {
        console.error('Failed to load curricula:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCurricula();
  }, []);

  return (
    <CurriculumContext.Provider value={{ curricula, currentCurriculum, setCurrentCurriculum, isLoading }}>
      {children}
    </CurriculumContext.Provider>
  );
}

export function useCurriculum() {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within CurriculumProvider');
  }
  return context;
}
```

### 4.2 Curriculum Selector Component

**Create:** `coolscool-web/src/components/CurriculumSelector.tsx`

```typescript
'use client';

import { useCurriculum } from '@/contexts/CurriculumContext';

export function CurriculumSelector() {
  const { curricula, currentCurriculum, setCurrentCurriculum, isLoading } = useCurriculum();

  if (isLoading) return <div>Loading...</div>;

  return (
    <select
      value={currentCurriculum?.id || ''}
      onChange={(e) => {
        const selected = curricula.find(c => c.id === e.target.value);
        if (selected) setCurrentCurriculum(selected);
      }}
      className="..."
    >
      {curricula.map((curriculum) => (
        <option key={curriculum.id} value={curriculum.id}>
          {curriculum.display_name || `${curriculum.board} Class ${curriculum.class_level} ${curriculum.subject}`}
        </option>
      ))}
    </select>
  );
}
```

### 4.3 Update API Service Calls

**Modify:** `coolscool-web/src/services/cam-api.ts`

```typescript
// Before
export async function getThemes(): Promise<Theme[]> {
  const response = await apiClient.get('/cam/themes');
  return response.data.data;
}

// After
export async function getThemes(curriculumId: string): Promise<Theme[]> {
  const response = await apiClient.get(`/curricula/${curriculumId}/themes`);
  return response.data.data;
}

export async function getTopics(curriculumId: string, themeId?: string): Promise<Topic[]> {
  const url = themeId
    ? `/curricula/${curriculumId}/topics?theme=${themeId}`
    : `/curricula/${curriculumId}/topics`;
  const response = await apiClient.get(url);
  return response.data.data;
}
```

### 4.4 Update Browse/Practice Pages

**Modify:** `coolscool-web/src/app/(main)/browse/page.tsx`

```typescript
'use client';

import { useCurriculum } from '@/contexts/CurriculumContext';
import { CurriculumSelector } from '@/components/CurriculumSelector';
import { useEffect, useState } from 'react';
import { getThemes } from '@/services/cam-api';

export default function BrowsePage() {
  const { currentCurriculum } = useCurriculum();
  const [themes, setThemes] = useState([]);

  useEffect(() => {
    if (currentCurriculum) {
      getThemes(currentCurriculum.id).then(setThemes);
    }
  }, [currentCurriculum]);

  return (
    <div>
      <CurriculumSelector />
      {/* Rest of the page using themes */}
    </div>
  );
}
```

### 4.5 Add Provider to Layout

**Modify:** `coolscool-web/src/app/(main)/layout.tsx`

```typescript
import { CurriculumProvider } from '@/contexts/CurriculumContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurriculumProvider>
      {/* existing layout */}
      {children}
    </CurriculumProvider>
  );
}
```

---

## 5. Seeding Script Updates

### 5.1 Update seed-cam.ts

**Modify:** `coolscool-backend/scripts/seed-cam.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CAMData {
  version: string;
  board: string;
  class: number;
  subject: string;
  academic_year?: string;
  themes: Theme[];
}

async function seedCAM(camFilePath: string): Promise<void> {
  console.log(`Seeding CAM from: ${camFilePath}\n`);

  if (!fs.existsSync(camFilePath)) {
    console.error(`CAM file not found: ${camFilePath}`);
    process.exit(1);
  }

  const camData: CAMData = JSON.parse(fs.readFileSync(camFilePath, 'utf8'));
  console.log(`Loaded CAM version ${camData.version}`);
  console.log(`Board: ${camData.board}, Class: ${camData.class}, Subject: ${camData.subject}\n`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create or find curriculum
    const curriculumResult = await client.query(
      `INSERT INTO curricula (board, class_level, subject, academic_year, cam_version, display_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (board, class_level, subject) DO UPDATE SET
         cam_version = EXCLUDED.cam_version,
         academic_year = EXCLUDED.academic_year,
         updated_at = NOW()
       RETURNING id`,
      [
        camData.board,
        camData.class,
        camData.subject,
        camData.academic_year || null,
        camData.version,
        `${camData.board} Class ${camData.class} ${camData.subject}`,
      ]
    );
    const curriculumId = curriculumResult.rows[0].id;
    console.log(`Curriculum ID: ${curriculumId}\n`);

    // 2. Seed themes with curriculum_id
    for (const theme of camData.themes) {
      const themeResult = await client.query(
        `INSERT INTO themes (curriculum_id, theme_id, theme_name, theme_order, cam_version)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (curriculum_id, theme_id) DO UPDATE SET
           theme_name = EXCLUDED.theme_name,
           theme_order = EXCLUDED.theme_order
         RETURNING id`,
        [curriculumId, theme.theme_id, theme.theme_name, theme.theme_order, camData.version]
      );
      const themeUuid = themeResult.rows[0].id;

      // 3. Seed topics with curriculum_id
      for (const topic of theme.topics) {
        const topicResult = await client.query(
          `INSERT INTO topics (curriculum_id, theme_id, topic_id, topic_name, topic_order, boundaries_in_scope, boundaries_out_of_scope, numeric_limits)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (curriculum_id, topic_id) DO UPDATE SET
             topic_name = EXCLUDED.topic_name,
             topic_order = EXCLUDED.topic_order
           RETURNING id`,
          [
            curriculumId,
            themeUuid,
            topic.topic_id,
            topic.topic_name,
            topic.topic_order,
            JSON.stringify(topic.boundaries?.in_scope || []),
            JSON.stringify(topic.boundaries?.out_of_scope || []),
            JSON.stringify(topic.numeric_limits || {}),
          ]
        );
        const topicUuid = topicResult.rows[0].id;

        // 4. Seed concepts with curriculum_id
        for (const concept of topic.concepts) {
          await client.query(
            `INSERT INTO concepts (curriculum_id, topic_id, concept_id, concept_name, difficulty_levels)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (curriculum_id, concept_id) DO UPDATE SET
               concept_name = EXCLUDED.concept_name,
               difficulty_levels = EXCLUDED.difficulty_levels`,
            [
              curriculumId,
              topicUuid,
              concept.concept_id,
              concept.concept_name,
              concept.difficulty_levels || ['familiarity', 'application', 'exam_style'],
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('CAM seeding completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding CAM:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow passing CAM file as argument
const camFile = process.argv[2] || path.join(__dirname, '../../cam/data/icse-class5-mathematics-cam.json');
seedCAM(camFile)
  .then(() => pool.end())
  .catch((error) => {
    console.error('CAM seeding failed:', error);
    process.exit(1);
  });
```

### 5.2 Update seed-questions.ts

Similar changes - accept curriculum context and use composite keys.

---

## 6. File Organization for Multiple Curricula

### 6.1 CAM Files

```
cam/data/
├── icse-class5-mathematics-cam.json    (existing)
├── icse-class6-mathematics-cam.json    (new)
├── icse-class7-mathematics-cam.json    (new)
├── cbse-class5-mathematics-cam.json    (new)
├── cbse-class6-mathematics-cam.json    (new)
├── icse-class5-science-cam.json        (new subject)
└── ...
```

### 6.2 Question Files

Option A: Flat with prefix
```
questions/data/
├── icse-5-math-T01.01-place-value.json
├── icse-5-math-T01.02-whole-numbers.json
├── icse-6-math-T01.01-place-value.json
└── ...
```

Option B: Nested folders (recommended)
```
questions/data/
├── icse/
│   ├── class5/
│   │   └── mathematics/
│   │       ├── T01.01-place-value.json
│   │       └── T01.02-whole-numbers.json
│   └── class6/
│       └── mathematics/
│           └── T01.01-...json
├── cbse/
│   └── class5/
│       └── mathematics/
│           └── ...
└── ...
```

---

## 7. Implementation Order

### Phase 1: Database (Required First) ✅ COMPLETE
1. ✅ Run migration `002_multi_curriculum_support.sql`
2. ✅ Verify existing data migrated correctly

**Completed:** 2026-01-20
**Scripts created:**
- `scripts/run-migration-002.ts` - Runs migration 002 with transaction safety
- `scripts/verify-migration-002.ts` - Verifies migration results
- `scripts/check-db-state.ts` - Checks database state before/after migration

### Phase 2: Backend ✅ COMPLETE
1. ✅ Create curriculum model and routes
2. ✅ Update CAM model with curriculum_id
3. ✅ Update question/session/progress models
4. ✅ Update all API routes
5. ✅ TypeScript compilation verified

**Completed:** 2026-01-20
**Files created/modified:**
- `src/models/curriculum.model.ts` - New curriculum model
- `src/controllers/curriculum.controller.ts` - New curriculum controller
- `src/routes/curriculum.routes.ts` - New curriculum routes
- `src/controllers/cam.controller.ts` - Updated with curriculum_id filtering
- `src/routes/cam.routes.ts` - Added curriculum-scoped routes
- `src/models/question.model.ts` - Added curriculum_id to queries
- `src/services/session.service.ts` - Added curriculum_id to sessions
- `src/services/mastery.service.ts` - Added curriculum_id to concept progress
- `src/services/proficiency.service.ts` - Added curriculum_id to topic progress
- `src/services/progress.service.ts` - Added curriculum_id to progress queries
- `src/middleware/validate.ts` - Added curriculumId to session validation
- `src/app.ts` - Registered curriculum routes

### Phase 3: Seeding Scripts ✅ COMPLETE
1. ✅ Update seed-cam.ts
2. ✅ Update seed-questions.ts
3. ✅ Test with existing ICSE Class 5 data

**Completed:** 2026-01-20
**Files modified:**
- `scripts/seed-cam.ts` - Now reads curriculum metadata from CAM JSON, uses UPSERT with curriculum-scoped unique constraints
- `scripts/seed-questions.ts` - Reads `cam_reference` from question files, curriculum-aware lookups and inserts

**Key changes:**
- Both scripts accept file/directory path as command line argument
- seed-cam.ts: Creates/updates curriculum via `ON CONFLICT (board, class_level, subject)`
- seed-cam.ts: Uses `ON CONFLICT (curriculum_id, theme_id/topic_id/concept_id)` for content
- seed-questions.ts: Reads curriculum from `cam_reference` in question JSON, falls back to topic lookup
- seed-questions.ts: Uses `ON CONFLICT (curriculum_id, question_id)` for questions
- Both scripts are idempotent - re-running updates existing data without duplicates

**Test results:**
- Re-ran with existing ICSE Class 5 data
- 10 themes, 32 topics, 163 concepts, 1600 questions updated (no duplicates)
- Data integrity verified

### Phase 4: Frontend ✅ COMPLETE
1. ✅ Create CurriculumContext
2. ✅ Create CurriculumSelector component
3. ✅ Update API service calls
4. ✅ Update browse/practice pages
5. ✅ TypeScript compilation verified

**Completed:** 2026-01-20
**Files created:**
- `coolscool-web/src/contexts/CurriculumContext.tsx` - React context for curriculum state management
- `coolscool-web/src/contexts/index.ts` - Context exports
- `coolscool-web/src/components/curriculum/CurriculumSelector.tsx` - Dropdown to switch curricula
- `coolscool-web/src/components/curriculum/index.ts` - Component exports

**Files modified:**
- `coolscool-web/src/lib/api/types.ts` - Added Curriculum types
- `coolscool-web/src/lib/api/endpoints.ts` - Added curriculum API endpoints
- `coolscool-web/src/services/curriculum-api.ts` - Added curriculum-based fetching with API fallback
- `coolscool-web/src/components/topics/topic-browser.tsx` - Uses curriculumId from context/props
- `coolscool-web/src/app/(public)/quiz/page.tsx` - Reads curriculumId from URL params
- `coolscool-web/src/hooks/use-quiz-engine.ts` - Accepts curriculumId option
- `coolscool-web/src/app/layout.tsx` - Added CurriculumProvider to root layout
- `coolscool-web/src/app/globals.css` - Added curriculum selector styles

**Key features:**
- CurriculumProvider wraps entire app, fetches curricula on load
- Curriculum selection persisted to localStorage
- TopicBrowser resolves curriculumId from: prop -> context -> API lookup
- curriculumId passed through URL to quiz page
- Backward compatible: falls back to static files when API unavailable

### Phase 5: Add New Curriculum
1. Create CAM file for new curriculum
2. Create question files
3. Run seeding scripts
4. Verify in UI

---

## 8. Testing Checklist

### Phase 1 (Database) - COMPLETE
- [x] Migration runs without errors
- [x] Existing ICSE Class 5 data is preserved
- [x] curricula table created with correct schema
- [x] All content tables have curriculum_id column
- [x] Unique constraints updated to curriculum-scoped
- [x] curriculum_overview view created and working

### Phase 2 (Backend) - COMPLETE
- [x] API returns curricula list (`GET /curricula`)
- [x] API returns themes filtered by curriculum (`GET /curricula/:id/themes`)
- [x] API returns topics filtered by curriculum (`GET /curricula/:id/topics/:topicId`)
- [x] Quiz sessions scoped to curriculum (`curriculumId` in session creation)
- [x] Progress tracking scoped to curriculum (concept_progress, topic_progress)
- [x] TypeScript compilation verified

### Phase 3 (Seeding Scripts) - COMPLETE
- [x] Seeding scripts updated for curriculum parameter
- [x] seed-cam.ts reads curriculum from CAM JSON metadata
- [x] seed-questions.ts reads curriculum from `cam_reference` in question files
- [x] Scripts are idempotent (re-run without duplicates)
- [x] New curriculum can be seeded independently

### Phase 4 (Frontend) - COMPLETE
- [x] CurriculumContext created and working
- [x] CurriculumSelector component created
- [x] API service calls updated with curriculumId support
- [x] TopicBrowser uses curriculumId from context/props/API
- [x] Quiz page receives and uses curriculumId
- [x] CurriculumProvider added to root layout
- [x] TypeScript compilation verified
- [ ] User can switch between curricula (requires multiple curricula in DB)
- [ ] UI shows correct content per curriculum (requires testing with multiple curricula)
- [ ] No cross-curriculum data leakage (integration tests)

---

## 9. Future Considerations

### Multi-Subject Per User
- User might study Math and Science simultaneously
- Consider separate progress tracking per subject

### Curriculum Versioning
- When syllabus changes year-to-year
- Migrate user progress or keep historical

### Regional Variants
- Same board may have regional differences
- Consider adding `region` field to curricula

### Parent Dashboard
- Parents may have children in different classes
- Dashboard should aggregate across curricula
