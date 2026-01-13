# Unified North Star & Build Constitution
## Pressure‑free Curriculum Practice App

---

## 1. Purpose of This Document

This document is the **single source of truth** for building the MVP and future versions of the app.

Any AI system, developer, or contributor must treat this as:
- The **North Star**
- The **constitutional contract**
- The **decision filter** for all build choices

If any instruction, feature, or idea conflicts with this document, it must be rejected.

---

## 2. What This App Is (and Is Not)

### 2.1 What This App IS

- A **pressure‑free practice environment** aligned strictly to official school curricula
- A **chapter‑ and topic‑wise quiz app** for Classes 1–10
- A **self‑paced, private learning companion**
- A tool for **exam familiarity and conceptual reinforcement**

### 2.2 What This App Is NOT

- Not coaching, teaching, tutoring, or content delivery
- Not competitive (no leaderboards, ranks, peer comparison)
- Not gamified via rewards, streaks, or pressure mechanics
- Not adaptive beyond syllabus scope

---

## 3. Target Users

- **Primary user:** Child (Grades 1–10)
- **Secondary viewer:** Parent (read‑only progress summary)

No teachers, schools, administrators, or institutions are stakeholders in this app.

---

## 4. Core Learning Philosophy (Frozen)

1. Learning improves through **repetition without judgement**
2. Familiarity reduces exam anxiety
3. Progress is personal, not comparative
4. Accuracy and trust matter more than engagement tricks
5. Children should compete only with their **previous self**

---

## 5. Curriculum Authority Model (CAM) – Frozen

### 5.1 CAM Definition

All content is derived from a **Concept Authority Map (CAM)** that is:
- Board‑specific
- Class‑specific
- Subject‑specific
- Chapter‑ and Topic‑scoped

### 5.2 CAM v1.0 (MVP Scope)

- Board: ICSE
- Class: 5
- Subject: Mathematics
- Coverage: 100% of officially prescribed topics

CAM is the **only authority** for:
- What can be asked
- What cannot be asked
- Topic boundaries

---

## 6. Question Quality & Difficulty (Frozen)

### 6.1 Difficulty Taxonomy

Each topic must include:
- Familiarity questions (concept recognition)
- Application questions (direct usage)
- Exam‑style questions (word problems, framing variants)

No trick questions.
No multi‑concept questions.

---

## 7. Question Density & Coverage (Frozen)

- Each topic has a **finite question set**
- Questions are reused across attempts
- Variance comes from ordering, format, and timing — not infinite generation

This ensures:
- Exam realism
- Trust
- No hallucinations

---

## 8. Quiz Session Rules (Frozen)

### 8.1 Time Modes (User‑Chosen)

- Unlimited time (learning mode)
- 10 minutes
- 5 minutes
- 3 minutes

Timers are framed as **practice styles**, never pressure.

### 8.2 Session Behaviour

- One question at a time
- No negative marking
- No forced completion

---

## 9. Proficiency, Not Marks (Frozen)

- No percentages
- No scores
- No ranks

Progress is shown as **Proficiency Bands**, such as:
- Building familiarity
- Growing confidence
- Consistent understanding
- Exam‑ready

Bands are computed **per topic**, over repeated attempts.

---

## 10. Canonical Explanation Policy (Frozen)

### 10.1 Purpose

Explanations exist only to answer:
> *Why is this answer correct according to the syllabus concept?*

### 10.2 Authority

- Explanations are authored at the **Topic level**
- Questions reference explanations; they never generate them

### 10.3 Rules

- 2–4 factual sentences
- No teaching, no worked steps
- Same explanation shown whether answer is right or wrong
- Locked after approval

---

## 11. Accuracy & Safety Protocol

- No live generation of answers or explanations
- All answers are deterministic
- All content is CAM‑validated
- Any uncertainty must result in rejection, not guessing

Child trust is non‑negotiable.

---

## 12. UX & Tone Principles

- Calm
- Encouraging
- Neutral
- Private

Language must:
- Avoid judgement
- Avoid hype
- Avoid competition

---

## 13. MVP Scope (Explicit)

### Included
- ICSE Class 5 Maths
- Topic‑wise quizzes
- Multiple time modes
- Proficiency tracking

### Excluded
- Multi‑class support
- Multi‑board support
- Social features
- AI teaching

---

## 14. Build Phasing (Mandatory)

Phase 1: CAM ingestion & validation
Phase 2: Question bank creation
Phase 3: Quiz engine
Phase 4: Proficiency logic
Phase 5: UX polish

Each phase must pass review before the next begins.

---

## 14.1 Phase Completion Status

| Phase | Description | Status | Date | Artifacts |
|-------|-------------|--------|------|-----------|
| 1 | CAM ingestion & validation | **COMPLETE** | 2026-01-07 | `cam/data/icse-class5-mathematics-cam.json`, `cam/schema/cam-schema.json`, `cam/validation/cam-validator.js` |
| 2 | Question bank creation | **COMPLETE** | 2026-01-07 | `questions/data/*.json` (32 files), `questions/schema/question-schema.json`, `questions/validation/question-validator.js` |
| 3 | Quiz engine | **COMPLETE** | 2026-01-08 | `quiz-engine/quiz-engine.js`, `quiz-engine/core/*.js`, `quiz-engine/persistence/*.js`, `quiz-engine/schema/*.json` |
| 4 | Proficiency logic | **COMPLETE** | 2026-01-08 | Integrated into Phase 3 Quiz Engine (`proficiency-calculator.js`) |
| 5 | UX polish | **COMPLETE** | 2026-01-08 | `ui/index.html`, `ui/css/styles.css`, `ui/js/app.js`, `ui/js/quiz-engine-browser.js` |

### Phase 1 Summary (CAM)
- **Themes:** 10
- **Topics:** 32
- **Concepts:** 163
- **Boundaries defined:** 32 (100%)
- **Validation:** PASSED
- **Full Report:** `cam/CAM_PHASE1_SUMMARY.md`

### Phase 2 Summary (Question Bank)
- **Total Questions:** 1,600
- **Topics Covered:** 32 (100%)
- **Questions per Topic:** 50
- **By Difficulty:** Familiarity (~530), Application (~620), Exam Style (~450)
- **By Type:** MCQ (~1,300), Fill-blank (~180), True/False (~70), Match (~25), Ordering (~25)
- **Validation:** PASSED (0 errors)
- **Full Report:** `questions/QUESTIONS_PHASE2_SUMMARY.md`

### Phase 3 Summary (Quiz Engine)
- **Core Modules:** 4 (mastery-tracker, proficiency-calculator, question-selector, session-manager)
- **Persistence Modules:** 2 (storage-manager, export-manager)
- **Schemas:** 2 (progress-schema, session-schema)
- **Time Modes:** 4 (Unlimited, 10min, 5min, 3min)
- **Proficiency Bands:** 5 (Not Started, Building Familiarity, Growing Confidence, Consistent Understanding, Exam Ready)
- **XP System:** 10/20/30 points per familiarity/application/exam_style
- **Mastery Threshold:** 4/5 correct to advance difficulty
- **North Star Compliance:** §8, §9, §10, §11, §12 - PASSED
- **Full Report:** `quiz-engine/QUIZ_ENGINE_PHASE3_SUMMARY.md`

### Phase 4 Summary (Proficiency Logic)
- **Status:** Integrated into Phase 3
- **Implementation:** `quiz-engine/core/proficiency-calculator.js`
- **Features:** Topic-level proficiency bands, concept mastery aggregation, child-friendly messages

### Phase 5 Summary (UX Polish)
- **UI Files:** 4 (index.html, styles.css, app.js, quiz-engine-browser.js)
- **Views:** 5 (Loading, Home/Topics, Quiz, Summary, Settings)
- **Modals:** 2 (Time mode selection, Reset confirmation)
- **Design Principles:** Calm (soft colors), Encouraging (positive messages), Neutral (no judgement), Private (localStorage only)
- **Accessibility:** WCAG 2.1 AA compliant (contrast, focus, touch targets, keyboard navigation)
- **Responsive:** Mobile-first, breakpoints at 480px, 768px, 1024px
- **Question Types:** MCQ, True/False, Fill-blank, Ordering
- **Features:** Topic browser by theme, time mode selection, quiz session with timer, answer feedback with explanations, session summary with proficiency display, settings with export/import/reset
- **Offline:** Works after initial load
- **Full Report:** `ui/PHASE5_UX_SUMMARY.md`

---

## 15. Decision Filter (Mandatory)

Any feature or change must satisfy ALL:
1. Preserves syllabus accuracy
2. Preserves pressure‑free learning
3. Preserves board isolation
4. Preserves child trust

If not, reject.

---

## Final Guiding Statement

> **This app is a quiet, reliable companion for children — not a judge, not a coach, and not a competition.**

This document governs all future work.

