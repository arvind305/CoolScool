# Detailed Question Audit Plan — 100% Accuracy Guarantee

**Created**: 2026-03-11
**Status**: Not Started
**Goal**: Review every single question (62,685 total) across all boards, classes, and subjects for correctness, accuracy, clarity, and structural integrity — ensuring no user ever encounters a wrong, confusing, or broken question.

---

## 1. Scope

| Board | Subject Group | Classes | Directories | Files | Questions |
|-------|--------------|---------|-------------|-------|-----------|
| ICSE | Maths | 1-12 | 12 | 277 | 18,289 |
| ICSE | Science (General) | 1-5 | 5 | 56 | 3,692 |
| ICSE | Biology | 6-12 | 7 | 94 | 6,387 |
| ICSE | Chemistry | 6-12 | 7 | 85 | 5,876 |
| ICSE | Physics | 6-12 | 7 | 79 | 5,451 |
| CBSE | Maths | 1-12 | 12 | 216 | 10,300 |
| CBSE | EVS | 1-5 | 5 | 62 | 3,100 |
| CBSE | Biology | 6-12 | 7 | 69 | 3,240 |
| CBSE | Chemistry | 6-12 | 7 | 52 | 2,780 |
| CBSE | Physics | 6-12 | 7 | 52 | 2,820 |
| **Total** | | | **76** | **1,064** | **62,685** |

### Question Types
- **MCQ** (45,442): 4 options (A/B/C/D), one correct answer
- **Fill in the Blank** (7,403): Free-text correct answer, no options
- **True/False** (6,921): Correct answer is "A" (True) or "B" (False), no options
- **Ordering** (2,919): `ordering_items` array + `correct_answer` array showing correct sequence

---

## 2. What Gets Checked (Per Question)

Every single question is checked against ALL of the following criteria. No exceptions, no sampling.

### 2.1 Answer Correctness (CRITICAL)
- [ ] **The correct answer is actually correct.** For maths: independently recompute the answer. For science: verify the fact against established curriculum knowledge.
- [ ] **The correct answer matches the stated option.** If `correct_answer` is "B", option B's text must be the right answer.
- [ ] **For fill_blank**: The `correct_answer` text is the correct answer to the question.
- [ ] **For true_false**: "A" means the statement is true, "B" means false — verify the statement's truthfulness.
- [ ] **For ordering**: The `correct_answer` array is the correct sequence for what the question asks.

### 2.2 Explanation Correctness (CRITICAL)
- [ ] **`explanation_correct`** explains WHY the correct answer is right, with accurate reasoning/computation.
- [ ] **`explanation_correct`** does NOT accidentally state a different answer than the correct one.
- [ ] **`explanation_incorrect`** explains WHY the other options are wrong.
- [ ] **`explanation_incorrect`** correctly references the actual correct answer (not a wrong one).
- [ ] Both explanations are factually accurate — no wrong computations, no wrong science facts.
- [ ] Both explanations are complete — not cut off, not placeholder text.

### 2.3 Question Text Quality
- [ ] **Clear and unambiguous** — the student can understand exactly what is being asked.
- [ ] **Grammatically correct** — no garbled text, no "the their", "the the", broken sentences.
- [ ] **No placeholder artifacts** — no "XXX" (unless Roman numeral 30), no "undefined", no template variables.
- [ ] **Age-appropriate language** — Class 1 questions use simple words; Class 12 uses proper terminology.
- [ ] **No excessive whitespace** — no random newlines or extra spaces injected mid-sentence.
- [ ] **Complete sentences** — question text is not cut off or missing words.

### 2.4 Options Quality (MCQ only)
- [ ] **Exactly 4 options** (A, B, C, D) for MCQ questions.
- [ ] **No duplicate options** — no two options have identical text.
- [ ] **No near-duplicate options** — unless the case difference is intentionally meaningful (e.g., physics formulas r vs R).
- [ ] **All distractors are plausible** — wrong options should represent common student mistakes, not absurd answers.
- [ ] **Options are parallel in structure** — similar length, similar format (all numbers, all phrases, etc.).
- [ ] **No "None of the above" or "All of the above"** patterns that make questions ambiguous.

### 2.5 Structural Integrity
- [ ] **All required fields present**: `question_id`, `type`, `concept_id`, `difficulty`, `cognitive_level`, `question_text`, `correct_answer`, `explanation_correct`, `explanation_incorrect`.
- [ ] **`question_id` is unique** within the file and follows the pattern `T{theme}.{topic}.Q{number}`.
- [ ] **`type`** is one of: `mcq`, `fill_blank`, `true_false`, `ordering`.
- [ ] **`difficulty`** is one of: `familiarity`, `application`, `exam_style`.
- [ ] **`cognitive_level`** is one of: `recall`, `classify`, `scenario`, `compare`, `exception`, `reason` (NOT `undefined`).
- [ ] **`concept_id`** follows the pattern `T{theme}.{topic}.C{number}`.
- [ ] MCQ questions have an `options` array with 4 elements, each with `id` and `text`.
- [ ] Ordering questions have `ordering_items` array and `correct_answer` as array.
- [ ] Fill-blank questions have `correct_answer` as a string (not "A"/"B"/"C"/"D").
- [ ] True/false questions have `correct_answer` as "A" or "B".

### 2.6 File-Level Metadata
- [ ] **`cam_reference`** has correct `board`, `class`, and `subject` matching the directory.
- [ ] **`topic_id`** matches the filename pattern.
- [ ] **`topic_name`** is descriptive and matches the topic content.
- [ ] **`total_questions`** (if present) matches the actual `questions` array length.
- [ ] **`canonical_explanation`** has meaningful `text` and `rules` arrays.

### 2.7 Content Appropriateness
- [ ] **Curriculum-aligned** — the question belongs to the stated board, class, and topic.
- [ ] **No inappropriate content** — nothing offensive, violent, or culturally insensitive.
- [ ] **Indian context** — uses Indian terminology where appropriate (lakhs/crores, Rs., Indian geography, etc.).
- [ ] **No outdated facts** — science facts and data are current and accurate.

---

## 3. Audit Process (Per Audit Unit)

Each "audit unit" is one class + one subject (e.g., "ICSE Class 1 Maths"). The process for each:

### Step 1: Read All Files
- Read every question file in the directory
- Count total questions and verify against expected count

### Step 2: Review Every Question
- Go through each question one by one
- Apply ALL checks from Section 2
- For maths: independently solve the problem and verify the answer
- For science: verify factual claims against curriculum knowledge
- Document every error found with: file, question_id, error type, current value, correct value

### Step 3: Fix All Errors
- Apply fixes to the question files
- Each fix must be verified (not introducing new errors)

### Step 4: Re-verify
- Run the content-verifier on the fixed files
- Re-read fixed questions to confirm accuracy
- Confirm zero errors remain

### Step 5: Mark Complete
- Update the tracking table in this document
- Record: errors found, errors fixed, date completed

---

## 4. Audit Order

Audits proceed sequentially: one class, one subject at a time. Lower classes first (simpler content = establish process), then progressively harder content.

### Phase A: ICSE Maths (12 audit units, ~18,289 questions)

| # | Audit Unit | Directory | Files | Questions | Status | Errors Found | Errors Fixed | Date |
|---|-----------|-----------|-------|-----------|--------|--------------|--------------|------|
| A01 | ICSE Class 1 Maths | `class1/` | 24 | 1,748 | **Complete** | 140 | 140 | 2026-03-12 |
| A02 | ICSE Class 2 Maths | `class2/` | 23 | 1,672 | **Complete** | 86 | 86 | 2026-03-12 |
| A03 | ICSE Class 3 Maths | `class3/` | 29 | 2,145 | **Complete** | 236 | 236 | 2026-03-12 |
| A04 | ICSE Class 4 Maths | `class4/` | 15 | 1,186 | **Complete** | 174 | 174 | 2026-03-12 |
| A05 | ICSE Class 5 Maths | `class5/` | 32 | 1,666 | **Complete** | 154 | 154 | 2026-03-12 |
| A06 | ICSE Class 6 Maths | `class6/` | 26 | 2,070 | Not Started | — | — | — |
| A07 | ICSE Class 7 Maths | `class7/` | 25 | 1,480 | Not Started | — | — | — |
| A08 | ICSE Class 8 Maths | `class8/` | 22 | 1,256 | Not Started | — | — | — |
| A09 | ICSE Class 9 Maths | `class9/` | 29 | 1,732 | Not Started | — | — | — |
| A10 | ICSE Class 10 Maths | `class10/` | 25 | 1,984 | Not Started | — | — | — |
| A11 | ICSE Class 11 Maths | `class11/` | 16 | 800 | Not Started | — | — | — |
| A12 | ICSE Class 12 Maths | `class12/` | 11 | 550 | Not Started | — | — | — |

### Phase B: ICSE Science (26 audit units, ~21,406 questions)

| # | Audit Unit | Directory | Files | Questions | Status | Errors Found | Errors Fixed | Date |
|---|-----------|-----------|-------|-----------|--------|--------------|--------------|------|
| B01 | ICSE Class 1 Science | `class1-science/` | 10 | 690 | Not Started | — | — | — |
| B02 | ICSE Class 2 Science | `class2-science/` | 10 | 570 | Not Started | — | — | — |
| B03 | ICSE Class 3 Science | `class3-science/` | 10 | 730 | Not Started | — | — | — |
| B04 | ICSE Class 4 Science | `class4-science/` | 12 | 744 | Not Started | — | — | — |
| B05 | ICSE Class 5 Science | `class5-science/` | 14 | 958 | Not Started | — | — | — |
| B06 | ICSE Class 6 Biology | `class6-biology/` | 9 | 533 | Not Started | — | — | — |
| B07 | ICSE Class 6 Chemistry | `class6-chemistry/` | 8 | 536 | Not Started | — | — | — |
| B08 | ICSE Class 6 Physics | `class6-physics/` | 8 | 536 | Not Started | — | — | — |
| B09 | ICSE Class 7 Biology | `class7-biology/` | 11 | 802 | Not Started | — | — | — |
| B10 | ICSE Class 7 Chemistry | `class7-chemistry/` | 10 | 730 | Not Started | — | — | — |
| B11 | ICSE Class 7 Physics | `class7-physics/` | 10 | 670 | Not Started | — | — | — |
| B12 | ICSE Class 8 Biology | `class8-biology/` | 9 | 673 | Not Started | — | — | — |
| B13 | ICSE Class 8 Chemistry | `class8-chemistry/` | 11 | 748 | Not Started | — | — | — |
| B14 | ICSE Class 8 Physics | `class8-physics/` | 15 | 1,070 | Not Started | — | — | — |
| B15 | ICSE Class 9 Biology | `class9-biology/` | 13 | 961 | Not Started | — | — | — |
| B16 | ICSE Class 9 Chemistry | `class9-chemistry/` | 12 | 844 | Not Started | — | — | — |
| B17 | ICSE Class 9 Physics | `class9-physics/` | 12 | 864 | Not Started | — | — | — |
| B18 | ICSE Class 10 Biology | `class10-biology/` | 14 | 1,038 | Not Started | — | — | — |
| B19 | ICSE Class 10 Chemistry | `class10-chemistry/` | 14 | 1,018 | Not Started | — | — | — |
| B20 | ICSE Class 10 Physics | `class10-physics/` | 13 | 941 | Not Started | — | — | — |
| B21 | ICSE Class 11 Biology | `class11-biology/` | 22 | 1,400 | Not Started | — | — | — |
| B22 | ICSE Class 11 Chemistry | `class11-chemistry/` | 14 | 940 | Not Started | — | — | — |
| B23 | ICSE Class 11 Physics | `class11-physics/` | 11 | 750 | Not Started | — | — | — |
| B24 | ICSE Class 12 Biology | `class12-biology/` | 16 | 980 | Not Started | — | — | — |
| B25 | ICSE Class 12 Chemistry | `class12-chemistry/` | 16 | 1,060 | Not Started | — | — | — |
| B26 | ICSE Class 12 Physics | `class12-physics/` | 10 | 620 | Not Started | — | — | — |

### Phase C: CBSE Maths (12 audit units, ~10,300 questions)

| # | Audit Unit | Directory | Files | Questions | Status | Errors Found | Errors Fixed | Date |
|---|-----------|-----------|-------|-----------|--------|--------------|--------------|------|
| C01 | CBSE Class 1 Maths | `cbse-class1/` | 14 | 700 | Not Started | — | — | — |
| C02 | CBSE Class 2 Maths | `cbse-class2/` | 18 | 900 | Not Started | — | — | — |
| C03 | CBSE Class 3 Maths | `cbse-class3/` | 21 | 1,050 | Not Started | — | — | — |
| C04 | CBSE Class 4 Maths | `cbse-class4/` | 19 | 950 | Not Started | — | — | — |
| C05 | CBSE Class 5 Maths | `cbse-class5/` | 31 | 1,550 | Not Started | — | — | — |
| C06 | CBSE Class 6 Maths | `cbse-class6/` | 14 | 700 | Not Started | — | — | — |
| C07 | CBSE Class 7 Maths | `cbse-class7/` | 15 | 750 | Not Started | — | — | — |
| C08 | CBSE Class 8 Maths | `cbse-class8/` | 16 | 800 | Not Started | — | — | — |
| C09 | CBSE Class 9 Maths | `cbse-class9/` | 15 | 750 | Not Started | — | — | — |
| C10 | CBSE Class 10 Maths | `cbse-class10/` | 15 | 750 | Not Started | — | — | — |
| C11 | CBSE Class 11 Maths | `cbse-class11/` | 15 | 750 | Not Started | — | — | — |
| C12 | CBSE Class 12 Maths | `cbse-class12/` | 13 | 650 | Not Started | — | — | — |

### Phase D: CBSE Science (26 audit units, ~12,690 questions)

| # | Audit Unit | Directory | Files | Questions | Status | Errors Found | Errors Fixed | Date |
|---|-----------|-----------|-------|-----------|--------|--------------|--------------|------|
| D01 | CBSE Class 1 EVS | `cbse-class1-evs/` | 10 | 500 | Not Started | — | — | — |
| D02 | CBSE Class 2 EVS | `cbse-class2-evs/` | 11 | 550 | Not Started | — | — | — |
| D03 | CBSE Class 3 EVS | `cbse-class3-evs/` | 13 | 650 | Not Started | — | — | — |
| D04 | CBSE Class 4 EVS | `cbse-class4-evs/` | 14 | 700 | Not Started | — | — | — |
| D05 | CBSE Class 5 EVS | `cbse-class5-evs/` | 14 | 700 | Not Started | — | — | — |
| D06 | CBSE Class 6 Biology | `cbse-class6-biology/` | 6 | 300 | Not Started | — | — | — |
| D07 | CBSE Class 6 Chemistry | `cbse-class6-chemistry/` | 4 | 200 | Not Started | — | — | — |
| D08 | CBSE Class 6 Physics | `cbse-class6-physics/` | 4 | 200 | Not Started | — | — | — |
| D09 | CBSE Class 7 Biology | `cbse-class7-biology/` | 7 | 350 | Not Started | — | — | — |
| D10 | CBSE Class 7 Chemistry | `cbse-class7-chemistry/` | 4 | 200 | Not Started | — | — | — |
| D11 | CBSE Class 7 Physics | `cbse-class7-physics/` | 4 | 200 | Not Started | — | — | — |
| D12 | CBSE Class 8 Biology | `cbse-class8-biology/` | 6 | 320 | Not Started | — | — | — |
| D13 | CBSE Class 8 Chemistry | `cbse-class8-chemistry/` | 5 | 270 | Not Started | — | — | — |
| D14 | CBSE Class 8 Physics | `cbse-class8-physics/` | 6 | 320 | Not Started | — | — | — |
| D15 | CBSE Class 9 Biology | `cbse-class9-biology/` | 6 | 320 | Not Started | — | — | — |
| D16 | CBSE Class 9 Chemistry | `cbse-class9-chemistry/` | 4 | 240 | Not Started | — | — | — |
| D17 | CBSE Class 9 Physics | `cbse-class9-physics/` | 5 | 270 | Not Started | — | — | — |
| D18 | CBSE Class 10 Biology | `cbse-class10-biology/` | 6 | 300 | Not Started | — | — | — |
| D19 | CBSE Class 10 Chemistry | `cbse-class10-chemistry/` | 5 | 290 | Not Started | — | — | — |
| D20 | CBSE Class 10 Physics | `cbse-class10-physics/` | 5 | 310 | Not Started | — | — | — |
| D21 | CBSE Class 11 Biology | `cbse-class11-biology/` | 22 | 1,140 | Not Started | — | — | — |
| D22 | CBSE Class 11 Chemistry | `cbse-class11-chemistry/` | 14 | 860 | Not Started | — | — | — |
| D23 | CBSE Class 11 Physics | `cbse-class11-physics/` | 14 | 900 | Not Started | — | — | — |
| D24 | CBSE Class 12 Biology | `cbse-class12-biology/` | 16 | 860 | Not Started | — | — | — |
| D25 | CBSE Class 12 Chemistry | `cbse-class12-chemistry/` | 16 | 920 | Not Started | — | — | — |
| D26 | CBSE Class 12 Physics | `cbse-class12-physics/` | 14 | 820 | Not Started | — | — | — |

---

## 5. How Each Audit Unit Is Executed

### 5.1 Agent-Based Review

For each audit unit, a dedicated agent is launched that:
1. Reads every question file in the directory
2. Reviews every question against ALL criteria in Section 2
3. Produces a structured error report listing every issue found
4. Reports the total questions reviewed and total errors found

The agent receives the full checklist and is instructed to be meticulous — checking mathematical computations step by step, verifying science facts, and reading every word of every question, option, and explanation.

### 5.2 Error Report Format

For each error found, the agent reports:

```
FILE: T01.02-seriation-ordering.json
QUESTION: T01.02.Q005
ERROR TYPE: Wrong Answer
SEVERITY: Critical
CURRENT: correct_answer = "A" (option A = "5 cm")
SHOULD BE: correct_answer = "C" (option C = "7 cm")
REASON: 3 + 4 = 7, not 5
FIX: Change correct_answer from "A" to "C"
```

### 5.3 Fix Application

After the agent reports errors:
1. Each error is reviewed for validity (not a false positive)
2. Fixes are applied to the JSON files
3. The file is re-read to confirm the fix is correct
4. The content-verifier is run to catch any structural issues introduced

### 5.4 Re-seeding

After all files in a board+subject group are audited and fixed:
- ICSE Maths: `npx tsx scripts/seed-all-classes.ts`
- CBSE: `npx tsx scripts/seed-cbse-all.ts`
- ICSE Science: `npx tsx scripts/seed-science.ts`

This ensures fixes are live in the database immediately.

---

## 6. Known Pre-Existing Issues to Fix

These issues were identified during the remediation phase and should be resolved during the audit:

| Issue | Count | Details |
|-------|-------|---------|
| MCQs with 0 options | 30 | All in `class6/T01.01-numbers-and-place-value.json` — empty `options: []` |
| Undefined cognitive_level | 32 | Questions with `cognitive_level: "undefined"` |
| Questions with 2 options (non-true/false) | ~2,340 | MCQs that only have 2 options instead of 4 — need investigation |

---

## 7. Completion Criteria

An audit unit is marked **Complete** only when:

1. Every single question has been read and verified by the auditor
2. Every error found has been fixed and the fix verified
3. The content-verifier reports zero structural errors for the directory
4. The tracking table is updated with error counts and completion date
5. The database has been re-seeded with fixed data

The entire audit is complete when all 76 audit units are marked Complete.

---

## 8. Summary Progress

| Phase | Audit Units | Questions | Status | Errors Found | Errors Fixed |
|-------|------------|-----------|--------|--------------|--------------|
| A: ICSE Maths | 5/12 | 8,417/18,289 | In Progress | 790 | 790 |
| B: ICSE Science | 0/26 | 0/21,406 | Not Started | — | — |
| C: CBSE Maths | 0/12 | 0/10,300 | Not Started | — | — |
| D: CBSE Science | 0/26 | 0/12,690 | Not Started | — | — |
| **Total** | **5/76** | **8,417/62,685** | **In Progress** | **790** | **790** |
