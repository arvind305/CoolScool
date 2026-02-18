# Question Deduplication & Cognitive Depth — Full Rollout Plan

## Problem

Students see repetitive questions across sessions. The Cognitive Depth Framework was designed and documented (`COGNITIVE-DEPTH-FRAMEWORK.md`, `DEVELOPMENT_GUIDE.md`) but only partially implemented:

- **DB column exists** (`cognitive_level` on `questions` table via migration 008) but all rows default to `'recall'`
- **Seed script ignores** the `cognitive_level` field from JSON files — it's not in the INSERT statement
- **Recency penalty logic** is written (`getRecencyPenalty()`, `RECENCY_PENALTIES`) but **never called** in `buildQuestionPool()`
- **Only 2 of 1,032 question files** have `cognitive_level` tags (class7-biology vertebrates, class3 mental-maths)
- **Cognitive variety balancer** runs but is a no-op since every question is `'recall'`

## Current State (What Works)

- Hard exclusion of correctly-answered questions (never shown again)
- Soft exclusion of wrong answers (re-enter pool after 2 sessions)
- Adaptive priority scoring (+100 recommended difficulty, +50 new concept, etc.)
- Mastery progression (4/5 rolling window per difficulty tier)
- Concept interleaving for variety
- Cognitive variety balancing algorithm (ready, but starved of data)

## Rollout Layers

### Layer 1: Fix the Plumbing (Code Changes)
> **Status: COMPLETE**

Two code fixes to make the existing infrastructure actually work:

#### 1a. Update seed script to persist `cognitive_level`

**File:** `coolscool-backend/scripts/seed-questions.ts`

- Add `cognitive_level` to the `Question` interface (optional string, defaults to `'recall'`)
- Add `cognitive_level` to the INSERT column list and VALUES
- Add `cognitive_level` to the ON CONFLICT UPDATE clause
- Read `q.cognitive_level || 'recall'` from each question JSON

#### 1b. Wire recency penalties into priority scoring

**File:** `coolscool-backend/src/services/session.service.ts`

- In `buildQuestionPool()` (line ~975), replace the simple `neverSeen ? 20 : 0` with a call to `getRecencyPenalty(history?.sessionsAgo)`
- This uses the already-defined `RECENCY_PENALTIES` constants:
  - Last session: -80
  - 2 sessions ago: -50
  - 3 sessions ago: -30
  - 4+ sessions ago: -10
  - Never seen: +20

#### 1c. Verify & test

- TypeScript compiles (`npx tsc --noEmit`)
- Existing tests pass
- Manual verification: seed one file with cognitive_level tags, confirm DB has correct values

---

### Layer 2: Tag All Question Files (~1,032 files)
> **Status: COMPLETE**

Add `cognitive_level` field to every question in every JSON file. Tagging rules:

| Pattern in question_text | Level |
|---|---|
| Direct fact, fill-in-the-blank, "What is...", "Name the..." | `recall` |
| "How does X differ from Y", "Which has more/less" | `compare` |
| Given features → identify category, "belongs to class ___" | `classify` |
| Story/character/real-world situation (Riya, Amit, zoo, farm) | `scenario` |
| Tricky/misleading, tests misconception, "Which of these is actually..." | `exception` |
| "Why", "Explain why", "Give a reason" | `reason` |

This is the bulk work — 1,032 files with varying question counts. Can be done programmatically for obvious patterns, then reviewed manually.

**Approach:** Write a Node.js script that:
1. Reads each JSON file
2. For questions without `cognitive_level`, analyses question_text patterns to auto-tag
3. Writes updated file back
4. Generates a summary report of tags assigned

---

### Layer 3: Expand Question Pools (Content Creation)
> **Status: PENDING**

After tagging reveals the gaps, generate additional questions to hit 80-100 per topic with proper cognitive level distribution. This is a content-creation task, not a code task.

---

## Completion Log

| Layer | Date | Notes |
|---|---|---|
| 1a | 2026-02-18 | Added `cognitive_level` to seed-questions.ts INSERT + ON CONFLICT + interface |
| 1b | 2026-02-18 | Replaced `neverSeen ? 20 : 0` with `getRecencyPenalty(history?.sessionsAgo)` in buildQuestionPool() |
| 1c | 2026-02-18 | Backend: tsc clean, 101/101 tests pass. Frontend: pre-existing test type errors only (unrelated). |
| 2 | 2026-02-18 | Auto-tagged 57,499 questions across 1,030 files. Distribution: 89% recall, 5.6% scenario, 2.1% classify, 1.2% compare, 1.1% exception, 1.0% reason. 568 files >90% recall (mostly maths computation — expected). Script: `scripts/tag-cognitive-levels.js` |
| 3 | — | |
