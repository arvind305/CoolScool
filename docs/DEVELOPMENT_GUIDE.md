# CoolSCool Development Guide

Standardised architecture and patterns for building features in the CoolSCool app. Every new feature must follow these conventions.

---

## 1. Core Principle: Backend-Driven Logic

**All business logic lives on the backend.** The frontend is a thin rendering layer.

| Responsibility | Where it lives |
|---|---|
| Question selection & ordering | Backend (`session.service.ts`) |
| Answer checking & correctness | Backend (`session.service.ts`) |
| Mastery tracking & difficulty progression | Backend (`mastery.service.ts`) |
| XP calculation & awarding | Backend (`session.service.ts`) |
| Session lifecycle (create → start → complete) | Backend (`session.service.ts`) |
| Proficiency band calculation | Backend (`progress.controller.ts`) |
| Rendering UI, collecting user input | Frontend (Next.js pages + hooks) |
| Mapping backend types to UI types | Frontend (hooks) |

**Why:** A single source of truth for all quiz logic prevents frontend/backend drift, makes cheating harder, and allows mobile clients to use the same API without reimplementing logic.

---

## 2. Backend Architecture

### Layer Structure

```
Routes → Controller → Service → Model/DB
```

Each layer has a strict responsibility:

**Routes** (`src/routes/*.routes.ts`)
- Define HTTP endpoints and HTTP method
- Apply middleware: `authenticate`, `validate(schema)`, `rateLimiter`
- Call controller functions — nothing else

**Controllers** (`src/controllers/*.controller.ts`)
- Extract `req.user.id`, `req.params`, `req.body`
- Call ONE service function
- Shape the response as `{ success: true, data: { ... } }` with camelCase keys
- Pass errors to `next(error)` — never handle them manually

**Services** (`src/services/*.service.ts`)
- Contain all business logic
- Accept plain arguments (userId, sessionId, options), never `req`/`res`
- Call models/DB queries
- Throw typed errors (e.g. `NotFoundError`, `ValidationError`)
- Return plain objects

**Models** (`src/models/*.model.ts`)
- Database queries only (SELECT, INSERT, UPDATE)
- Export typed interfaces for DB rows
- No business logic

### Response Format

Every API response follows this shape:

```json
// Success
{
  "success": true,
  "data": {
    "session": { ... },
    "currentQuestion": { ... }
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "timeMode", "message": "..." }]
  }
}
```

The frontend `api` client auto-extracts `data` from success responses. So `api.post('/sessions', body)` returns the `data` object directly.

### Controller Response Conventions

- Use **camelCase** for all response keys (not snake_case)
- Always include `success: true` on success responses
- Controller maps snake_case DB fields to camelCase response fields:
  ```ts
  // DB row: session.session_status, session.time_mode
  // Response: status: session.session_status, timeMode: session.time_mode
  ```

### Database Migrations

Migrations live in `src/db/migrations/` and are numbered sequentially (`001_`, `002_`, etc.).

Rules:
1. **Always use `IF NOT EXISTS`** for CREATE TABLE and CREATE INDEX
2. **Never modify an existing migration** — create a new one
3. **Run manually** for now: `npx tsx scripts/run-one-migration.ts 010`
4. Each migration must have a descriptive comment at the top
5. The migration runner re-runs all files in order, so older migrations must not fail on re-run

Example:
```sql
-- Migration 010: Create question_attempts table for audit trail
CREATE TABLE IF NOT EXISTS question_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON question_attempts(user_id);
```

### Adding a New Backend Endpoint

1. Add the route in `src/routes/<domain>.routes.ts`
2. Add validation schema in `src/middleware/validate.ts` if needed
3. Create controller function in `src/controllers/<domain>.controller.ts`
4. Create service function in `src/services/<domain>.service.ts`
5. Create model queries in `src/models/<domain>.model.ts` if needed
6. Add any new tables via migration in `src/db/migrations/`

---

## 3. Frontend Architecture

### Layer Structure

```
Page (UI + state) → Hook (API orchestration) → API Service (HTTP calls) → API Client (auth + fetch)
```

**API Client** (`src/lib/api/client.ts`)
- Auto-injects Bearer token from NextAuth
- Auto-extracts `data` from `{ success, data }` responses
- Throws `APIError` on failures with structured error info
- Handles 401 → signs user out

**Endpoints** (`src/lib/api/endpoints.ts`)
- Centralised endpoint constants
- Dynamic endpoints are functions: `SESSION_START: (id) => \`/api/v1/sessions/${id}/start\``
- All new endpoints must be added here first

**API Services** (`src/services/<domain>-api.ts`)
- Typed wrappers around `api.get()` / `api.post()`
- Define TypeScript interfaces for all request/response shapes
- One file per domain (e.g. `session-api.ts`, `curriculum-api.ts`)
- Functions are simple — they call one endpoint and return typed data:
  ```ts
  export async function submitAnswer(
    sessionId: string,
    params: { userAnswer: string | string[]; timeTakenMs: number }
  ): Promise<BackendSubmitResult> {
    return api.post(ENDPOINTS.SESSION_ANSWER(sessionId), params);
  }
  ```

**Hooks** (`src/hooks/use-<feature>.ts`)
- Consume API services
- Manage React state (`useState`, `useRef`)
- Expose actions + state to page components
- Handle type mapping between backend and frontend types
- Handle optimistic updates and pre-fetching where applicable

**Pages** (`src/app/(public)/<route>/page.tsx`)
- Use hooks for all data and actions
- Manage local UI state only (which view to show, selected answer, timers)
- Render UI components from `src/components/`

### Type Mapping Pattern

Backend and frontend have different type conventions. **Map in the hook**, not in the page or API service.

```ts
// Backend type (from API service)
interface BackendQuestion {
  question_type: string;
  options: { id: string; text: string }[] | null;
  ordering_items_shuffled: string[] | null;
}

// Frontend type (used by UI components)
interface EnrichedQuestion {
  type: string;
  options: string[] | undefined;
  ordering_items: string[] | undefined;
}

// Mapping function (in the hook)
function mapBackendQuestion(q: BackendQuestion): EnrichedQuestion {
  return {
    type: q.question_type as EnrichedQuestion['type'],
    options: q.options?.map(opt => opt.text),
    ordering_items: q.ordering_items_shuffled || undefined,
    // ...
  };
}
```

### Auth Flow

1. User signs in via Google OAuth → NextAuth creates a session with `accessToken`
2. `APIClientInitializer` component (in layout) calls `useAuthToken()`
3. `useAuthToken()` configures the API client: `configureAPIClient({ getAccessToken: () => accessToken })`
4. Every `api.get()`/`api.post()` call auto-injects `Authorization: Bearer <token>`
5. On 401, the API client calls `onUnauthorized()` → signs user out

**All backend-facing features require authentication.** Check `access.isAuthenticated` before calling any session/progress APIs.

---

## 4. Quiz Session Lifecycle

This is the reference implementation. All interactive features should follow this lifecycle pattern.

### API Flow

```
POST /sessions           → Create session (backend selects questions)
POST /sessions/:id/start → Start session (NOT_STARTED → IN_PROGRESS)
POST /sessions/:id/answer → Submit answer (returns result + next question)
POST /sessions/:id/skip   → Skip question (returns next question)
POST /sessions/:id/end    → End session (IN_PROGRESS → COMPLETED/ABANDONED)
GET  /sessions/:id/summary → Get final stats
```

### Frontend State Machine

```
loading → ready → answering → feedback → ready → ... → summary
                                  ↑                        ↓
                                  └── (practice again) ←───┘
```

States:
- **loading**: Engine initialising, creating backend session
- **ready**: Question displayed, waiting for answer selection
- **answering**: User has selected an answer (submit button enabled)
- **feedback**: Answer submitted, showing correct/incorrect + explanation
- **summary**: Session complete, showing final stats + proficiency

### Pre-fetching Pattern

The backend returns `nextQuestion` in every answer/skip response. This eliminates an extra API call:

```
submitAnswer() response → { isCorrect, correctAnswer, nextQuestion, ... }
                                                          ↓
                                              stored in nextQuestionRef
                                                          ↓
                               user clicks "Next" → nextQuestion() reads from ref (no API call)
```

### Question Counter (Off-by-One Prevention)

**Critical rule:** `current_question_index` is NOT incremented when the user submits an answer. It is only incremented when the user advances to the next question.

Why: During the feedback phase, the header shows "Question 3 of 10". If we incremented on submit, it would show "Question 4 of 10" while still showing Question 3's feedback — confusing.

```
submitAnswer()  → updates: questions_answered++, questions_correct++, xp_earned++
                  does NOT update: current_question_index

nextQuestion()  → updates: current_question_index++
skipQuestion()  → updates: current_question_index++
```

### Session Auto-Completion

When the last question is answered, the backend automatically marks the session as `completed`. The frontend:
1. Detects `isSessionComplete: true` in the submit response
2. Still shows feedback for the last question
3. When user clicks "Next" after the last feedback, calls `endSession()` → `getSessionSummary()` → shows summary

The `endSession()` function skips the POST `/end` call if the session is already completed, and just fetches the summary.

---

## 5. Learning Engine: How Students Actually Learn

This is the heart of CoolSCool. Every question, every session, every topic must follow this framework. For the full philosophy and authoring examples, see `docs/COGNITIVE-DEPTH-FRAMEWORK.md`.

### The Problem We Solve

Most quiz apps test recall: "Fish breathe through ___". A student can answer 50 recall questions and still freeze on their school exam when asked: *"An animal has smooth moist skin, lays eggs in water, and its young breathe through gills. Identify the class and give a reason."*

**Knowing a fact** and **being able to use it** are different skills. Schools test both. CoolSCool must test both.

The second problem is **repetition**. When a student retakes a quiz and sees the same questions, they're practising recognition memory, not understanding. That gives confidence without competence.

### Two Orthogonal Dimensions

Every question has two independent tags:

**Difficulty tier** — how hard the question is:

| Tier | XP | When |
|------|-----|------|
| `familiarity` | 10 | First attempts at a concept |
| `application` | 20 | After familiarity is mastered |
| `exam_style` | 30 | After application is mastered |

**Cognitive level** — what kind of thinking it requires:

| Level | Code | What it tests | Example |
|-------|------|---------------|---------|
| Recall | `recall` | Name the fact | "Fish breathe through ___" |
| Compare | `compare` | Tell things apart | "How does Reptilia differ from Mammalia in heart chambers?" |
| Classify | `classify` | Sort by features | "An animal with dry scaly skin belongs to class ___" |
| Scenario | `scenario` | Apply to a situation | "Riya saw an animal at the zoo with fins and gills..." |
| Exception | `exception` | Handle tricky edge cases | "Which is a mammal: Shark, Penguin, Bat, or Crocodile?" |
| Reason | `reason` | Explain WHY | "Why is a dolphin classified as Mammalia, not Pisces?" |

These are orthogonal. A `familiarity + recall` question and an `exam_style + reason` question are miles apart — even if both are about the same concept.

### The Student Journey Across Sessions

| Session | What happens | Cognitive levels | Typical score |
|---------|-------------|------------------|---------------|
| 1 | First exposure — learning vocabulary | recall, easy classify | 7-8/10 |
| 2 | Entirely fresh questions — differentiating | compare, classify | 6-7/10 |
| 3 | 20+ questions excluded — applying to situations | scenario, compare | 6-7/10 |
| 4 | Tricky cases arrive | exception, reason | 5-6/10 |
| 5+ | Complex scenarios, multi-concept | all levels | Exam Ready |

Same concept tested across sessions, different cognitive angle each time. The student doesn't feel repetition because the THINKING required is different.

### Three Mechanisms for Freshness

#### 1. Large Question Pool (80-100 per topic)

With 10 questions per session and 80-100 per topic, that's 8-10 sessions of completely unique content. Most students reach Exam Ready in 5-7 sessions.

Target per concept (5 concepts per topic):

| Cognitive Level | Per Concept | Total |
|-----------------|-------------|-------|
| recall | 3-4 | 15-20 |
| compare | 2-3 | 10-15 |
| classify | 2-3 | 10-15 |
| scenario | 2-3 | 10-15 |
| exception | 1-2 | 5-10 |
| reason | 1-2 | 5-10 |
| **Total** | **~16** | **~80** |

#### 2. Question-Level Deduplication (Algorithm)

The selection algorithm tracks every question a student has ever answered:

| History | What happens |
|---------|-------------|
| Answered correctly | **Permanently excluded** — student proved mastery |
| Answered incorrectly, < 3 sessions ago | **Temporarily excluded** — give time to absorb |
| Answered incorrectly, 3+ sessions ago | **Re-enters pool** — healthy spaced repetition |
| Never seen | **+20 priority bonus** — fresh content preferred |

This means a student CANNOT see the same question twice in back-to-back sessions. Correctly-answered questions never repeat.

#### 3. Cognitive Variety Balancing (Per Session)

Within a single 10-question session, the algorithm enforces:
- At least **2 different cognitive levels** represented
- No more than **3 consecutive questions** at the same cognitive level

This prevents monotonous stretches of only recall or only scenario questions.

### Mastery & Difficulty Progression

Mastery is tracked per concept, per difficulty level, using a **sliding window of the last 5 attempts**:

```
Mastery threshold: 4 out of 5 correct in the rolling window
```

When a difficulty level is mastered:
- System advances to the next difficulty: `familiarity → application → exam_style`
- Progression is one-way — students never regress
- Questions at the new difficulty are prioritised

**Proficiency bands** map to genuine capability:

| Band | What the student can actually do |
|------|----------------------------------|
| Not Started | Has not attempted the topic |
| Building Familiarity | Can name key terms and basic facts |
| Growing Confidence | Can compare and classify from descriptions |
| Consistent Understanding | Can handle scenarios and apply knowledge |
| Exam Ready | Can handle exceptions and explain reasoning |

When a parent sees "Exam Ready", it means their child has been tested from every cognitive angle a school exam will test.

### Adaptive Priority Scoring

When building a session's question queue, each candidate question gets a priority score:

| Factor | Points | Why |
|--------|--------|-----|
| Matches recommended difficulty | +100 | Keep student at their learning edge |
| Concept never attempted | +50 | Expose new material |
| Difficulty level not yet mastered | +30 | Focus on what needs work |
| Fewer total attempts on concept | up to +20 | Under-practiced concepts first |
| Never-seen question | +20 | Fresh content bonus |
| Current streak momentum | up to +10 | Reward flow state |
| Random jitter | 0-10 | Break ties, add variety |

Questions are ranked by total score, then interleaved across concepts for variety.

### Question JSON Schema

Every question file follows this structure:

```json
{
  "version": "1.0.0",
  "cam_reference": {
    "cam_version": "1.0.0",
    "board": "ICSE",
    "class": 7,
    "subject": "Biology"
  },
  "topic_id": "T10.01",
  "topic_name": "Classification of Plants and Animals",
  "canonical_explanation": {
    "text": "Long-form topic explanation...",
    "rules": ["rule1", "rule2"]
  },
  "questions": [
    {
      "question_id": "T10.01.Q058",
      "type": "mcq",
      "concept_id": "T10.01.C04",
      "difficulty": "application",
      "cognitive_level": "compare",
      "question_text": "How does Class Reptilia differ from Class Mammalia in heart chambers?",
      "options": [
        {"id": "A", "text": "Reptilia 2, Mammalia 3"},
        {"id": "B", "text": "Reptilia 3, Mammalia 4"},
        {"id": "C", "text": "Both have 4"},
        {"id": "D", "text": "Reptilia 4, Mammalia 3"}
      ],
      "correct_answer": "B",
      "explanation_correct": "Why the right answer is right...",
      "explanation_incorrect": "Why wrong answers are wrong..."
    }
  ],
  "metadata": {
    "question_count": {
      "total": 92,
      "by_difficulty": { "familiarity": 31, "application": 30, "exam_style": 31 },
      "by_type": { "mcq": 65, "true_false": 10, "fill_blank": 12, "ordering": 5 },
      "by_cognitive_level": { "recall": 43, "compare": 12, "classify": 17, "scenario": 6, "exception": 6, "reason": 8 }
    }
  }
}
```

**Required fields for every question:**
- `question_id` — unique within topic (e.g. `T10.01.Q058`)
- `type` — one of: `mcq`, `fill_blank`, `true_false`, `ordering`
- `concept_id` — links to CAM concept (e.g. `T10.01.C04`)
- `difficulty` — one of: `familiarity`, `application`, `exam_style`
- `cognitive_level` — one of: `recall`, `compare`, `classify`, `scenario`, `exception`, `reason`
- `question_text` — the question prompt
- `correct_answer` — string, boolean, or array depending on type
- `explanation_correct` — why the right answer is right (shown on correct)
- `explanation_incorrect` — why wrong answers are wrong (shown on incorrect)

### Question Authoring Checklist

Before a topic's question bank is complete:

- [ ] Every concept has at least 3 recall, 2 compare, 2 classify, 2 scenario questions
- [ ] Concepts with genuine edge cases have at least 1 exception question
- [ ] Every concept has at least 1 reason question
- [ ] Total questions per topic: 80-100
- [ ] Questions distributed across all three difficulty tiers (~33% each)
- [ ] No two questions test the exact same thing the exact same way
- [ ] Scenario questions use age-appropriate contexts (school, zoo, kitchen, playground)
- [ ] Exception questions target real misconceptions, not obscure trivia
- [ ] Reason question options present plausible alternatives, not obviously wrong ones
- [ ] `explanation_correct` and `explanation_incorrect` present on every question
- [ ] `metadata.question_count` section is accurate

### File Locations

| Content | Path Pattern |
|---------|-------------|
| Maths questions | `questions/data/class{N}/T{theme}.{topic}-{slug}.json` |
| Science questions | `questions/data/class{N}-{subject}/T{theme}.{topic}-{slug}.json` |
| CBSE questions | `questions/data/cbse-class{N}/...` and `questions/data/cbse-class{N}-{subject}/...` |
| CAM files | `cam/data/{board}-class{N}-{subject}-cam.json` |
| Full framework doc | `docs/COGNITIVE-DEPTH-FRAMEWORK.md` |

---

## 6. Adding a New Feature (Checklist)

### Backend

- [ ] Create/update migration if new DB tables needed
- [ ] Add model functions for DB queries
- [ ] Add service function with business logic
- [ ] Add controller function to shape HTTP response
- [ ] Add route with middleware (auth, validation, rate limit)
- [ ] Add validation schema
- [ ] Test with curl or script against local server

### Frontend

- [ ] Add endpoint constant to `src/lib/api/endpoints.ts`
- [ ] Create/update API service in `src/services/<domain>-api.ts` with typed interfaces
- [ ] Create/update hook in `src/hooks/use-<feature>.ts`
- [ ] Add type mapping function if backend/frontend types differ
- [ ] Update page component to use the hook
- [ ] Verify TypeScript compiles: `npx tsc --noEmit`

### Testing

- [ ] Test backend endpoint directly (curl / test script)
- [ ] Test full flow end-to-end (create → use → complete)
- [ ] Verify no console errors in browser
- [ ] Check edge cases: no questions available, session already completed, auth expired

---

## 7. Naming Conventions

| Context | Convention | Example |
|---|---|---|
| DB columns | snake_case | `question_id`, `time_taken_ms` |
| Backend service/model | snake_case (matching DB) | `session_status`, `xp_earned` |
| API responses (controller) | camelCase | `sessionStatus`, `xpEarned` |
| Frontend types | camelCase | `isCorrect`, `timeTakenMs` |
| API service interfaces | camelCase | `BackendSubmitResult` |
| React hooks | `use` prefix | `useQuizEngine`, `useFlags` |
| API service files | `<domain>-api.ts` | `session-api.ts` |
| Endpoint constants | UPPER_SNAKE | `SESSION_ANSWER`, `PROGRESS_TOPIC` |

---

## 8. Error Handling

### Backend
- Services throw typed errors: `NotFoundError`, `ValidationError`, `UnauthorizedError`
- Controllers pass errors to `next(error)` — the error middleware formats them
- Never catch errors silently — always log and re-throw or format

### Frontend
- API client throws `APIError` with `code`, `status`, `message`
- Hooks catch errors and set `error` state for pages to display
- Never show raw error objects to users — map to friendly messages
- Auth errors (401) automatically sign the user out

---

## 9. File Organisation Reference

```
coolscool-backend/
  src/
    routes/          # HTTP route definitions + middleware wiring
    controllers/     # HTTP request/response handling
    services/        # Business logic
    models/          # Database queries + row types
    middleware/       # Auth, validation, error handling, rate limiting
    db/migrations/   # SQL migration files (numbered sequentially)
    utils/           # Shared utilities (jwt, etc.)
    config/          # App config, database connection

coolscool-web/
  src/
    app/(public)/    # Page routes (quiz, browse, dashboard, etc.)
    components/      # Reusable UI components by domain
    hooks/           # React hooks (one per feature domain)
    services/        # API service layers (one per backend domain)
    lib/
      api/           # API client, endpoints, shared types
      quiz-engine/   # Legacy local engine types (types still used by UI)
```

---

## 10. Common Gotchas

1. **Service function argument order**: Always `(userId, sessionId, ...)` not `(sessionId, userId, ...)`
2. **`noUncheckedIndexedAccess`** is ON in backend — `Record[key]` returns `T | undefined`. Use `!` assertion or named exports.
3. **`@types/jsonwebtoken` v9+** changed `expiresIn` type — use `as any` cast or explicit `SignOptions`
4. **api.post() returns `data.data`** — the `{ success, data }` wrapper is already stripped
5. **Backend `options` are `{ id, text }[]`** but frontend expects `string[]` — map in the hook
6. **`question_type` vs `type`**: Backend uses `question_type`, frontend uses `type` — map in the hook
7. **Windows paths**: Use forward slashes in bash; quote paths with `cd "D:\path"`
8. **Never increment counters during feedback**: See Section 4, "Question Counter" rule
