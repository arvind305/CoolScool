# CoolSCool Database Quality Audit Report
**Date:** 2026-02-21
**Database:** Production (Neon PostgreSQL)
**Total Questions:** 62,683
**Total Curricula:** 76 (all have questions)

---

## Executive Summary

### Critical Issues (Requires Fix)
1. **14 ordering questions** missing `ordering_items` field (should contain shuffled items)
2. **1,242 MCQ questions** have fewer than 4 options (499 have 2, 743 have 3)
3. **10 true/false questions** have empty options array (0 items)

### Good News (No Issues Found)
✓ No NULL or empty correct_answer values
✓ All MCQ correct_answer values are valid (A, B, C, or D)
✓ All true/false correct_answer values are valid (A or B)
✓ No NULL or empty question_text
✓ No NULL question_type
✓ No duplicate question_id within same curriculum
✓ All cognitive_level values are valid (recall, compare, classify, scenario, exception, reason)
✓ All difficulty values are valid (familiarity, application, exam_style)
✓ No questions with extremely long text (>1000 chars)
✓ All curricula have questions (no empty curricula)

---

## Detailed Findings

### 1. Questions with NULL correct_answer
**Count:** 0 ✓

### 2. MCQ questions with invalid correct_answer
**Count:** 0 ✓
All MCQ questions have correct_answer in [A, B, C, D]

### 3. True/false questions with invalid correct_answer
**Count:** 0 ✓
All true/false questions have correct_answer in [A, B] (after recent fix)

### 4. Questions with NULL or empty question_text
**Count:** 0 ✓

### 5. Questions with NULL question_type
**Count:** 0 ✓

### 6. MCQ questions with NULL options
**Count:** 0 ✓

### 7. Duplicate question_id within same curriculum
**Count:** 0 groups ✓

### 8. Ordering questions with NULL ordering_items
**Count:** 14 ⚠️

**Sample affected questions:**
- T10.02.Q042 - Complete the repeating pattern
- T07.01.Q039 - Arrange units from smallest to largest
- T07.02.Q038 - Arrange from lightest to heaviest
- T09.04.Q033 - Arrange to find median

**Root cause:** These questions have `correct_answer` array but missing `ordering_items`. The frontend needs `ordering_items` to display the shuffled items for the user to arrange.

### 9. Questions with invalid cognitive_level
**Count:** 0 ✓

**Valid cognitive levels found:**
- classify
- compare
- exception
- reason
- recall
- scenario

### 10. Questions with invalid difficulty
**Count:** 0 ✓

**Valid difficulties found:**
- familiarity
- application
- exam_style

### 11. Question type distribution
| Type | Count | Percentage |
|------|-------|------------|
| mcq | 45,123 | 72.0% |
| fill_blank | 7,720 | 12.3% |
| true_false | 6,921 | 11.0% |
| ordering | 2,919 | 4.7% |

### 12. Curricula with 0 questions
**Count:** 0 ✓

All 76 curricula have questions ranging from 200 to 2,145 questions per curriculum.

---

## Additional Quality Checks

### MCQ Option Count Issues
**Count:** 1,242 questions ⚠️

| Options | Count |
|---------|-------|
| 2 options | 499 |
| 3 options | 743 |
| 4 options | 43,881 ✓ |

**Sample questions with fewer than 4 options:**
- T03.02.Q067 - 3 options
- T03.02.Q068 - 3 options
- T05.02.Q072 - 2 options
- T03.03.Q053 - 2 options

### True/False Option Count Issues
**Count:** 10 questions ⚠️

| Options | Count |
|---------|-------|
| null | 4,571 ✓ |
| 0 options | 10 ⚠️ |
| 2 options | 2,340 ✓ |

**Note:** NULL options for true/false is expected (they use standard True/False). However, 10 questions have empty arrays instead of NULL.

**Affected questions:**
- T01.01.Q021 - "The place value of a digit..."
- T01.01.Q022 - "In the Indian system, commas..."
- T01.01.Q023 - "The sum of 3,45,678 and 2,54,322..."
(7 more)

### Questions with Very Short Text
**Count:** 56 questions ℹ️

These are likely valid short questions like:
- "8 - 5 = 4" (true/false)
- "7³ = ___" (fill_blank)
- "Air is a:" (mcq)

---

## Curriculum Distribution

### ICSE Board (38 curricula)
- Classes 1-5: Mathematics + Science
- Classes 6-12: Mathematics + Biology + Chemistry + Physics
- Question counts range from 533 to 2,145 per curriculum

### CBSE Board (38 curricula)
- Classes 1-5: Mathematics + EVS
- Classes 6-12: Mathematics + Biology + Chemistry + Physics
- Question counts range from 200 to 1,550 per curriculum

**Total distribution:**
- ICSE questions: ~45,000
- CBSE questions: ~17,000

---

## Recommendations

### Priority 1: Fix Ordering Questions
Fix the 14 ordering questions missing `ordering_items`:
```sql
-- For each affected question, set ordering_items = correct_answer
-- (or a shuffled version if desired)
UPDATE questions 
SET ordering_items = correct_answer 
WHERE question_type='ordering' AND ordering_items IS NULL;
```

### Priority 2: Fix MCQ Questions with <4 Options
Investigate the 1,242 MCQ questions with fewer than 4 options:
- Determine if they should be converted to different question types
- Or add additional distractors to bring them to 4 options
- Particularly focus on the 499 with only 2 options (might be better as true/false)

### Priority 3: Fix True/False Empty Options
Fix the 10 true/false questions with empty options arrays:
```sql
UPDATE questions 
SET options = NULL 
WHERE question_type='true_false' AND jsonb_array_length(options) = 0;
```

### Priority 4: Data Validation Rules
Consider adding database constraints:
- MCQ questions must have exactly 4 options
- Ordering questions must have non-NULL ordering_items
- True/false questions should have NULL or 2 options

---

## Conclusion

The database is in **good overall health** with strong data integrity:
- ✓ No critical data corruption
- ✓ No NULL required fields
- ✓ All enum values are valid
- ✓ No duplicate questions
- ✓ All curricula populated

**Action required on:**
- 14 ordering questions (missing ordering_items)
- 1,242 MCQ questions (insufficient options)
- 10 true/false questions (empty options array)

**Total issues:** 1,266 questions (2.0% of total)
