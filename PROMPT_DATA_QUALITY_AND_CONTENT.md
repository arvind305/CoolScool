# Cool S-Cool — Data Quality Fixes + New Content Implementation Prompt

## What This Prompt Is

This is a complete handoff prompt for four work items, to be done **in order**:

1. **Step A**: Fix 1,242 MCQ questions with fewer than 4 options (add plausible distractors)
2. **Step B**: Fix 14 questions missing explanations
3. **Step C**: Create CBSE English + Social Studies content (Classes 1-12)
4. **Step D**: Feature work — Parent dashboard enhancements, gamification, performance

---

## Project Overview

**Cool S-Cool** is an adaptive learning quiz app for Indian school students (Classes 1-12, ICSE + CBSE boards).

**Repository**: github.com/arvind305/CoolScool
**Working directory**: `D:\CoolSCool`
**Platform**: Windows (use `cd "D:\CoolSCool"` with quotes in bash)

### Monorepo Structure
```
D:\CoolSCool\
├── coolscool-backend/          # Express 4 + PostgreSQL (Neon)
├── coolscool-web/              # Next.js 16 + React 19
├── cam/                        # Curriculum Authority Model (CAM) files + schema
│   ├── schema/cam-schema.json
│   └── data/                   # {board}-class{N}-{subject}-cam.json
├── questions/data/             # Question bank JSON files (~62,685 questions)
│   ├── class{1-12}/            # ICSE Maths
│   ├── class{1-5}-science/     # ICSE Science
│   ├── class{6-12}-{physics|chemistry|biology}/  # ICSE Science split
│   ├── cbse-class{1-12}/       # CBSE Maths
│   ├── cbse-class{1-5}-evs/    # CBSE EVS
│   └── cbse-class{6-12}-{physics|chemistry|biology}/  # CBSE Science
├── docs/                       # Documentation
├── ROADMAP.md                  # Full development roadmap
└── PROMPT_REMAINING_PHASES.md  # Phases 5-7 handoff prompt
```

### Current Database Stats
- **76 curricula** (38 ICSE + 38 CBSE)
- **62,683 questions** seeded
- Subjects: Mathematics, Science/EVS, Physics, Chemistry, Biology

### Seed Scripts
- `coolscool-backend/scripts/seed-all-classes.ts` — ICSE Maths (accepts `--board cbse`)
- `coolscool-backend/scripts/seed-science.ts` — ICSE/CBSE Science subjects
- `coolscool-backend/scripts/seed-cbse-all.ts` — All CBSE content in one script
- All use batched multi-row INSERT with ON CONFLICT upserts (100 questions per batch)

---

## STEP A: Fix MCQ Questions with Fewer Than 4 Options

### Problem

1,242 MCQ questions have only 2 or 3 options instead of the required 4 (A, B, C, D). The frontend renders 4-option grids, so 2-3 option questions look broken.

- **499 questions with 2 options** (binary choice — need 2 more options added)
- **743 questions with 3 options** (need 1 more option added)

### Affected Directories (ICSE Maths only — CBSE and Science are clean)

| Directory | 2-option | 3-option | Total | Heaviest Files |
|-----------|----------|----------|-------|----------------|
| class1 | 86 | 138 | 224 | T04.03-patterns-with-shapes.json (24), T07.02-shape-and-color-patterns.json (24) |
| class2 | 97 | 109 | 206 | T01.03-number-line-and-skip-counting.json (19), T01.04-even-and-odd-numbers.json (20), T03.01-basic-geometrical-concepts.json (24) |
| class3 | 64 | 87 | 151 | T02.04-division.json (16) |
| class4 | 27 | 71 | 98 | T05.01-measurement-length-mass-capacity.json (25) |
| class5 | 0 | 4 | 4 | T07.04-time.json (4) |
| class6 | 100 | 134 | 234 | T04.03-triangles.json (30) |
| class7 | 24 | 39 | 63 | Multiple files |
| class8 | 16 | 19 | 35 | Multiple files |
| class9 | 36 | 54 | 90 | Multiple files |
| class10 | 48 | 88 | 136 | Multiple files |
| cbse-class4 | 1 | 0 | 1 | Minor |

### Example: 2-Option MCQ (NEEDS FIX)
```json
{
  "question_id": "T01.01.Q059",
  "type": "mcq",
  "concept_id": "T01.01.C01",
  "difficulty": "familiarity",
  "cognitive_level": "recall",
  "question_text": "What size is Elephant?",
  "options": [
    { "id": "A", "text": "Big" },
    { "id": "B", "text": "Small" }
  ],
  "correct_answer": "A",
  "explanation_correct": "Elephants are big animals...",
  "explanation_incorrect": "Elephants are not small animals..."
}
```

**Should become** (add 2 plausible distractors):
```json
{
  "options": [
    { "id": "A", "text": "Big" },
    { "id": "B", "text": "Small" },
    { "id": "C", "text": "Tiny" },
    { "id": "D", "text": "Medium" }
  ]
}
```

### Example: 3-Option MCQ (NEEDS FIX)
```json
{
  "question_id": "T01.01.Q071",
  "type": "mcq",
  "concept_id": "T01.01.C02",
  "difficulty": "application",
  "cognitive_level": "classify",
  "question_text": "Which group does 'Red things together' belong to?",
  "options": [
    { "id": "A", "text": "Color" },
    { "id": "B", "text": "Size" },
    { "id": "C", "text": "Shape" }
  ],
  "correct_answer": "A"
}
```

**Should become** (add 1 plausible distractor):
```json
{
  "options": [
    { "id": "A", "text": "Color" },
    { "id": "B", "text": "Size" },
    { "id": "C", "text": "Shape" },
    { "id": "D", "text": "Weight" }
  ]
}
```

### Example: Well-Formed 4-Option MCQ (REFERENCE)
```json
{
  "question_id": "T01.01.Q001",
  "type": "mcq",
  "concept_id": "T01.01.C01",
  "difficulty": "familiarity",
  "cognitive_level": "recall",
  "question_text": "Which of these is RED?",
  "options": [
    { "id": "A", "text": "A strawberry" },
    { "id": "B", "text": "A banana" },
    { "id": "C", "text": "A leaf" },
    { "id": "D", "text": "An orange" }
  ],
  "correct_answer": "A",
  "explanation_correct": "A strawberry is the correct answer because strawberries are red.",
  "explanation_incorrect": "Bananas are yellow, leaves are green, and oranges are orange — none are red."
}
```

### Rules for Adding Distractors

1. **Keep the correct_answer unchanged** — only add new wrong options
2. **Existing option IDs stay the same** — add C/D (for 2-option) or D (for 3-option)
3. **Distractors must be plausible** — common misconceptions, adjacent values, similar concepts
4. **Match format** — new options should match the text style/length of existing options
5. **Grade-appropriate** — Class 1 distractors should be simple words; Class 10 should be math expressions
6. **No duplicate options** — each option must be distinct
7. **Update explanation_incorrect if needed** — if it references only the original wrong options, expand it to cover the new ones too

### Implementation Strategy

1. **Use parallel agents** — one per directory (class1 through class10 + cbse-class4)
2. Each agent:
   - Reads every JSON file in its directory
   - Finds MCQ questions with `options.length < 4`
   - Adds plausible distractor option(s) to reach exactly 4
   - Writes the fixed JSON file back
3. After all agents complete, **verify**: run a grep/count to confirm zero MCQs with <4 options remain
4. **Re-seed the database**: Run the seed scripts to push fixed data to production
   ```bash
   cd "D:\CoolSCool\coolscool-backend"
   npx tsx scripts/seed-all-classes.ts          # ICSE Maths
   npx tsx scripts/seed-cbse-all.ts             # CBSE (only 1 question affected)
   ```
5. **Commit and push**

---

## STEP B: Fix 14 Questions Missing Explanations

### Problem

14 questions across 12 files are missing both `explanation_correct` and `explanation_incorrect`.

### Exact Questions to Fix

| # | File | Question ID | Type | Question Text | Correct Answer |
|---|------|-------------|------|---------------|----------------|
| 1 | class10-chemistry/T05.01-mole-concept-and-stoichiometry.json | T05.01.Q007 | mcq | "The number of moles in 88 g of CO2 is:" | B (2) |
| 2 | class10-physics/T09.01-calorimetry.json | T09.01.Q008 | mcq | "The heat required to raise temperature of 2 kg water by 10°C is:" | B (84000 J) |
| 3 | class10/T02.06-geometric-progression.json | T02.06.Q059 | mcq | "What is the result of a = 1, r = 2?" | B (7) |
| 4 | class10/T06.01-equation-of-a-straight-line.json | T06.01.Q076 | mcq | "What is the slope of (1,1) and (3,5)?" | C (2) |
| 5 | class10/T08.01-probability-of-single-events.json | T08.01.Q060 | mcq | "Cards per suit in a standard 52-card deck?" | A (13) |
| 6 | class4/T05.02-time.json | T05.02.Q081 | mcq | "Days in June?" | D (30 days) |
| 7 | class4/T05.02-time.json | T05.02.Q089 | mcq | "Position of September in the year?" | D (9th month) |
| 8 | class6/T03.02-simple-equations.json | T03.02.Q075 | mcq | "Inverse of Addition (+)?" | B (Subtraction) |
| 9 | class7/T01.04-rational-numbers.json | T01.04.Q019 | mcq | "Standard form of -24/36?" | A (-2/3) |
| 10 | class7/T01.04-rational-numbers.json | T01.04.Q032 | ordering | "Arrange -2/5, 1/2, -3/4, 0 in descending PE order" | [1/2, 0, -2/5, -3/4] |
| 11 | class8/T05.03-circles.json | T05.03.Q062 | mcq | "Area when circumference = 56 cm? (π=22/7)" | B (2464 cm²) |
| 12 | class9-chemistry/T05.01-mole-concept-and-stoichiometry.json | T05.01.Q018 | mcq | "9 g of water = how many moles? (H=1, O=16)" | B (0.5 mol) |
| 13 | class9-physics/T04.01-gravitation.json | T04.01.Q026 | mcq | "Velocity of body dropped from 80 m (g=10)?" | B (40 m/s) |
| 14 | class9-physics/T06.01-work-energy-and-power.json | T06.01.Q053 | ordering | "Arrange positions by PE (ball falling from rest)" | [Starting, Half, Quarter, Ground] |

### Rules for Explanations

- `explanation_correct`: 1-2 sentences explaining WHY the answer is correct, with the calculation/reasoning
- `explanation_incorrect`: 1-2 sentences explaining the common mistakes and why other options are wrong
- Match the style of existing explanations in the same file
- Be factually accurate — show the math/science work

### Implementation

- Can be done in a single pass while fixing MCQ options (Step A)
- Read each file, find the question by ID, add both explanation fields
- Write the file back

---

## STEP C: CBSE English + Social Studies Content

### Scope

Create complete CBSE English and Social Studies curricula for Classes 1-12:
- **~24 CAM files** (12 English + 12 Social Studies)
- **~240 question files** (~120 English + ~120 Social Studies)
- **~24,000 questions** (~12,000 per subject)
- **API cost: $0** (generate all explanations inline)

### English Topics by Class Range

| Classes | Topics |
|---------|--------|
| 1-2 | Alphabet, Phonics, Sight Words, Simple Sentences, Picture Reading, Rhyming Words |
| 3-4 | Grammar Basics (Nouns, Verbs, Adjectives), Sentence Formation, Synonyms/Antonyms, Comprehension (short passages), Punctuation |
| 5-6 | Tenses (Present/Past/Future), Parts of Speech, Comprehension (medium passages), Vocabulary Building, Letter Writing |
| 7-8 | Advanced Tenses, Active/Passive Voice, Direct/Indirect Speech, Idioms & Phrases, Essay Writing, Comprehension, Poetry |
| 9-10 | Complex Grammar, Transformation of Sentences, Figures of Speech, Précis Writing, Board Exam Comprehension |
| 11-12 | Advanced Composition, Critical Reading, Rhetoric, Literary Devices, Advanced Comprehension |

### Social Studies Topics by Class Range

| Classes | Sub-subjects | Topics |
|---------|-------------|--------|
| 1-3 | Social Studies (combined) | My Family, School, Neighbourhood, Country, Festivals, Community Helpers, Transport |
| 4-5 | Social Studies (combined) | India: States & Capitals, Maps, Our Earth, Natural Resources, Freedom Fighters, Government |
| 6-8 | History + Geography + Civics | Ancient/Medieval/Modern India, Earth/Climate/Resources, Constitution/Government/Rights |
| 9-10 | History + Geography + Civics | World Wars, Independence, Post-Independence, India Physical/Climate, Democracy, Judiciary |
| 11-12 | History + Geography + Political Science | Advanced topics for board exams |

### Question Types for English
| Type | Usage |
|------|-------|
| `mcq` | Grammar rules, vocabulary, comprehension (primary type ~60%) |
| `fill_blank` | Cloze passages, grammar exercises (tenses, prepositions) (~20%) |
| `true_false` | Grammar rules validation (~10%) |
| `ordering` | Sentence rearrangement, paragraph ordering (~5%) |
| `matching` | Synonyms↔Antonyms, Idioms↔Meanings (~5%) |

### Question Types for Social Studies
| Type | Usage |
|------|-------|
| `mcq` | Primary type — facts, dates, concepts (~65%) |
| `true_false` | Historical facts, geographical features (~15%) |
| `fill_blank` | Names, dates, places, definitions (~10%) |
| `ordering` | Chronological ordering of events (~5%) |
| `matching` | Events↔Dates, Countries↔Capitals (~5%) |

### File Output Paths

**English:**
- CAM: `cam/data/cbse-class{1-12}-english-cam.json`
- Topic defs: `cam/data/topics/cbse-class{1-12}-english-topics.json`
- Questions: `questions/data/cbse-class{1-12}-english/T{theme}.{topic}-{slug}.json`

**Social Studies:**
- CAM: `cam/data/cbse-class{1-12}-social-studies-cam.json`
- Topic defs: `cam/data/topics/cbse-class{1-12}-social-studies-topics.json`
- Questions: `questions/data/cbse-class{1-12}-social-studies/T{theme}.{topic}-{slug}.json`

### Data Format Reference

Follow the exact same JSON formats as existing CBSE content. See `PROMPT_REMAINING_PHASES.md` for complete format specifications including:
- CAM file structure (themes → topics → concepts)
- Question file structure (cam_reference, canonical_explanation, questions array)
- Topic definition file structure (array of topic objects)
- ID patterns: `T{theme_id}.{topic_id}.Q{NNN}` and `T{theme_id}.{topic_id}.C{NN}`

### Quality Requirements
- Every question MUST have `explanation_correct` and `explanation_incorrect`
- All MCQs MUST have exactly 4 options (A, B, C, D)
- true_false correct_answer MUST be "A" (True) or "B" (False)
- Difficulty distribution: ~40% familiarity, ~35% application, ~25% exam_style
- ~50 questions per topic file
- Content must follow CBSE/NCERT syllabus

### Implementation Strategy

1. **Update CAM schema** (if needed): Ensure "English" and "Social Studies" are in subject enum
2. **Create content in parallel**: Launch agents per class × subject
   - Each agent creates CAM file + topic definitions + all question files for one class × one subject
3. **Verify**: Validate JSON format, check counts, verify no duplicate IDs
4. **Seed into database**:
   ```bash
   cd "D:\CoolSCool\coolscool-backend"
   # Either add to seed-cbse-all.ts or create a new seed script
   # English and Social Studies need entries in the curricula loop
   ```
5. **Commit and push**

### Seed Script Updates Needed

`seed-cbse-all.ts` needs new sections added to `main()`:

```typescript
// English: Classes 1-12
for (let cls = 1; cls <= 12; cls++) {
  curricula.push({
    camFile: path.join(rootDir, `cam/data/cbse-class${cls}-english-cam.json`),
    questionsDir: path.join(rootDir, `questions/data/cbse-class${cls}-english`),
  });
}

// Social Studies: Classes 1-12
for (let cls = 1; cls <= 12; cls++) {
  curricula.push({
    camFile: path.join(rootDir, `cam/data/cbse-class${cls}-social-studies-cam.json`),
    questionsDir: path.join(rootDir, `questions/data/cbse-class${cls}-social-studies`),
  });
}
```

---

## STEP D: Feature Work

### D1. Parent Dashboard Enhancements

**Current state**: Parents can view their linked children's basic progress.

**Enhancements**:
- Per-child weekly summary view (sessions, accuracy, time spent, topics covered)
- Subject-wise comparison charts (which subjects are strong/weak)
- "Areas of concern" section — topics where accuracy is declining or consistently low
- Session timeline with detailed drill-down per session
- Notification preferences (email digest: daily/weekly/off)

**Files to modify**:
- `coolscool-backend/src/services/analytics.service.ts` — new parent-specific queries
- `coolscool-backend/src/controllers/progress.controller.ts` — new endpoints
- `coolscool-web/src/app/(protected)/parent/` — dashboard pages
- `coolscool-web/src/components/dashboard/` — reusable chart components

### D2. Gamification

**Features**:
- **Achievement badges**: First quiz, 5-day streak, 10-day streak, 100% accuracy session, topic mastery, subject completion
- **XP levels**: Visual progression bar (Level 1-50), level-up celebration animation
- **Daily challenge**: "Question of the Day" feature — one curated question per day, bonus XP
- **Streaks**: Visual streak counter on dashboard (already have streak endpoint, need frontend)

**New tables needed**:
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  achievement_id VARCHAR(50) UNIQUE NOT NULL,  -- 'first_quiz', 'streak_5', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_reward INTEGER DEFAULT 0,
  criteria JSONB NOT NULL  -- { type: 'streak', value: 5 } etc.
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  achievement_id VARCHAR(50) REFERENCES achievements(achievement_id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
```

**Files to create/modify**:
- New migration for achievements tables
- `coolscool-backend/src/services/achievement.service.ts` — check & award logic
- `coolscool-backend/src/controllers/achievement.controller.ts`
- `coolscool-web/src/components/dashboard/AchievementBadges.tsx`
- `coolscool-web/src/components/ui/LevelProgress.tsx`

### D3. Performance Optimization

**Areas to audit**:
- Session creation query performance (joins across curricula → topics → concepts → questions)
- Proficiency calculation (reads all concept_progress rows per topic)
- Frontend bundle size (check if Recharts or other heavy deps can be lazy-loaded)
- Add missing DB indexes (check `EXPLAIN ANALYZE` on slow queries)

**Files to check**:
- `coolscool-backend/src/services/session.service.ts` — createSession query
- `coolscool-backend/src/services/proficiency.service.ts` — calculateTopicProficiency
- `coolscool-backend/src/db/migrations/` — add new index migration if needed

---

## Implementation Rules (NON-NEGOTIABLE)

1. **Step-by-step approval**: Before implementing each step (A, B, C, D), show a summary and wait for explicit "go ahead"
2. **Parallel agents**: Use multiple agents for independent work. MCQ fixes per directory are independent. Content creation per class × subject is independent. Maximize parallelism.
3. **Commit after each step**: Commit and push after each step completes (A, B, C, D separately)
4. **Don't break existing data**: All changes are additive or in-place fixes. Never delete questions. Never change correct_answer values.
5. **Verify after each step**: Run counts/checks to confirm the fix worked before committing
6. **Re-seed after data changes**: Any JSON file changes need a DB re-seed to take effect in production
7. **Follow existing patterns**: Match the exact JSON structure, file naming, and code conventions of existing content

## Execution Order

```
Step A: Fix 1,242 MCQ options → verify → re-seed → commit → push
Step B: Fix 14 missing explanations → verify → re-seed → commit → push
Step C: CBSE English + Social Studies → verify → seed → commit → push
Step D: Feature work (scope → implement → test → commit → push)
```

Steps A and B can be combined into a single commit if convenient.

---

## Common Gotchas

- Windows paths: use `cd "D:\CoolSCool"` with quotes in bash
- Seed scripts use `NodeNext` module resolution → imports need `.js` extensions
- Backend `noUncheckedIndexedAccess` is ON → Record indexing returns `T | undefined`
- true_false correct_answer must be "A" or "B" (not true/false/True/False)
- Service function argument order: usually `(userId, sessionId)` not `(sessionId, userId)`
- Seed scripts are in `coolscool-backend/scripts/`, run with `npx tsx scripts/{name}.ts`
- JSON files must end with a newline character
- Question IDs must be unique within each topic file
