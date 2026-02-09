# Master Plan — ICSE Mathematics CAM & Question Bank Expansion (Classes 1-10)

## Overview

Expand the existing Class 5 ICSE Mathematics system (CAM + Question Bank + Validation) to cover **all classes 1-10**. The approach is methodical, bottom-up, with review gates to prevent cascading errors.

**Guiding Principles:**
- First time right — no rework
- Bottom-up (Class 1 → 10) to ensure boundary correctness
- Every CAM reviewed before question generation
- Auditor enhanced incrementally as concept complexity grows
- Cross-class consistency verified at the end

---

## Step 0: Understand Existing Class 5 System
**Status: COMPLETED**

### What was learned:
- **CAM Location**: `cam/data/icse-class5-mathematics-cam.json` (1,740 lines)
- **CAM Schema**: `cam/schema/cam-schema.json`
- **CAM Validator**: `cam/validation/cam-validator.js`
- **CAM Structure**: 10 Themes → 32 Topics → 163 Concepts
- Each topic has `in_scope`, `out_of_scope`, `numeric_limits` boundaries
- Each concept has ID format `T01.01.C01`

- **Question Location**: `questions/data/` — 32 JSON files, ~1,600 questions
- **Question Schema**: `questions/schema/question-schema.json`
- **5 question types**: mcq, fill_blank, true_false, match, ordering
- **3 difficulty levels**: familiarity, application, exam_style
- **Question ID format**: `T01.01.Q001`
- Each file has `canonical_explanation` with text + rules

- **Validator**: `questions/validation/question-validator.js` — checks metadata, CAM alignment, concept coverage, difficulty distribution, type-specific structure
- **Auditor**: `questions/validation/question-auditor.js` — checks structural validity, math accuracy (face value, place value, expanded form, arithmetic, comparisons, ordering)

### Files to replicate per class:
1. `cam/data/icse-class{N}-mathematics-cam.json`
2. `questions/data/T##.##-{topic-slug}.json` (one per topic)
3. Auditor rule enhancements for new concept types

---

## Step 1: Deep-Read CAM Schema + Class 5 CAM as Template
**Status: COMPLETED**

### What was learned:

**CAM Schema** (`cam/schema/cam-schema.json`):
- Required top-level: version, board, class, subject, academic_year, themes, metadata
- Theme: theme_id (T##), theme_name, theme_order, topics[]
- Topic: topic_id (T##.##), topic_name, topic_order, concepts[], boundaries
- Concept: concept_id (T##.##.C##), concept_name, difficulty_levels[]
- Boundaries: in_scope[], out_of_scope[], numeric_limits{} (flexible keys)

**Question Schema** (`questions/schema/question-schema.json`):
- Required: version, cam_reference, topic_id, topic_name, canonical_explanation, questions[], metadata
- canonical_explanation: text (50-500 chars, 2-4 sentences), rules[] (1-5 items)
- Question: question_id (T##.##.Q###), concept_id, difficulty, type, question_text, correct_answer
- MCQ requires options[] (exactly 4, ids A-D)
- Match requires match_pairs[]
- Ordering requires ordering_items[]
- Metadata: question_count with total, by_difficulty, by_type

**CAM Validator** (`cam/validation/cam-validator.js`):
- Checks metadata, structure, unique IDs, boundaries, difficulty levels, completeness
- NOTE: Hardcodes expectedThemes = 10 — will warn for classes with different theme counts (acceptable)

**Question Validator** (`questions/validation/question-validator.js`):
- Validates CAM reference, topic alignment, canonical explanation, all questions
- Checks concept coverage, difficulty distribution, type-specific rules
- Detects trick question indicators

**Question Auditor** (`questions/validation/question-auditor.js`):
- Structural checks + math content verification
- Face value, place value, expanded form, comparison, arithmetic fill-blank
- Current rules are Class 5 focused — will need enhancement for higher classes

**Class 5 CAM Template** (1,740 lines):
- 10 Themes, 32 Topics, 163 Concepts
- Boundary format: in_scope (explicit allowlist), out_of_scope (explicit blocklist), numeric_limits (flexible keys)
- numeric_limits examples: max_value, max_digits, decimal_places, max_denominator, max_multiplicand_digits, min_value

---

## Step 2: Audit All 10 Curriculum MD Files
**Status: COMPLETED**

### Objective:
Assess completeness and accuracy of each curriculum MD file against official ICSE/CISCE sources. Identify gaps before building CAMs.

### Note on Primary Classes (1-5):
CISCE does not publish detailed prescriptive syllabi for primary classes the way it does for Classes 9-12. The primary curriculum is a broad framework with school latitude. Audit for Grades 1-4 is based on multiple reputable educational platforms (BYJU'S, EuroSchool, Vedantu, Shaalaa, etc.) that aggregate what ICSE-affiliated schools typically teach.

### Results Summary:

| Grade | File | Completeness | Primary Issue | Rating |
|-------|------|-------------|--------------|--------|
| 1 | Grade-1.md | 90% | Multiplication theme is out of scope (belongs in Grade 2) | NEEDS MINOR FIXES |
| 2 | Grade-2.md | 85% | Some topics too advanced (division, formal geometry, tables 6-9) | NEEDS MINOR FIXES |
| 3 | Grade-3.md | 85% | Significant scope creep (BODMAS, mean/median/mode, Euler's formula pulled from Grade 4-5) | NEEDS MINOR FIXES |
| 4 | Grade-4.md | 85% | Number range should be 6 digits not 5; scope creep (probability, simple interest, reasoning puzzles) | NEEDS MINOR FIXES |
| 5 | Grade-5.md | **0%** | **File did not exist. CAM exists but no MD file. Missing Profit/Loss, Unitary Method, Symmetry.** | **NEEDS MAJOR ENRICHMENT** |
| 6 | Grade-6.md | **15%** | **Only Theme 1 (Number System) present. File truncated — ~85% of syllabus missing.** | **NEEDS MAJOR ENRICHMENT** |
| 7 | Grade-7.md | 85% | Missing mean/median/mode, circles, circumference; has `[web:XX]` and LaTeX artifacts | NEEDS MINOR FIXES |
| 8 | Grade-8.md | 80% | Some out-of-scope content (Real Numbers, 2-var equations, Cartesian products); missing exponents standalone, 3D representation | NEEDS MINOR FIXES |
| 9 | Grade-9.md | **40%** | **Geometry is a vague placeholder (~12 chapters in 4 bullets). Missing: Pythagoras, Similarity, Area Theorems, Constructions. Heavy hedge language.** | **NEEDS MAJOR ENRICHMENT** |
| 10 | Grade-10.md | **70%** | **Missing 4 entire chapters: Probability, Shares & Dividends, Matrices, Ratio & Proportion. Frustums listed but excluded from ICSE.** | **NEEDS MAJOR ENRICHMENT** |

### Detailed Findings Per Grade:

#### Grade 1 — NEEDS MINOR FIXES
- **Remove**: Theme 4 (Multiplication Introduction) — belongs in Grade 2, not Grade 1
- **Demote**: Bar graphs in Data Handling — keep pictographs as primary
- **Renumber**: Themes after removing Multiplication

#### Grade 2 — NEEDS MINOR FIXES
- **Reduce**: Multiplication tables from 2-10 to 2, 3, 4, 5, 10 only (tables 6-9 → Grade 3)
- **Remove/simplify**: Division section — keep only informal equal sharing/grouping (formal division → Grade 3)
- **Remove**: Formal geometry concepts (point, line, line segment, ray) → Grade 3-4
- **Soften**: 3-digit addition/subtraction with regrouping (standard scope is 2-digit regrouping)
- **Remove**: Tessellations

#### Grade 3 — NEEDS MINOR FIXES
- **Remove**: BODMAS/PEMDAS → Grade 4
- **Simplify**: Fractions — remove improper/mixed/equivalent/operations; keep concept + unit fractions + like-denominator comparison
- **Remove**: Mean/median/mode, double bar graphs, line graphs from Data Handling
- **Remove**: Euler's formula, nets of 3D shapes, surface area/volume concepts
- **Remove**: Protractor/angle measurement → Grade 4
- **Remove**: Lattice multiplication, Fibonacci/square/triangular numbers
- **Remove**: Profit/loss from Money → Grade 4
- **Remove**: Rs 2000 denomination (withdrawn by RBI in 2023)

#### Grade 4 — NEEDS MINOR FIXES
- **Extend**: Number range to 6 digits (up to 9,99,999)
- **Add**: Unitary Method
- **Remove**: Probability theme entirely → Grade 6
- **Remove**: Simple interest, Vedic math, coding-decoding/blood relations/Sudoku reasoning puzzles
- **Remove**: Complementary/supplementary/adjacent/vertically opposite angles → Grade 5-6
- **Remove**: Cross-sections of 3D shapes, constructing triangles → Grade 5+
- **Trim**: Divisibility rules to 2, 3, 5, 9, 10 only

#### Grade 6 — NEEDS MAJOR ENRICHMENT
- **File is truncated**: Only 45 lines, contains only Theme 1 (Number System)
- **Must add all missing units**: HCF/LCM, Sets, Ratio & Proportion, Unitary Method, Fractions, Decimals, Percentage, Speed/Distance/Time, Algebra, Geometry (angles, lines, triangles, quadrilaterals, polygons, circles), Symmetry & Constructions, Recognition of Solids, Mensuration, Data Handling, Mean & Median
- **Strip**: All `[web:XX]` citation artifacts (13+ occurrences in just 45 lines)

#### Grade 7 — NEEDS MINOR FIXES
- **Add**: Mean/Median/Mode to Data Handling
- **Add**: Circles to Geometry; Circumference of a Circle to Mensuration
- **Add**: Time and Work under Unitary Method
- **Strip**: All `[web:XX]` citation artifacts (50+ instances)
- **Fix**: LaTeX/Pandoc artifacts (`{=tex}` tagged expressions)

#### Grade 8 — NEEDS MINOR FIXES
- **Add**: Standalone Exponents and Powers section (currently buried under Rational Numbers)
- **Add**: Direct/Inverse Variations, Time and Work
- **Add**: Representing 3-D in 2-D (polyhedrons, nets, Euler's formula)
- **Add**: Division of algebraic expressions; Construction of quadrilaterals
- **Remove**: Real Numbers (Introductory) → Grade 9
- **Remove**: Introduction to Equations in Two Variables → Grade 9
- **Remove/simplify**: Cartesian Product, Ordered Pairs, Functions from Sets → keep basic sets only

#### Grade 9 — NEEDS MAJOR ENRICHMENT
- **Expand Geometry massively** — currently 4 vague bullets covering ~12 official chapters. Must add:
  - Triangles (Congruency) with SSS/SAS/ASA/AAS/RHS
  - Isosceles Triangles (theorem + converse)
  - Inequalities in Triangles
  - Mid-point Theorem + Equal Intercept Theorem
  - Pythagoras Theorem (proof + applications)
  - Rectilinear Figures / Quadrilaterals (detailed properties)
  - Similarity (basic concepts)
  - Area Theorems (same base, between parallels)
  - Circle (chords, arcs, angles, segments, sectors)
- **Add**: Constructions (polygon + triangle)
- **Add**: Graphical Solution of Simultaneous Equations
- **Add**: Complementary angles in Trigonometry
- **Expand**: Compound Interest, Mensuration with specific shapes/formulas
- **Remove**: All hedge language ("as per board", "as per ICSE scope", "exact theorem list is defined by CISCE")
- **Remove**: "possibly cones" from Mensuration (cones → Grade 10)

#### Grade 10 — NEEDS MAJOR ENRICHMENT
- **Add 4 missing chapters**:
  - Probability (random experiments, sample space, basic probability)
  - Shares and Dividends (nominal/market value, dividend, return, brokerage)
  - Matrices 2x2 (operations, multiplication, solving matrix equations)
  - Ratio and Proportion (componendo, dividendo, alternendo, invertendo)
- **Add**: Geometric Progression (general term, sum of n terms)
- **Add**: Loci (locus theorems, constructions involving loci)
- **Add**: Reflection (in axes, origin, line y=x)
- **Add**: Factor and Remainder Theorem explicitly
- **Remove**: Frustums (excluded from ICSE Class 10)
- **Remove/reclassify**: Unit 1 "Pure Arithmetic" as standalone unit (fold surds into Algebra)
- **Remove**: "Trigonometric equations" (only identities are in scope)
- **Replace**: Vague placeholder language with actual enumerated content

---

## Step 3: Enrich MD Files
**Status: COMPLETED**

### Objective:
Fix and enrich curriculum MD files based on gap report findings.

### Actions Completed:
- [x] **Grade 1**: Removed Multiplication theme (Grade 2 content), demoted bar graphs, renumbered themes
- [x] **Grade 2**: Reduced multiplication tables to 2-10→2,3,4,5,10; simplified division; removed formal geometry concepts; softened 3-digit regrouping; removed tessellations
- [x] **Grade 3**: Removed BODMAS, simplified fractions, removed mean/median/mode, line graphs, Euler's formula, protractor, lattice multiplication, Fibonacci numbers, profit/loss, Rs 2000
- [x] **Grade 4**: Extended numbers to 6 digits, added Unitary Method, removed probability/simple interest/competitive exam topics/Vedic math/advanced angles/cross-sections/constructing triangles, trimmed divisibility rules
- [x] **Grade 5**: CREATED from scratch (was entirely missing) — 10 themes from CAM + added Profit & Loss, Unitary Method, Symmetry
- [x] **Grade 6**: REWRITTEN completely (was only 15% done) — all 15 themes added, [web:XX] artifacts stripped
- [x] **Grade 7**: Added mean/median/mode, circles, circumference; added time & work; stripped 50+ [web:XX] artifacts; fixed all LaTeX/Pandoc artifacts
- [x] **Grade 8**: Added standalone Exponents, Direct/Inverse Variations, 3D representation, algebraic division, quadrilateral constructions; removed Real Numbers/2-var equations/Cartesian products
- [x] **Grade 9**: MAJOR rewrite — Geometry expanded from 4 bullets to 9 detailed sections; added Constructions, Graphical Solutions, Complementary Angles, Similarity; expanded Compound Interest, Mensuration, Statistics; removed all hedge language
- [x] **Grade 10**: Added 4 missing chapters (Probability, Shares & Dividends, Matrices, Ratio & Proportion); added GP, Loci, Reflection, Factor/Remainder Theorem; removed frustums, dissolved Pure Arithmetic unit, removed trig equations

### Deliverable:
- All 10 MD files in `Fundamentals/ICSE/Maths/` are now complete and accurate

---

## Step 3b: Re-Audit MD Files Against Official PDFs
**Status: COMPLETED (Grades 4-8); SKIPPED (Grade 3)**

### Objective:
Compare each MD file line-by-line against the official CISCE PDF syllabi (located in `Fundamentals/ICSE/Maths/PDFs/`). PDFs available for Grades 3, 4, 5, 6, 7, 8.

### Results:

| Grade | Changes | Key Changes | Confidence |
|-------|---------|-------------|------------|
| 1 | — | No PDF available; web-source based | ~70% |
| 2 | — | No PDF available; web-source based | ~70% |
| 3 | SKIPPED | PDF is "Property of the Government of Kenya" — not ICSE. Skipped. | ~65-70% |
| 4 | 6 | Removed 5 fabricated sub-bullets (Roman Numerals, Patterns), 1 wording fix (Perimeter) | ~90% |
| 5 | 17 | Removed Unitary Method (out of scope), moved Symmetry to Theme 10, corrected overview/assessment/resources, added circle properties, fraction notation | ~90% |
| 6 | ~25 | **Major restructure**: 15 themes → 6 themes to match PDF; removed all fabricated Scope sections; corrected bullet wording/ordering throughout; renamed sections | ~90% |
| 7 | ~52 | 35 removals (parenthetical elaborations not in PDF), 13 additions (merged bullets split), 4 structural corrections (section moved to correct theme) | ~90% |
| 8 | 2 | Two title corrections: "Rational Numbers (Extension)" → "Rational Numbers", "Exponents and Powers" → "Exponents". PDF was TOC-only. | ~80% |
| 9 | — | No PDF available; web-source based | ~75% |
| 10 | — | No PDF available; web-source based | ~75% |

### Detailed Changes Per Grade:

#### Grade 4 (6 changes)
- REMOVED: 3 fabricated sub-bullets under Roman Numerals (PDF lists heading only)
- REMOVED: 2 fabricated sub-bullets under Patterns (PDF lists heading only)
- CORRECTED: Perimeter bullet wording to match PDF exactly

#### Grade 5 (17 changes)
- REMOVED: Entire "Unitary Method" subsection (not in PDF)
- REMOVED: "Symmetry" from Theme 6 Geometry (PDF places it under Theme 10 Geometric Patterns)
- ADDED: Symmetry to Theme 10 Geometric Patterns (line of symmetry, rotational symmetry)
- REMOVED: Angle sum property from Polygons
- REMOVED: "Chord" from Circle terminology (PDF: center, radius, diameter, circumference only)
- ADDED: "Properties of circles" and "Fraction notation and representation on a number line"
- REMOVED: Profit and Loss from Theme 7 (PDF covers it under Theme 8 Percentage)
- CORRECTED: Addition/Subtraction scope, Order of Operations, Multiplication section, Time section, Number Patterns
- CORRECTED: Overview paragraph, Assessment section, Recommended Resources, Closing paragraph

#### Grade 6 (major restructure, ~25 changes)
- RESTRUCTURED: 15 themes → 6 themes (merged Sets, Fractions, Decimals, Playing with Numbers into Theme 1; merged Unitary Method, Percentage, Speed/Time/Distance into Theme 2; etc.)
- REMOVED: All fabricated "In scope" / "Not in scope" sections
- REMOVED: Fabricated learning outcomes across multiple themes
- CORRECTED: Bullet wording, ordering, and groupings throughout
- RENAMED: "Symmetry" → "Linear Symmetry", "Speed, Distance and Time" → "Speed, Time and Distance"

#### Grade 7 (52 changes)
- REMOVED (35): Parenthetical elaborations not in PDF (e.g., "(SSS, SAS, ASA)", "(sum of angles is 180 degrees)", "(using BODMAS)", formula details)
- ADDED (13): Bullets that were merged in MD but separate in PDF (e.g., "Activity to derive a rule for multiplication of fractions", "Transposition" as separate bullet)
- CORRECTED (4): Section 12 moved from Theme 3 to Theme 2; wording fixes to match PDF exactly

#### Grade 8 (2 changes)
- CORRECTED: "Rational Numbers (Extension)" → "Rational Numbers"
- CORRECTED: "Exponents and Powers" → "Exponents"
- Note: PDF was table of contents only — detailed bullet content could not be verified beyond chapter names

---

## Step 4: Build CAMs — One Class at a Time (Bottom-Up)
**Status: IN PROGRESS**

### Order: Class 1 → 2 → 3 → 4 → 6 → 7 → 8 → 9 → 10
(Class 5 already done — skip)

### Actions per class:
- [ ] **4a**: Build CAM JSON following schema and Class 5 template
- [ ] **4b**: Ensure `out_of_scope` correctly references lower/higher grade coverage
- [ ] **4c**: Run CAM validator (`node cam/validation/cam-validator.js`)
- [ ] **4d**: User reviews and approves before proceeding to questions

### Deliverables per class:
- `cam/data/icse-class{N}-mathematics-cam.json`
- Copy to `coolscool-web/public/cam/data/`

### Progress:

| Class | CAM Created | Validator Passed | User Approved | Notes |
|-------|------------|-----------------|---------------|-------|
| 1 | YES | YES | Pending | 7 themes, 24 topics, 106 concepts |
| 2 | YES | YES | Pending | 6 themes, 23 topics, 110 concepts |
| 3 | YES | YES | Pending | 8 themes, 29 topics, 132 concepts |
| 4 | YES | YES | Pending | 7 themes, 15 topics, 73 concepts |
| 6 | YES | YES | Pending | 6 themes, 26 topics, 108 concepts |
| 7 | YES | YES | Pending | 6 themes, 25 topics, 124 concepts |
| 8 | YES | YES | Pending | 8 themes, 22 topics, 96 concepts |
| 9 | YES | YES | Pending | 9 themes, 29 topics, 120 concepts |
| 10 | YES | YES | Pending | 8 themes, 25 topics, 101 concepts |

---

## Step 5: Generate Questions — One Class at a Time (Same Order)
**Status: NOT STARTED**

### Actions per class:
- [ ] **5a**: Generate 50 questions per topic (mcq, fill_blank, true_false, match, ordering)
- [ ] **5b**: Include canonical explanations per topic
- [ ] **5c**: Run question validator (`node questions/validation/question-validator.js`)
- [ ] **5d**: Run question auditor (`node questions/validation/question-auditor.js`)
- [ ] **5e**: Fix all errors, re-run until clean
- [ ] **5f**: User spot-checks a sample before moving to next class

### Deliverables per class:
- `questions/data/T##.##-{topic-slug}.json` (one per topic)
- Copy to `coolscool-web/public/questions/data/`

### Progress:

| Class | Topics | Questions Generated | Validator Clean | Auditor Clean | User Approved |
|-------|--------|-------------------|----------------|---------------|---------------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

---

## Step 6: Enhance Auditor Incrementally
**Status: NOT STARTED**

### Objective:
Add new audit rules as new concept types appear in higher classes. Each rule is tested immediately against that class's questions.

### Planned Enhancements:

| Class | New Concept Types | Audit Rules to Add |
|-------|------------------|-------------------|
| 1 | Basic counting, addition/subtraction within 20 | Verify sums/differences within 20, counting sequence checks |
| 2 | 3-digit numbers, multiplication tables, division intro | Verify multiplication table answers, division with remainder |
| 3 | 4-digit numbers, fractions, Roman numerals (I-XX) | Fraction equivalence checks, Roman numeral conversion verification |
| 4 | 5-digit numbers, decimals, HCF/LCM, Roman (I-L) | Decimal arithmetic verification, HCF/LCM computation checks |
| 6 | Integers, basic algebra, ratio/proportion | Integer operation signs, algebraic expression evaluation |
| 7 | Rational numbers, exponents, profit/loss, simple interest | Rational number arithmetic, SI formula verification, profit/loss % |
| 8 | Algebraic identities, compound interest, coordinate geometry | Identity expansion verification, CI formula, coordinate plotting |
| 9 | Surds, simultaneous equations, trigonometry, logarithms | Surd simplification, trig ratio values, log law verification |
| 10 | Quadratic equations, AP, circle theorems, statistics (grouped) | Discriminant checks, AP formula, ogive/histogram data verification |

### Progress:

| Class | Rules Added | Rules Tested | Notes |
|-------|------------|-------------|-------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |
| 10 | | | |

---

## Step 7: Cross-Class Boundary Verification
**Status: NOT STARTED**

### Objective:
Final pass after all classes are complete. Verify consistency across the entire Class 1-10 system.

### Checks:
- [ ] No scope overlaps: Class N's `in_scope` doesn't duplicate Class N-1 inappropriately
- [ ] No scope gaps: Nothing falls between two classes
- [ ] Numeric limits progress sensibly (1→99→999→9999→99999→larger)
- [ ] Concept IDs are unique across all CAMs
- [ ] Topic IDs don't collide across classes (each class has its own namespace)
- [ ] Difficulty distribution is appropriate per class level
- [ ] Question types are appropriate per class level (e.g., Class 1 may not need match/ordering)

### Deliverable:
- Cross-class consistency report (documented here)

---

## Review Gates

| Gate | After Step | What User Reviews | Blocking? |
|------|-----------|-------------------|-----------|
| Gate 1 | Step 2 | Gap report for all MD files | Yes — must approve before enrichment |
| Gate 2 | Step 4d | Each class's CAM | Yes — must approve before questions |
| Gate 3 | Step 5f | Each class's question bank (spot-check) | Yes — must approve before next class |
| Gate 4 | Step 7 | Cross-class consistency report | Yes — final sign-off |

---

## Continuation Prompt Template

When starting a new thread, copy-paste this prompt:

```
I am building ICSE Mathematics CAM and Question Banks for Classes 1-10.

CONTEXT:
- Project: D:\CoolSCool
- Master Plan: D:\CoolSCool\MasterPlan.md (READ THIS FIRST — it has full context, progress, and architecture)
- Existing Class 5 system is the template (study it before building any CAM):
  - CAM: cam/data/icse-class5-mathematics-cam.json (1,740 lines, 10 Themes, 32 Topics, 163 Concepts)
  - CAM Schema: cam/schema/cam-schema.json
  - CAM Validator: cam/validation/cam-validator.js
  - Question Schema: questions/schema/question-schema.json
  - Question Validator: questions/validation/question-validator.js
  - Question Auditor: questions/validation/question-auditor.js
  - Example questions: questions/data/ (32 JSON files for Class 5)
- Curriculum MD files: Fundamentals/ICSE/Maths/Grade-{N}.md (these are the authoritative source for each class's syllabus content)
- Official PDFs (where available): Fundamentals/ICSE/Maths/PDFs/ (Grades 4-8 have been audited against these)

WHAT HAS BEEN COMPLETED:
- Steps 0-3b: All curriculum MD files created, audited, enriched, and re-audited against official PDFs
- MD files for Grades 4, 5, 6, 7, 8 are ~90% confident (verified against official PDFs)
- MD files for Grades 1, 2, 9, 10 are ~70-75% confident (web-source based, no official PDFs)
- Grade 3 MD is ~65-70% confident (PDF was Kenya CBC, not ICSE — skipped re-audit)

CURRENT STATUS:
- Step 4 (Build CAMs) is IN PROGRESS — read MasterPlan.md Step 4 progress table for which classes are done

INSTRUCTIONS:
1. Read MasterPlan.md to understand exactly where we left off (check Step 4 progress table)
2. Continue from the current step — pick up where the last thread stopped
3. Use parallel agents where possible WITHOUT compromising accuracy or quality
4. Update MasterPlan.md as you complete each task (progress tables, change log)
5. At review gates, pause and present findings for user approval before proceeding
6. Follow the bottom-up order: Class 1 → 2 → 3 → 4 → 6 → 7 → 8 → 9 → 10
7. Every CAM must pass the validator (`node cam/validation/cam-validator.js <path>`) before presenting for review
8. Every question bank must pass both validator and auditor before presenting for review
9. Enhance the auditor incrementally as new concept types appear
10. For each CAM: read the Grade-N.md file, read the Class 5 CAM as template, read the CAM schema, then build the CAM JSON. Run the validator. Fix errors. Repeat until clean.
11. CAM ID format: theme_id=T##, topic_id=T##.##, concept_id=T##.##.C##
12. Each topic needs: boundaries (in_scope[], out_of_scope[], numeric_limits{}), concepts with difficulty_levels
13. out_of_scope should reference what adjacent grades cover (e.g., "Covered in Class 6" or "Introduced in Class 4")

QUALITY REQUIREMENTS:
- Factual accuracy: All content must match the curriculum MD files (which are based on official ICSE/CISCE sources)
- No cascading errors: Bottom-up approach, each class verified before next
- Deterministic answers: All question answers pre-computed and verified
- Boundary correctness: in_scope/out_of_scope must align with adjacent classes
- Schema compliance: Every JSON must pass its validator with zero errors
- No fabricated content: Only include what's explicitly in the MD files
```

---

## Change Log

| Date | Step | Action | Notes |
|------|------|--------|-------|
| 2026-01-31 | Step 0 | Completed | Understood existing Class 5 system fully |
| 2026-01-31 | Plan | Master Plan documented | MasterPlan.md created |
| 2026-01-31 | Step 2 | Completed | All 10 MD files audited against official ICSE sources (Grade 5 had no MD file) |
| 2026-01-31 | Step 3 | Completed | All 10 MD files fixed/enriched in parallel — Grades 5, 6, 9, 10 were major rewrites |
| 2026-01-31 | Step 3b | Completed | Re-audited Grades 4-8 against official PDFs. Grade 3 skipped (PDF is Kenya CBC). Grade 4: 6 fixes. Grade 5: 17 fixes. Grade 6: major restructure (15→6 themes). Grade 7: 52 fixes. Grade 8: 2 title fixes. |
| 2026-01-31 | Step 4 | Started | Beginning CAM construction, bottom-up from Class 1 |
| 2026-01-31 | Step 4 | All CAMs built | Classes 1-4 built first, then 6-10 in parallel. All 9 passed validation. Awaiting user review. |
