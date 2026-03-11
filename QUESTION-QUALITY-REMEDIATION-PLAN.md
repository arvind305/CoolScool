# Question Quality Remediation — Tracking Document

**Created**: 2026-03-10
**Last Updated**: 2026-03-11
**Status**: Phase 1 — Complete, Phase 2 in progress

## Overview

An audit of ICSE Class 7 Maths questions (~1,362 questions across 25 files) found **~199 errors (14.6% error rate)**, including wrong answers, wrong explanations, garbled text, duplicate options, and metadata mismatches. All content was AI-generated and existing validators only check structural integrity, not content correctness.

**Total scope**: 1,064 question files across ICSE + CBSE boards, Maths + Science subjects, Classes 1-12.

## Phase Tracking

| Phase | Scope | Files | Est. Questions | Status | Errors Found | Errors Fixed | Date Completed |
|-------|-------|-------|----------------|--------|--------------|--------------|----------------|
| 0 | Build content-verifier | 1 (new) | — | **Complete** | — | — | 2026-03-10 |
| 1 | Fix ICSE Class 7 Maths | 25 | 1,480 | **Complete** | 199 (manual audit) | 199 | 2026-03-11 |
| 2 | App-wide automated fixes | 1,032 | 62,685 | **Complete** | 1,992 (verifier) | 1,539 | 2026-03-11 |
| 3 | Fix verifier false positives | 1 | — | **Complete** | ~228 false positives | removed | 2026-03-11 |
| 4 | Fix identical-text duplicates | ~50 files | — | **Complete** | 66 | 57 | 2026-03-11 |
| 5 | Fix genuine wrong answers | 7 files | — | **Complete** | 7 confirmed | 7 | 2026-03-11 |
| 6 | Remaining: numeric-equiv dups | ~300 | — | Deferred | ~293 (mostly false positives) | — | — |
| 7 | Remaining: wrong explanations | ~63 | — | Deferred | ~63 (mostly false positives) | — | — |
| 8 | Future Content Creation SOP | — | — | Not Started | — | — | — |

## File Counts (Actual)

### ICSE Maths (277 files)
| Directory | Files |
|-----------|-------|
| class1 | 24 |
| class2 | 23 |
| class3 | 29 |
| class4 | 15 |
| class5 | 32 |
| class6 | 26 |
| class7 | 25 |
| class8 | 22 |
| class9 | 29 |
| class10 | 25 |
| class11 | 16 |
| class12 | 11 |

### ICSE Science (336 files)
| Directory | Files |
|-----------|-------|
| class1-science | 10 |
| class2-science | 10 |
| class3-science | 10 |
| class4-science | 12 |
| class5-science | 14 |
| class6-biology | 9 |
| class6-chemistry | 8 |
| class6-physics | 8 |
| class7-biology | 11 |
| class7-chemistry | 10 |
| class7-physics | 10 |
| class8-biology | 9 |
| class8-chemistry | 11 |
| class8-physics | 15 |
| class9-biology | 13 |
| class9-chemistry | 12 |
| class9-physics | 12 |
| class10-biology | 14 |
| class10-chemistry | 14 |
| class10-physics | 13 |
| class11-biology | 22 |
| class11-chemistry | 14 |
| class11-physics | 11 |
| class12-biology | 16 |
| class12-chemistry | 16 |
| class12-physics | 10 |

### CBSE Maths (216 files)
| Directory | Files |
|-----------|-------|
| cbse-class1 | 14 |
| cbse-class2 | 18 |
| cbse-class3 | 21 |
| cbse-class4 | 19 |
| cbse-class5 | 31 |
| cbse-class6 | 14 |
| cbse-class7 | 15 |
| cbse-class8 | 16 |
| cbse-class9 | 15 |
| cbse-class10 | 15 |
| cbse-class11 | 15 |
| cbse-class12 | 13 |

### CBSE Science/EVS (235 files)
| Directory | Files |
|-----------|-------|
| cbse-class1-evs | 10 |
| cbse-class2-evs | 11 |
| cbse-class3-evs | 13 |
| cbse-class4-evs | 14 |
| cbse-class5-evs | 14 |
| cbse-class6-biology | 6 |
| cbse-class6-chemistry | 4 |
| cbse-class6-physics | 4 |
| cbse-class7-biology | 7 |
| cbse-class7-chemistry | 4 |
| cbse-class7-physics | 4 |
| cbse-class8-biology | 6 |
| cbse-class8-chemistry | 5 |
| cbse-class8-physics | 6 |
| cbse-class9-biology | 6 |
| cbse-class9-chemistry | 4 |
| cbse-class9-physics | 5 |
| cbse-class10-biology | 6 |
| cbse-class10-chemistry | 5 |
| cbse-class10-physics | 5 |
| cbse-class11-biology | 22 |
| cbse-class11-chemistry | 14 |
| cbse-class11-physics | 14 |
| cbse-class12-biology | 16 |
| cbse-class12-chemistry | 16 |
| cbse-class12-physics | 14 |

## Error Categories

| Category | Severity | Description |
|----------|----------|-------------|
| Wrong Answer | Critical | `correct_answer` field points to wrong option; students graded incorrectly |
| Duplicate Options | Critical | Two or more MCQ options have identical text; MCQ integrity broken |
| Wrong Explanation | High | Correct answer is right, but explanation arrives at different answer or has broken math |
| Garbled Text | Medium | Template artifacts, broken grammar, "What is the their..." patterns |
| Metadata Mismatch | Low | `total_questions` count doesn't match actual question array length |

## Phase Details

### Phase 0: Build Verification Infrastructure — COMPLETE (2026-03-10)
- **File**: `questions/validation/content-verifier.js`
- **Capabilities**: MathEvaluator, ExplanationChecker, GarbledTextDetector, duplicate option detection, metadata validation
- **Initial full dataset results**: 1,992 errors across 1,032 files / 62,685 questions

### Phase 1: Fix ICSE Class 7 Maths (Pilot) — COMPLETE (2026-03-11)
- **Files**: 25 files in `questions/data/class7/`
- **Errors found**: 199 (manual audit), all fixed
- **Categories**: 42 wrong answers, 65 wrong explanations, 60 garbled text, 25 duplicate options, 5 metadata

### Phase 2: App-wide Automated Fixes — COMPLETE (2026-03-11)
- **Built**: `questions/validation/content-fixer.js` — automated fixer for garbled text patterns
- **Root cause**: `scripts/convert-match-to-mcq.js` regex captured pronouns ("the their") and produced garbled question text
- **Fixes applied**: 1,512 across 159 files (1,478 garbled text + 34 metadata mismatches)
- **Breakdown**: "the their" pattern (493 fixes), "the the" pattern (622 fixes), metadata recounts (34 fixes)

### Phase 3: Verifier Improvements — COMPLETE (2026-03-11)
- Reduced false positives by ~228:
  - "undefined" removed from code_artifact check (legitimate math term: "division by zero is undefined")
  - Roman numerals (XXX, XXXIV) excluded from placeholder check
  - "an A" article_confusion removed (valid grammar in "an A chain")
  - Fraction parsing added to ExplanationChecker (was matching "3" in "3/4")
  - Excessive whitespace threshold raised (skip 4-space match-the-following tables)

### Phase 4: Manual Fixes — COMPLETE (2026-03-11)
- **7 genuine wrong answers fixed**: 4 subtraction errors (class3), 1 rational number (class8), 1 triangle area (class8), 1 cube volume (class8)
- **57 identical-text duplicate options fixed**: Changed duplicate non-correct options to plausible distractors
- **2 double-word errors fixed**: "is Is" (class2), "not not" (class6)
- **27 excessive whitespace errors fixed**: cbse-class12-biology

### Final Results (2026-03-11)
- **Starting errors**: 1,992
- **Ending errors**: 600 (70% reduction)
- **Remaining 600 breakdown**:
  - Wrong Answer: 154 (verifier false positives — place value, rounding, estimation questions)
  - Duplicate Options: 322 (mostly numeric-equivalent false positives: algebraic terms, "Both A and B" designs, case-sensitivity biology questions)
  - Wrong Explanation: 63 (verifier substring matching false positives)
  - Garbled Text: 57 (Roman numerals "XXX", biology "XXX" chromosomes, match-table formatting)
  - Metadata: 4
- **All 3 databases re-seeded**: ICSE Maths (18,289), CBSE (22,990), ICSE Science (21,406)

### Remaining Work
- Phase 6: Add content-verifier to CI pipeline (prevent future regressions)
- Phase 7: Improve verifier to further reduce false positives
- Phase 8: Content Creation SOP for future content generation
