# CoolScool Curriculum Expansion Prompt

Use this prompt with Claude to expand CoolScool beyond ICSE Class 5 Mathematics. Simply provide the official curriculum/syllabus for the board, class, and subject you want to add.

---

## PROMPT START

I need you to help me expand the CoolScool educational quiz application to support a new curriculum. The system currently supports ICSE Class 5 Mathematics and I want to add **[BOARD] [CLASS] [SUBJECT]**.

Here is the official curriculum/syllabus for this board/class/subject:

```
[PASTE THE CURRICULUM HERE]
```

---

## YOUR TASK

Based on the curriculum provided above, you need to create:

1. **CAM File (Curriculum Alignment Map)** - The structured JSON that defines themes, topics, and concepts
2. **Question Bank Files** - 50 questions per topic in JSON format
3. **Database Migration** - If schema changes are needed
4. **Code Updates** - Any necessary code changes to support multiple boards/classes

---

## EXISTING ARCHITECTURE REFERENCE

### 1. CAM (Curriculum Alignment Map) Structure

The CAM is the master document that defines the curriculum hierarchy. Create a new file at:
`cam/data/{board}-class{N}-{subject}-cam.json`

Example: `cam/data/icse-class6-mathematics-cam.json`

**Required CAM Structure:**
```json
{
  "version": "1.0.0",
  "board": "ICSE",           // e.g., "ICSE", "CBSE", "STATE_MH", "STATE_KA"
  "class": 6,                // Class/grade number
  "subject": "Mathematics",  // Subject name
  "academic_year": "2025-2026",
  "themes": [
    {
      "theme_id": "T01",           // Format: T## (01-99)
      "theme_name": "Theme Name",
      "theme_order": 1,
      "topics": [
        {
          "topic_id": "T01.01",    // Format: T##.## (theme.topic)
          "topic_name": "Topic Name",
          "topic_order": 1,
          "concepts": [
            {
              "concept_id": "T01.01.C01",  // Format: T##.##.C## (theme.topic.concept)
              "concept_name": "Specific learning objective",
              "difficulty_levels": ["familiarity", "application", "exam_style"]
            }
          ],
          "boundaries": {
            "in_scope": [
              "What IS covered in this topic"
            ],
            "out_of_scope": [
              "What is NOT covered (for AI guardrails)"
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
    "created_at": "2026-01-20",
    "source": "Official [BOARD] Class [N] [Subject] Syllabus [Year]",
    "status": "draft",
    "validated_by": null,
    "locked_at": null
  }
}
```

**CAM Guidelines:**
- Each theme should contain 1-6 related topics
- Each topic should have 3-8 concepts (specific learning objectives)
- Concepts must be atomic (one testable thing per concept)
- `difficulty_levels` defines which difficulty tiers apply to each concept
- `boundaries` are CRITICAL - they define what AI must stay within when generating questions
- `numeric_limits` prevent out-of-scope calculations

---

### 2. Question Bank Structure

Create one JSON file per topic at:
`questions/data/{topic_id}-{topic-name-kebab-case}.json`

Example: `questions/data/T01.01-place-value-number-sense.json`

**Required Question Bank Structure:**
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
    "text": "2-4 factual sentences explaining the core concept. No teaching, no worked examples.",
    "rules": [
      "Key rule or fact 1",
      "Key rule or fact 2",
      "Key rule or fact 3"
    ]
  },
  "questions": [
    // 50 questions following the schema below
  ],
  "metadata": {
    "created_at": "2026-01-20",
    "status": "validated",
    "question_count": {
      "total": 50,
      "by_difficulty": {
        "familiarity": 16,
        "application": 19,
        "exam_style": 15
      },
      "by_type": {
        "mcq": 30,
        "fill_blank": 10,
        "true_false": 5,
        "match": 3,
        "ordering": 2
      }
    }
  }
}
```

---

### 3. Question Types and Formats

**5 Supported Question Types:**

#### MCQ (Multiple Choice)
```json
{
  "question_id": "T01.01.Q001",
  "concept_id": "T01.01.C01",
  "difficulty": "familiarity",
  "type": "mcq",
  "question_text": "What is the place value of 5 in 5,43,210?",
  "options": [
    {"id": "A", "text": "5"},
    {"id": "B", "text": "5,000"},
    {"id": "C", "text": "50,000"},
    {"id": "D", "text": "5,00,000"}
  ],
  "correct_answer": "D",
  "hint": "Look at the position from the right"
}
```

#### Fill in the Blank
```json
{
  "question_id": "T01.01.Q004",
  "concept_id": "T01.01.C02",
  "difficulty": "application",
  "type": "fill_blank",
  "question_text": "Write 8,05,032 in the international system: ___",
  "correct_answer": "805,032"
}
```

#### True/False
```json
{
  "question_id": "T01.01.Q020",
  "concept_id": "T01.01.C01",
  "difficulty": "familiarity",
  "type": "true_false",
  "question_text": "The place value of 0 in any number is always 0.",
  "correct_answer": true
}
```

#### Match (Matching Pairs)
```json
{
  "question_id": "T01.01.Q030",
  "concept_id": "T01.01.C02",
  "difficulty": "application",
  "type": "match",
  "question_text": "Match the numbers with their word forms:",
  "match_pairs": [
    {"left": "3,45,000", "right": "Three lakh forty-five thousand"},
    {"left": "34,500", "right": "Thirty-four thousand five hundred"},
    {"left": "3,45,00,000", "right": "Three crore forty-five lakh"},
    {"left": "3,450", "right": "Three thousand four hundred fifty"}
  ],
  "correct_answer": {
    "3,45,000": "Three lakh forty-five thousand",
    "34,500": "Thirty-four thousand five hundred",
    "3,45,00,000": "Three crore forty-five lakh",
    "3,450": "Three thousand four hundred fifty"
  }
}
```

#### Ordering (Sequence)
```json
{
  "question_id": "T01.01.Q006",
  "concept_id": "T01.01.C03",
  "difficulty": "application",
  "type": "ordering",
  "question_text": "Arrange these numbers in ascending order:",
  "ordering_items": ["5,43,210", "5,34,210", "5,42,310", "5,43,120"],
  "correct_answer": ["5,34,210", "5,42,310", "5,43,120", "5,43,210"]
}
```

---

### 4. Difficulty Levels

**Three difficulty tiers (distribute questions ~33% each):**

| Level | Name | Description | Question Style |
|-------|------|-------------|----------------|
| 1 | `familiarity` | Basic recall and recognition | Direct, single-step |
| 2 | `application` | Apply knowledge to new situations | Multi-step, word problems |
| 3 | `exam_style` | Complex, exam-board aligned | Real-world context, challenging |

---

### 5. Question ID Pattern

```
T##.##.Q###
│  │   └── Question number (001-999)
│  └────── Topic number within theme (01-99)
└───────── Theme number (01-99)

Example: T01.01.Q001 = Theme 1, Topic 1, Question 1
```

---

### 6. Database Schema (Current)

The themes table already supports multiple boards:
```sql
CREATE TABLE themes (
    id UUID PRIMARY KEY,
    theme_id VARCHAR(10) UNIQUE NOT NULL,
    theme_name VARCHAR(255) NOT NULL,
    theme_order INTEGER NOT NULL,
    cam_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    board VARCHAR(20) NOT NULL DEFAULT 'ICSE',
    class_level INTEGER NOT NULL DEFAULT 5,
    subject VARCHAR(50) NOT NULL DEFAULT 'Mathematics',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**IMPORTANT:** The current schema uses `theme_id` as UNIQUE, which means you CANNOT have the same theme_id across different boards/classes.

**Required Migration for Multi-Board Support:**
```sql
-- Migration: 002_multi_board_support.sql

-- Drop the unique constraint on theme_id alone
ALTER TABLE themes DROP CONSTRAINT themes_theme_id_key;

-- Add composite unique constraint
ALTER TABLE themes ADD CONSTRAINT themes_board_class_subject_theme_unique
    UNIQUE (board, class_level, subject, theme_id);

-- Same for topics
ALTER TABLE topics DROP CONSTRAINT topics_topic_id_key;
ALTER TABLE topics ADD CONSTRAINT topics_theme_topic_unique
    UNIQUE (theme_id, topic_id);
-- Note: topic_id format should change to include board/class or we need a different approach

-- Same for concepts
ALTER TABLE concepts DROP CONSTRAINT concepts_concept_id_key;
ALTER TABLE concepts ADD CONSTRAINT concepts_topic_concept_unique
    UNIQUE (topic_id, concept_id);

-- Same for questions
ALTER TABLE questions DROP CONSTRAINT questions_question_id_key;
-- Add reference to which CAM this question belongs to
ALTER TABLE questions ADD COLUMN board VARCHAR(20);
ALTER TABLE questions ADD COLUMN class_level INTEGER;
ALTER TABLE questions ADD COLUMN subject VARCHAR(50);
ALTER TABLE questions ADD CONSTRAINT questions_board_question_unique
    UNIQUE (board, class_level, subject, question_id);
```

---

### 7. Seeding Process

After creating the CAM and question files, update the seeding scripts:

**Update `coolscool-backend/scripts/seed-cam.ts`:**
- Modify to accept a parameter for which CAM file to seed
- Or create a new script per board/class combination

**Update `coolscool-backend/scripts/seed-questions.ts`:**
- Modify to accept a parameter for which question directory to seed
- Ensure it handles the new composite unique constraints

**Run order:**
```bash
npm run migrate        # Run any new migrations
npm run seed-cam       # Seed the CAM hierarchy
npm run seed-questions # Seed the questions
```

---

### 8. Frontend Changes Needed

**Add board/class selector:**
- Update the browse/practice pages to show board/class selection
- Filter topics by selected board/class
- Store user's preferred board/class in their profile

**Files to modify:**
- `coolscool-web/src/app/(main)/browse/page.tsx`
- `coolscool-web/src/app/(main)/practice/page.tsx`
- `coolscool-web/src/services/cam-api.ts` - add board/class filters

---

### 9. Backend API Changes Needed

**CAM endpoints need board/class parameters:**
- `GET /api/v1/cam/themes?board=ICSE&class=5`
- `GET /api/v1/cam/topics?board=ICSE&class=5&theme=T01`
- `GET /api/v1/cam/concepts?board=ICSE&class=5&topic=T01.01`

**Files to modify:**
- `coolscool-backend/src/routes/cam.routes.ts`
- `coolscool-backend/src/controllers/cam.controller.ts`
- `coolscool-backend/src/models/cam.model.ts`

---

## QUESTION GENERATION RULES

When creating questions, follow these rules strictly:

### Content Rules
1. **Single Concept Per Question** - Each question tests exactly ONE concept
2. **Stay Within Boundaries** - Never exceed the `in_scope` or violate `out_of_scope`
3. **Respect Numeric Limits** - Never use numbers beyond `numeric_limits`
4. **Deterministic Answers** - Every question must have exactly one correct answer
5. **No Ambiguity** - Question text must be clear and unambiguous
6. **Age Appropriate** - Language suitable for the target class level
7. **Culturally Relevant** - Use examples relevant to Indian students (for Indian boards)

### Distribution Rules (Per Topic, 50 Questions)
- **By Difficulty:** ~16 familiarity, ~19 application, ~15 exam_style
- **By Type:** ~60% MCQ, ~20% fill_blank, ~10% true_false, ~5% match, ~5% ordering
- **By Concept:** Distribute evenly across all concepts in the topic

### Quality Rules
- MCQ distractors should be plausible but clearly wrong
- Fill-blank answers should have only one correct form (or list acceptable variants)
- Hints should nudge, not teach
- Avoid pattern recognition (don't make correct answer always B, or always longest)

---

## OUTPUT FORMAT

Please provide the following files:

### 1. CAM File
```
File: cam/data/{board}-class{N}-{subject}-cam.json
```

### 2. Question Bank Files (one per topic)
```
File: questions/data/T##.##-topic-name.json
```

### 3. Database Migration (if needed)
```
File: coolscool-backend/src/db/migrations/002_multi_board_support.sql
```

### 4. Updated Seeding Scripts
```
File: coolscool-backend/scripts/seed-cam.ts (modifications)
File: coolscool-backend/scripts/seed-questions.ts (modifications)
```

### 5. API/Frontend Updates (if needed)
```
List of files to modify with specific changes
```

---

## EXAMPLE: How to Use This Prompt

**User provides:**
```
I need you to help me expand CoolScool to support CBSE Class 6 Mathematics.

Here is the official curriculum:
[Pastes NCERT/CBSE Class 6 Maths syllabus]
```

**Claude responds with:**
1. Complete CAM JSON for CBSE Class 6 Mathematics
2. All question bank files (one per topic, 50 questions each)
3. Any necessary migrations
4. Updated scripts and code

---

## VALIDATION CHECKLIST

Before finalizing, verify:

- [ ] CAM file passes JSON schema validation
- [ ] All concept_ids in questions exist in CAM
- [ ] All difficulty levels used are allowed per concept's CAM definition
- [ ] Question counts match metadata
- [ ] No duplicate question_ids
- [ ] All questions have correct_answer field
- [ ] MCQ questions have exactly 4 options (A, B, C, D)
- [ ] Match questions have match_pairs array
- [ ] Ordering questions have ordering_items array
- [ ] Boundaries are comprehensive (nothing ambiguous)

---

## PROMPT END

---

**Remember:** The goal is to create a complete, production-ready curriculum expansion that can be seeded directly into the database without manual intervention.
