# Cool S-Cool — Remaining Phases Implementation Prompt (5, 6, 7)

## What This Prompt Is

This is a complete handoff prompt for continuing the Cool S-Cool development roadmap. You are picking up after Phase 4. Three phases remain: Phase 5 (CBSE Board), Phase 6 (English Subject), Phase 7 (Social Studies Subject). Implement them **in order**, one at a time, getting approval before each phase and each sub-phase.

---

## Project Overview

**Cool S-Cool** is an adaptive learning quiz app for Indian school students (Classes 1-12). It currently supports the **ICSE board** with Mathematics and Science subjects.

**Repository**: github.com/arvind305/CoolScool
**Working directory**: `D:\CoolSCool`
**Platform**: Windows (use `cd "D:\CoolSCool"` with quotes)

### Git History (latest first)
```
6e6de87 Phase 4: Testing & reliability — 70 backend tests, 25 frontend tests, CI/CD
c26e8ea Phase 3: UI/UX polish — landing page, mobile nav, skeletons, breadcrumbs
8f07b12 Phase 2: Image-based questions infrastructure
a3527ba Phase 1: User analytics, dashboard redesign & question flagging
```

### Completed Phases Summary
| Phase | What Was Done |
|-------|---------------|
| **1** ✅ | Analytics endpoints (`/progress/trends`, `/progress/streak`, `/progress/weak-areas`, `/progress/subjects`), dashboard redesign with Recharts (stat cards with trends, activity chart, subject breakdown, weak areas, timeline session history), question flagging system (backend CRUD + flag modal + admin dashboard) |
| **2** ✅ | Image-based questions infrastructure: `image_url` column in DB, `option_images JSONB` column, updated QuestionDisplay component with responsive images, updated seed scripts to handle image fields |
| **3** ✅ | Landing page revamp (feature highlights, stats banner, trust section), mobile bottom nav (auth-aware, hides during quiz), loading skeletons, breadcrumbs, page-enter animations, empty states, collapsible quiz summary |
| **4** ✅ | 70 backend Jest tests (auth/validate middleware, 5 controller suites), 178 frontend Jest tests (components), 81 Vitest quiz-engine tests, GitHub Actions CI/CD workflow (backend + frontend jobs: lint, type-check, test, build). Total: **329 tests all passing** |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Express 4.18, TypeScript (NodeNext module resolution), PostgreSQL (Neon) | Raw pg queries (no ORM), JWT auth, Joi validation |
| Frontend | Next.js 16, React 19, TailwindCSS v4, Zustand, TanStack Query | App Router with route groups: `(public)`, `(protected)`, `(auth)` |
| Testing | Jest (backend: 70), Jest (frontend: 178), Vitest (quiz-engine: 81) | CI runs all on PR/push to main |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` — separate backend + frontend jobs |
| Auth | Google OAuth via NextAuth 5 beta + JWT access/refresh tokens | |

---

## Project Structure

```
D:\CoolSCool\
├── coolscool-backend/                    # Express 4 API server
│   ├── src/
│   │   ├── app.ts                        # Server startup (imports create-app.ts)
│   │   ├── create-app.ts                 # Express app factory (for testability)
│   │   ├── controllers/                  # auth, session, progress, cam, flag controllers
│   │   ├── services/                     # auth, session, progress, analytics, flag services
│   │   ├── models/                       # user, curriculum, question models (raw pg)
│   │   ├── middleware/                   # auth, validate, error-handler, rate-limit
│   │   ├── routes/                       # auth, session, progress, cam, flag routes
│   │   ├── db/
│   │   │   ├── index.ts                  # pg Pool export
│   │   │   └── migrations/              # 001_initial, 002_multi_curriculum, 003_optimize, 004_analytics, 005_flagging, 006_images
│   │   ├── config/database.ts            # DB connection config
│   │   └── utils/                        # AppError, helpers
│   ├── scripts/
│   │   ├── seed-all-classes.ts           # Seeds ICSE Maths CAM + questions (Classes 1-12)
│   │   ├── seed-science.ts              # Seeds ICSE Science CAM + questions (Classes 1-12)
│   │   ├── seed-cam.ts                  # Legacy single-class CAM seeder
│   │   └── seed-questions.ts            # Legacy single-class question seeder
│   ├── tests/                           # 70 Jest tests
│   │   ├── helpers.ts                   # testChild/testParent/testAdmin, generateTestToken()
│   │   ├── setup.ts                     # Env vars, console suppression
│   │   ├── middleware/                   # auth.test.ts (12), validate.test.ts (15)
│   │   └── controllers/                 # auth(8), session(7), progress(9), flag(4), cam(4)
│   ├── jest.config.js                   # ts-jest, moduleNameMapper strips .js
│   ├── tsconfig.json                    # NodeNext, strict, noUncheckedIndexedAccess
│   └── package.json                     # scripts: dev, build, start, test, lint, seed:*
│
├── coolscool-web/                        # Next.js 16 frontend
│   ├── src/
│   │   ├── app/                          # App Router pages
│   │   │   ├── (public)/browse/         # Subject/class/topic browsing
│   │   │   ├── (protected)/dashboard/   # User dashboard
│   │   │   ├── (protected)/quiz/        # Quiz session
│   │   │   ├── (protected)/profile/     # User profile
│   │   │   └── (auth)/                  # Login pages
│   │   ├── components/
│   │   │   ├── dashboard/               # StatCard, StreakBadge, ActivityChart, etc.
│   │   │   ├── quiz/                    # QuestionDisplay, QuizSummary, FlagModal
│   │   │   ├── topics/                  # TopicCard, TopicBrowser
│   │   │   ├── layout/                  # Navbar, Footer, BottomNav
│   │   │   └── ui/                      # Button, Skeleton, LoginPrompt
│   │   ├── lib/quiz-engine/             # Pure logic: session-manager, mastery-tracker, proficiency-calculator
│   │   ├── services/                    # API client wrappers
│   │   ├── contexts/                    # CurriculumContext
│   │   ├── hooks/                       # useAccessControl, etc.
│   │   ├── stores/                      # Zustand stores
│   │   └── types/                       # TypeScript types
│   ├── jest.config.js
│   └── package.json                     # scripts: dev, build, test, test:vitest, lint
│
├── cam/                                  # Curriculum Authority Model
│   ├── schema/
│   │   └── cam-schema.json              # JSON Schema (board enum: ["ICSE"], class max: 10, subject enum: ["Mathematics"])
│   └── data/
│       └── icse-class{1-12}-mathematics-cam.json   # 12 ICSE Maths CAM files
│
├── questions/data/                       # Question banks (JSON files, ~50 questions each)
│   ├── class{1-12}/                     # ICSE Maths questions
│   ├── class{1-5}-science/              # ICSE Science (EVS) questions
│   ├── class{6-12}-physics/             # ICSE Physics questions
│   ├── class{6-12}-chemistry/           # ICSE Chemistry questions
│   └── class{6-12}-biology/             # ICSE Biology questions
│
│       └── topics/                                 # Science topic definitions (30 files)
│           ├── icse-class{1-5}-science-topics.json
│           ├── icse-class{6-12}-physics-topics.json
│           ├── icse-class{6-12}-chemistry-topics.json
│           └── icse-class{6-12}-biology-topics.json
│
├── .github/workflows/ci.yml             # CI/CD pipeline
├── ROADMAP.md                           # Full development roadmap
└── PROMPT_REMAINING_PHASES.md           # This file
```

### Existing ICSE Data File Counts
```
Maths:     class1: 24  class2: 23  class3: 29  class4: 15  class5: 32  class6: 26  class7: 25  class8: 22  class9: 29  class10: 25  class11: 16  class12: 11
Science:   class1-science: 10  class2-science: 10  class3-science: 10  class4-science: 12  class5-science: 14
Physics:   class6: 8  class7: 10  class8: 15  class9: 12  class10: 13  class11: 11  class12: 10
Chemistry: class6: 8  class7: 10  class8: 11  class9: 12  class10: 14  class11: 14  class12: 16
Biology:   class6: 9  class7: 11  class8: 9   class9: 13  class10: 14  class11: 22  class12: 16
Total: ~591 question files across all subjects
```

---

## Data Formats (CRITICAL — follow exactly)

### 1. CAM File Format

**Location**: `cam/data/{board}-class{N}-{subject}-cam.json`
**Example**: `cam/data/icse-class5-mathematics-cam.json`

```json
{
  "version": "1.0.0",
  "board": "ICSE",
  "class": 5,
  "subject": "Mathematics",
  "academic_year": "2025-2026",
  "themes": [
    {
      "theme_id": "T01",
      "theme_name": "Numbers",
      "theme_order": 1,
      "topics": [
        {
          "topic_id": "T01.01",
          "topic_name": "Place Value and Number Sense",
          "topic_order": 1,
          "concepts": [
            {
              "concept_id": "T01.01.C01",
              "concept_name": "Understanding place value up to ten lakhs (1,000,000)",
              "difficulty_levels": ["familiarity", "application", "exam_style"]
            },
            {
              "concept_id": "T01.01.C02",
              "concept_name": "Reading and writing numbers in Indian and international systems",
              "difficulty_levels": ["familiarity", "application", "exam_style"]
            }
          ],
          "boundaries": {
            "in_scope": [
              "Numbers up to 10,00,000 (ten lakhs)",
              "Indian place value system",
              "International place value system",
              "Comparing numbers using < > =",
              "Ascending and descending order"
            ],
            "out_of_scope": [
              "Numbers beyond ten lakhs (crores)",
              "Scientific notation",
              "Binary or other number systems"
            ],
            "numeric_limits": {
              "max_value": 1000000,
              "max_digits": 7
            }
          }
        }
      ]
    }
  ],
  "metadata": {
    "created_at": "2025-02-10",
    "source": "ICSE Board Syllabus 2025-2026",
    "status": "validated"
  }
}
```

**Schema rules** (from `cam/schema/cam-schema.json`):
- `theme_id` pattern: `^T\d{2}$` (e.g., T01, T02, T15)
- `topic_id` pattern: `^T\d{2}\.\d{2}$` (e.g., T01.01, T03.02)
- `concept_id` pattern: `^T\d{2}\.\d{2}\.C\d{2}$` (e.g., T01.01.C01)
- `difficulty_levels` enum: `["familiarity", "application", "exam_style"]`
- `metadata.status` enum: `["draft", "validated", "locked"]`
- **Current schema constraints that MUST be updated**: board enum is `["ICSE"]` only, class max is `10`, subject enum is `["Mathematics"]` only

### 2. Mathematics Question File Format

**Location**: `questions/data/class{N}/T{theme}.{topic}-{slug}.json` (ICSE) or `questions/data/cbse-class{N}/T{theme}.{topic}-{slug}.json` (CBSE)

```json
{
  "version": "1.0.0",
  "cam_reference": {
    "cam_version": "1.0.0",
    "board": "ICSE",
    "class": 5,
    "subject": "Mathematics"
  },
  "topic_id": "T01.01",
  "topic_name": "Place Value and Number Sense",
  "canonical_explanation": {
    "text": "Place value tells us the value of each digit based on its position in a number. In the Indian system, we use ones, tens, hundreds, thousands, ten thousands, lakhs, and ten lakhs. Each position is 10 times the value of the position to its right.",
    "rules": [
      "Place value = Face value × Position value",
      "Face value is the digit itself",
      "Indian system uses commas after 3 digits from right, then every 2 digits",
      "International system uses commas every 3 digits from right"
    ]
  },
  "questions": [
    {
      "question_id": "T01.01.Q001",
      "concept_id": "T01.01.C01",
      "difficulty": "familiarity",
      "type": "mcq",
      "question_text": "What is the place value of 5 in the number 5,43,210?",
      "options": [
        { "id": "A", "text": "5" },
        { "id": "B", "text": "5,000" },
        { "id": "C", "text": "50,000" },
        { "id": "D", "text": "5,00,000" }
      ],
      "correct_answer": "D",
      "hint": "Count positions from right: ones, tens, hundreds...",
      "explanation_correct": "The place value of 5 in 5,43,210 is 5,00,000. The 5 is in the lakhs place.",
      "explanation_incorrect": "The 5 is not in the ones, thousands, or ten-thousands place. Count from the right: 0=ones, 1=tens, 2=hundreds, 3=thousands, 4=ten-thousands, 5=lakhs."
    }
  ]
}
```

### 3. Science Question File Format

**Location**: `questions/data/class{N}-{subject}/T{theme}.{topic}-{slug}.json`

Same JSON structure as maths questions, but `cam_reference.subject` is `"Science"`, `"Physics"`, `"Chemistry"`, or `"Biology"`.

### 4. Science Topic Definition File Format

**Location**: `cam/data/topics/icse-class{N}-{subject}-topics.json`
**Used by**: `seed-science.ts` to create themes/topics/concepts in DB before seeding questions.
**Naming convention**: `icse-class{N}-{subject}-topics.json` (e.g., `icse-class5-science-topics.json`, `icse-class8-physics-topics.json`)

```json
[
  {
    "id": "T01.01",
    "name": "Human Body - Nervous System and Sense Organs",
    "concepts": [
      {
        "concept_id": "T01.01.C01",
        "concept_name": "Need for the nervous system",
        "difficulty_levels": ["familiarity", "application", "exam_style"]
      },
      {
        "concept_id": "T01.01.C02",
        "concept_name": "Parts of the nervous system: brain, spinal cord, nerves",
        "difficulty_levels": ["familiarity", "application", "exam_style"]
      }
    ],
    "boundaries": {
      "in_scope": [
        "Introduction to the nervous system",
        "Brain as the control centre",
        "Five sense organs: eyes, ears, nose, tongue, skin"
      ],
      "out_of_scope": [
        "Neuron structure and function - Introduced in Class 8",
        "Reflex arc details - Introduced in Class 8"
      ]
    }
  }
]
```

**Important**: This is an array of topic objects (NOT the full CAM structure). The `seed-science.ts` script wraps these into a single "T01" theme per subject automatically.

### Question Types Reference
| Type | Fields | Example |
|------|--------|---------|
| `mcq` | `options[]` (A/B/C/D), `correct_answer` (single letter) | Standard multiple choice |
| `true_false` | `options` [{id:"A",text:"True"},{id:"B",text:"False"}], `correct_answer` | True/False |
| `fill_blank` | `question_text` with `___`, `correct_answer` (string) | Fill in the blank |
| `ordering` | `ordering_items[]` (strings in correct order), `correct_answer` (array) | Arrange in sequence |
| `matching` | `match_pairs[]` ({left, right}), `correct_answer` (match_pairs) | Match columns |

### Difficulty Levels
| Level | Description | Target % per topic |
|-------|-------------|-------------------|
| `familiarity` | Direct recall, definitions, basic identification | ~40% of questions |
| `application` | Apply concepts, multi-step problems, word problems | ~35% of questions |
| `exam_style` | Board exam level, complex scenarios, multi-concept | ~25% of questions |

---

## Database Schema (already supports multi-board)

```sql
-- curricula table (supports CBSE already)
CREATE TABLE curricula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board VARCHAR(30) NOT NULL,              -- 'ICSE', 'CBSE'
    class_level INTEGER NOT NULL,            -- 1-12
    subject VARCHAR(50) NOT NULL,            -- 'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Social Studies'
    academic_year VARCHAR(20),
    cam_version VARCHAR(20),
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(board, class_level, subject)
);

-- All child tables reference curriculum_id → fully isolated per board
-- themes → topics → concepts → questions (all have curriculum_id FK)
-- question_flags, quiz_sessions, topic_progress, concept_progress → all have curriculum_id
```

### Key: CBSE and ICSE data are fully isolated via `curriculum_id`. Adding CBSE data is purely additive — no ICSE data needs to change.

---

## Seed Scripts — How They Work

### `coolscool-backend/scripts/seed-all-classes.ts` (Mathematics)
- **Input**: CAM file from `cam/data/icse-class{N}-mathematics-cam.json` + questions from `questions/data/class{N}/T*.json`
- **Process**: Upserts curriculum → themes → topics → concepts → canonical_explanations → questions (all in a transaction)
- **Board path**: Currently hardcoded to `icse-class{N}` — **must be updated to accept `--board cbse` flag**
- **Usage**: `npx tsx scripts/seed-all-classes.ts` (all classes) or `npx tsx scripts/seed-all-classes.ts 7` (single class)

### `coolscool-backend/scripts/seed-science.ts` (Science subjects)
- **Input**: Topic defs from `cam/data/topics/icse-class{N}-{subject}-topics.json` + questions from `questions/data/class{N}-{subject}/T*.json`
- **Process**: Upserts curriculum → creates single "T01" theme → topics → concepts → questions
- **Subject config**: Science (1-5), Physics (6-12), Chemistry (6-12), Biology (6-12)
- **Board**: Hardcoded `'ICSE'` on line 152 and display name on line 162 — **must be parameterized**
- **Usage**: `npx tsx scripts/seed-science.ts` or `npx tsx scripts/seed-science.ts --class 8 --subject Physics`

### Required seed script changes for CBSE:
1. Add `--board` CLI flag (default: `icse`)
2. For maths: change CAM path to `cam/data/{board}-class{N}-mathematics-cam.json` and questions path to `questions/data/{board}-class{N}/` (where `board=icse` keeps backward compat as `class{N}` and `board=cbse` uses `cbse-class{N}`)
3. For science: change topic file path to `cam/data/topics/cbse-class{N}-{subject}-topics.json` and question path to `questions/data/cbse-class{N}-{subject}/`, parameterize the board string in DB inserts

---

## CAM Schema Changes Needed (do once before Phase 5)

File: `cam/schema/cam-schema.json`

| Field | Current | Needed |
|-------|---------|--------|
| `board.enum` | `["ICSE"]` | `["ICSE", "CBSE"]` |
| `class.maximum` | `10` | `12` |
| `subject.enum` | `["Mathematics"]` | `["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Civics"]` |

---

## REMAINING PHASES

---

## Phase 5: CBSE Board Curriculum

**Estimated scope**: ~36 CAM files, ~500+ question files, ~25,000 questions
**API cost**: ~$8-10 total (for explanation generation via Haiku — **requires approval per sub-phase**)

Full CBSE curriculum for Classes 1-12, NCERT-aligned.

### Sub-phase 5A: CBSE Classes 1-5 (Maths + Science)

**Scope**: 10 CAM files + ~160 question files + ~8,000 questions
**API cost for explanations**: ~$2.50 (requires approval)

| Class | Maths topics (est.) | Science topics (est.) |
|-------|--------------------|-----------------------|
| 1 | ~12 (Shapes, Numbers to 20, Addition, Subtraction, Patterns) | ~5 (My Body, Plants, Animals, Food, Weather) |
| 2 | ~14 (Numbers to 100, Addition/Sub, Multiplication intro, Shapes, Measurement) | ~6 (Living/Non-living, Water, Air, Plants, Animals, Shelter) |
| 3 | ~16 (Numbers to 1000, Multiplication, Division, Fractions intro, Money, Time) | ~7 (Food, Shelter, Water, Birds, Plants, Animals, Our Environment) |
| 4 | ~18 (Large Numbers, Operations, Fractions, Decimals intro, Geometry, Data) | ~8 (Digestive System, Teeth, Plants, Animals, Food, Water, Weather) |
| 5 | ~20 (Large Numbers, Fractions, Decimals, Geometry, Measurement, Data) | ~10 (Body Systems, Cells, Plants, Food, Water, Soil, Environment, Weather) |

**Content guide**: NCERT textbooks for Classes 1-5 ("Math-Magic", "Looking Around" → "Environmental Studies")

**File outputs**:
- CAM files: `cam/data/cbse-class{1-5}-mathematics-cam.json` + `cam/data/cbse-class{1-5}-science-cam.json`
- Questions: `questions/data/cbse-class{1-5}/T*.json` + `questions/data/cbse-class{1-5}-science/T*.json`
- Topic defs: `cam/data/topics/cbse-class{1-5}-science-topics.json`

### Sub-phase 5B: CBSE Classes 6-10 (Maths + Physics + Chemistry + Biology)

**Scope**: 20 CAM files + ~250 question files + ~12,000 questions
**API cost for explanations**: ~$4.00 (requires approval)

| Class | Maths | Physics | Chemistry | Biology |
|-------|-------|---------|-----------|---------|
| 6 | ~15 topics | ~6 topics | ~6 topics | ~6 topics |
| 7 | ~15 topics | ~8 topics | ~7 topics | ~7 topics |
| 8 | ~16 topics | ~10 topics | ~8 topics | ~8 topics |
| 9 | ~16 topics | ~10 topics | ~8 topics | ~10 topics |
| 10 | ~16 topics | ~10 topics | ~10 topics | ~10 topics |

**Content guide**: NCERT textbooks (Maths, Science split into Physics/Chemistry/Biology from Class 6)

**File outputs**:
- CAM: `cam/data/cbse-class{6-10}-{subject}-cam.json`
- Questions: `questions/data/cbse-class{6-10}/T*.json` (maths) + `questions/data/cbse-class{6-10}-{subject}/T*.json`
- Topic defs: `cam/data/topics/cbse-class{6-10}-{subject}-topics.json`

### Sub-phase 5C: CBSE Classes 11-12 (Maths + Physics + Chemistry + Biology)

**Scope**: 8 CAM files + ~90 question files + ~5,800 questions
**API cost for explanations**: ~$2.00 (requires approval)

**Content guide**: NCERT textbooks (Class 11-12 are board exam classes — questions should match CBSE exam pattern)

**File outputs**:
- CAM: `cam/data/cbse-class{11-12}-{subject}-cam.json`
- Questions: `questions/data/cbse-class{11-12}/T*.json` (maths) + `questions/data/cbse-class{11-12}-{subject}/T*.json`
- Topic defs: `cam/data/topics/cbse-class{11-12}-{subject}-topics.json`

### Phase 5 Pre-work (do once before 5A)
1. Update `cam/schema/cam-schema.json`: Add "CBSE" to board enum, set class max to 12, add Science/Physics/Chemistry/Biology to subject enum
2. Update `seed-all-classes.ts` to accept `--board cbse|icse` flag
3. Update `seed-science.ts` to accept `--board cbse|icse` flag
4. Create directory structure for CBSE question files

---

## Phase 6: English Subject (ICSE)

**Estimated scope**: 12 CAM files, ~120 question files, ~6,000 questions
**API cost**: ~$2-3 (for explanation generation — **requires approval**)

Add ICSE English for Classes 1-12.

### Topics by Class Range
| Classes | Topics |
|---------|--------|
| 1-2 | Alphabet, Phonics, Sight Words, Simple Sentences, Picture Reading, Rhyming Words |
| 3-4 | Grammar Basics (Nouns, Verbs, Adjectives), Sentence Formation, Synonyms/Antonyms, Comprehension (short passages), Punctuation |
| 5-6 | Tenses (Present/Past/Future), Parts of Speech, Comprehension (medium passages), Vocabulary Building, Letter Writing |
| 7-8 | Advanced Tenses, Active/Passive Voice, Direct/Indirect Speech, Idioms & Phrases, Essay Writing, Comprehension (long passages), Poetry Appreciation |
| 9-10 | Complex Grammar, Transformation of Sentences, Figures of Speech, Précis Writing, Composition, Board Exam Comprehension |
| 11-12 | Advanced Composition, Critical Reading, Rhetoric, Literary Devices, Advanced Comprehension |

### Question Types for English
| Type | Usage |
|------|-------|
| `mcq` | Grammar rules, vocabulary, comprehension (primary type) |
| `fill_blank` | Cloze passages, grammar exercises (tenses, prepositions) |
| `true_false` | Grammar rules validation |
| `ordering` | Sentence rearrangement, paragraph ordering |
| `matching` | Synonyms↔Antonyms, Idioms↔Meanings |

### File Outputs
- CAM: `cam/data/icse-class{1-12}-english-cam.json`
- Questions: `questions/data/class{1-12}-english/T*.json`
- Topic defs: `cam/data/topics/icse-class{N}-english-topics.json`
- Schema: Add "English" to subject enum in cam-schema.json (if not already done in Phase 5)

---

## Phase 7: Social Studies Subject (ICSE)

**Estimated scope**: 12 CAM files, ~120 question files, ~6,000 questions
**API cost**: ~$2-3 (for explanation generation — **requires approval**)

Add ICSE Social Studies for Classes 1-12. Social Studies splits into History, Geography, and Civics in higher classes.

### Topics by Class Range
| Classes | Sub-subjects | Topics |
|---------|-------------|--------|
| 1-3 | Social Studies (combined) | My Family, My School, My Neighbourhood, Our Country, Festivals, Community Helpers, Transport, Communication |
| 4-5 | Social Studies (combined) | India: States & Capitals, Maps, Our Earth, Natural Resources, Freedom Fighters, Government, Cultural Heritage |
| 6-8 | History + Geography + Civics | History: Ancient India, Medieval India, Modern India. Geography: Earth, Climate, Natural Resources, Agriculture. Civics: Constitution, Government, Rights & Duties |
| 9-10 | History + Geography + Civics | History: World Wars, Indian Independence, Post-Independence India. Geography: India Physical/Climate, Resources, Industries. Civics: Democracy, Judiciary, International Relations |
| 11-12 | History + Geography + Political Science | Advanced topics for board exams |

### Question Types for Social Studies
| Type | Usage |
|------|-------|
| `mcq` | Primary type — facts, dates, concepts, map-based |
| `true_false` | Historical facts, geographical features |
| `fill_blank` | Names, dates, places, definitions |
| `matching` | Events↔Dates, Countries↔Capitals, Leaders↔Movements |
| `ordering` | Chronological ordering of events |

### File Outputs
- CAM: `cam/data/icse-class{1-12}-social-studies-cam.json` (or split into `history`, `geography`, `civics` for Classes 6+)
- Questions: `questions/data/class{1-12}-social-studies/T*.json`
- Topic defs: `cam/data/topics/icse-class{N}-social-studies-topics.json`
- Schema: Add "Social Studies" (or "History"/"Geography"/"Civics") to subject enum

---

## Agent Strategy (CRITICAL — maximize parallelism)

### For Content Phases (5, 6, 7) — use agent teams extensively

**Pattern for each sub-phase**:
1. **Plan phase**: Read ICSE templates, present plan, wait for approval
2. **Pre-work agents** (if schema/script changes needed): 1-2 agents for one-time infra changes
3. **CAM creation agents**: Launch **one agent per class×subject** in parallel (e.g., 10 agents for sub-phase 5A)
4. **Question creation agents**: Launch **one agent per class×subject** in parallel. Each agent creates all topic question files for its class×subject.
5. **Verification agent**: After all content agents finish, one agent validates JSON format, checks question counts, verifies no duplicate IDs
6. **Seed + commit**: Run seed scripts, commit, push

### Example: Sub-phase 5A agent layout
```
Parallel wave 1 (CAM + Questions per class×subject):
  Agent 1:  CBSE Class 1 Maths    → CAM + all question files
  Agent 2:  CBSE Class 1 Science   → CAM + topic defs + all question files
  Agent 3:  CBSE Class 2 Maths    → CAM + all question files
  Agent 4:  CBSE Class 2 Science   → ...
  Agent 5:  CBSE Class 3 Maths    → ...
  Agent 6:  CBSE Class 3 Science   → ...
  Agent 7:  CBSE Class 4 Maths    → ...
  Agent 8:  CBSE Class 4 Science   → ...
  Agent 9:  CBSE Class 5 Maths    → ...
  Agent 10: CBSE Class 5 Science   → ...

After all complete:
  Agent 11: Validate all JSON, check counts, report summary
  Then: seed scripts + git commit + push
```

### For each agent creating questions:
- Read an ICSE question file of the same class level as a quality/format reference
- Read the CAM file the agent just created (or was created by a parallel agent)
- Generate ~50 questions per topic, spread across difficulty levels
- Include `canonical_explanation`, `explanation_correct`, `explanation_incorrect` for every question
- Use the exact JSON structure shown in the Data Formats section above

---

## Non-Negotiable Rules

1. **Phase-by-phase approval**: Before implementing ANY phase or sub-phase, show a summary of what will be done and wait for explicit "go ahead". This includes sub-phases 5A/5B/5C individually.
2. **Cost approval**: Any API usage (Haiku for explanation generation, or any other paid API) **MUST** get explicit cost approval with an estimate BEFORE execution. Do NOT call any paid APIs without approval. If the user says "skip explanations" or "do it without API", generate explanations inline instead.
3. **Parallel agents**: Use multiple agents extensively. CAM + question generation for different classes are independent — run them in parallel. Launch as many agents as the system allows.
4. **Commit after each sub-phase**: Commit and push after each sub-phase (5A, 5B, 5C, 6, 7). Each commit should have a descriptive message showing what was added (counts of files, questions, etc.).
5. **Don't break existing functionality**: ICSE data must remain untouched. All new data is additive. Don't modify existing question files, CAM files, or seed scripts in ways that break ICSE seeding.
6. **Follow existing patterns exactly**: Match the exact JSON structure of existing files. Use the same field names, ID patterns, and conventions.
7. **Curriculum alignment**: CBSE content must follow NCERT syllabus. ICSE English/Social Studies must follow ICSE board syllabus. Questions must be grade-appropriate.
8. **Quality**: Every question must have `explanation_correct` and `explanation_incorrect`. Questions must be factually correct, unambiguous, with exactly one correct answer. Difficulty distribution: ~40% familiarity, ~35% application, ~25% exam_style.
9. **No duplicate IDs**: Question IDs must be unique within each topic file. Follow the pattern `T{theme}.{topic}.Q{NNN}` (e.g., T01.01.Q001 through T01.01.Q050).
10. **Science subject split**: Classes 1-5 use "Science" as a single subject. Classes 6-12 split into "Physics", "Chemistry", "Biology" as separate subjects.

---

## Common Gotchas (learned from Phases 1-4)

| Issue | Fix |
|-------|-----|
| Backend `noUncheckedIndexedAccess` is ON | Record indexing returns `T \| undefined` — use named exports or non-null assertions where safe |
| `@types/jsonwebtoken` v9+ | `expiresIn` type changed — use `as any` cast or explicit `SignOptions` |
| ts-jest NodeNext warning (TS151002) | `diagnostics: { ignoreDiagnostics: [151002] }` in jest.config transform options |
| Service argument order | Usually `(userId, sessionId)` NOT `(sessionId, userId)` — always check the actual service export |
| Module name mapping | jest.config uses `moduleNameMapper` to strip `.js` extensions from imports |
| `curriculum.model` exports | `getDefault` not `getDefaultCurriculum` |
| `session.service` exports | `getSessionSummary` not `getSessionForUserSummary` |
| `flag.service` exports | `createFlag` not `submitFlag` |
| Windows path quoting | Use `cd "D:\CoolSCool"` (with quotes) in bash commands |
| Seed script paths | `seed-all-classes.ts` resolves CAM relative to `__dirname/../../cam/data/` |
| Science topic files | Located in `cam/data/topics/` (e.g., `icse-class5-science-topics.json`) |
| Science seeder board | Hardcoded `'ICSE'` on line 152+162 of `seed-science.ts` — must parameterize |

---

## Summary of All Remaining Work

| Phase | Sub-phase | Scope | API Cost | Commit |
|-------|-----------|-------|----------|--------|
| **5** | Pre-work | Schema + seed script updates | $0 | With 5A |
| **5A** | CBSE Classes 1-5 Maths+Science | ~8,000 questions | ~$2.50 | Separate |
| **5B** | CBSE Classes 6-10 Maths+Phys+Chem+Bio | ~12,000 questions | ~$4.00 | Separate |
| **5C** | CBSE Classes 11-12 Maths+Phys+Chem+Bio | ~5,800 questions | ~$2.00 | Separate |
| **6** | ICSE English Classes 1-12 | ~6,000 questions | ~$2-3 | Separate |
| **7** | ICSE Social Studies Classes 1-12 | ~6,000 questions | ~$2-3 | Separate |
| **Total** | | ~37,800 questions | ~$12-16 | 6 commits |

---

## How to Start

1. Read this entire prompt carefully
2. Read `ROADMAP.md` for the full roadmap context
3. Read one ICSE CAM file as template: `cam/data/icse-class5-mathematics-cam.json`
4. Read one ICSE maths question file as template: `questions/data/class5/T01.01-place-value-number-sense.json`
5. Read one ICSE science question file as template: `questions/data/class5-science/T01.01-human-body-nervous-system-sense-organs.json`
6. Read one science topic def file as template: `cam/data/topics/icse-class5-science-topics.json`
7. Read the seed scripts: `coolscool-backend/scripts/seed-all-classes.ts` and `coolscool-backend/scripts/seed-science.ts`
8. Read `cam/schema/cam-schema.json` for current schema constraints
9. **Present your plan for Phase 5 Pre-work + Sub-phase 5A and wait for explicit approval before implementing**
