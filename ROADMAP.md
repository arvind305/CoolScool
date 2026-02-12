# Cool S-Cool Development Roadmap

## Implementation Rules (NON-NEGOTIABLE)

1. **Phase-by-phase approval**: Before implementing any phase, show the user a summary of what will be done and wait for explicit approval before proceeding.
2. **Cost approval**: Any task involving API costs (explanation generation, image generation, or any external API call) MUST get explicit user approval with the estimated cost BEFORE execution. Do NOT proceed without approval.
3. **Parallel agents**: Use multiple agents to complete tasks wherever possible. Maximize parallelism for independent work items.
4. **Commit after each phase**: Commit and push after each phase is complete, unless the user says otherwise.

---

## Phase 1: User Analytics, Dashboard Redesign & Question Flagging

**Time estimate**: 5-7 hours | **API cost**: $0

### 1A. New Backend Analytics Endpoints

- `GET /api/v1/progress/trends` — daily activity for last 30 days (sessions, questions, XP, accuracy per day)
- `GET /api/v1/progress/subjects` — per-subject breakdown (sessions, accuracy, topics started/mastered, proficiency distribution)
- `GET /api/v1/progress/streak` — current streak, longest streak, study consistency (calculated from session timestamps)
- `GET /api/v1/progress/weak-areas` — topics with lowest accuracy / most incorrect answers (suggests what to practice next)
- New files: `analytics.service.ts`, updates to `progress.controller.ts` and `progress.routes.ts`

### 1B. Dashboard Redesign — Frontend

| Section | Current | New |
|---------|---------|-----|
| **Header** | Name + "Start Practice" button | Name + streak badge + "Continue: [last topic]" quick-resume |
| **Stat Cards** | 5 basic cards | 6 cards with trend indicators (e.g., "+12% this week") |
| **Activity Chart** | None | Line chart: daily questions & accuracy over 30 days (Recharts) |
| **Subject Breakdown** | None | Horizontal bar chart: per-subject progress with proficiency bands |
| **Weak Areas** | None | "Needs Practice" section: top 3-5 lowest accuracy topics with quick-start buttons |
| **Session History** | Flat list | Timeline-style with subject color coding, expandable details |
| **Topic Progress** | Simple cards, max 6 | Grouped by subject, filterable, with progress rings |
| **Quick Actions** | Browse + Settings | Browse, Resume Last, Practice Weak Area, View All Sessions |

Charting library: Recharts (~45KB gzipped, React-native, SSR-compatible).

### 1C. Question Flagging System

**Backend:**
- New `question_flags` table: user_id, question_id, curriculum_id, flag_reason (enum: incorrect_answer, unclear_question, wrong_grade, wrong_subject, typo, other), user_comment, status (open/reviewed/fixed/dismissed), admin_notes, resolved_at, resolved_by
- `POST /api/v1/flags` — submit a flag (authenticated, rate-limited: 10/hour)
- `GET /api/v1/flags` — admin-only: list flags with filters (status, reason, subject, class)
- `PATCH /api/v1/flags/:flagId` — admin-only: update status, add notes
- `GET /api/v1/flags/stats` — admin-only: flag counts by reason, resolution rate

**Frontend — Quiz UI:**
- Flag button on every question (bottom-right of question text)
- Compact modal: reason selector (6 options), optional comment, submit
- "Thanks for reporting" toast after submission
- Prevents duplicate flags per question per session

**Frontend — Analytics Dashboard (admin):**
- Flagged Questions card: open count, flags by reason chart, top flagged questions
- Flag review page: filterable table, bulk actions, inline question preview

**Estimated files**: ~22 new/modified (3 backend analytics, 1 migration, 3 flag backend, 8-10 frontend dashboard components, 4 flag UI components, 1 new dependency)

---

## Phase 2: Image-Based Questions Infrastructure

**Time estimate**: 3-4 hours | **API cost**: $0 (infrastructure only; actual image creation for content phases will have separate cost estimates)

### 2A. Data Structure Changes

Question JSON gains optional `image_url` field:
```json
{
  "question_id": "T01.01.Q051",
  "type": "mcq",
  "question_text": "Which part of the plant is labeled 'A'?",
  "image_url": "/images/questions/class3-science/plant-parts.svg",
  "options": [...]
}
```

Options can also have images:
```json
{
  "options": [
    { "id": "A", "text": "Heart", "image_url": "/images/options/heart.svg" },
    { "id": "B", "text": "Lungs", "image_url": "/images/options/lungs.svg" }
  ]
}
```

### 2B. Database Migration

- Add `image_url TEXT` column to `questions` table
- Add `option_images JSONB` column to `questions` table
- Update seed scripts to handle new fields

### 2C. Backend Changes

- Update question model to include `image_url` in API responses
- Update all 3 seed scripts to support `image_url` and option images
- Serve static images from `/public/images/questions/` (Vercel-hosted) or Cloudinary (if scaling needed later)

### 2D. Frontend Changes

- Update `QuestionDisplay` component to render images above/below question text
- Image loading states (skeleton/blur placeholder)
- Responsive image sizing (max-width on mobile, zoom on tap)
- Update option rendering for image-based options (grid layout)

### 2E. Image Creation Strategy (for future content phases)

- **SVG diagrams** (free): Labeled diagrams, geometric shapes, circuits, molecular structures
- **AI-generated images** (~$0.02-0.04/image via DALL-E 3): Realistic illustrations for lower grades
- **Public domain / CC0 images** (free): Curated from Wikimedia, OpenStax, etc.
- Cost will be estimated per content phase and approved before execution

**Estimated files**: ~8-10 (1 migration, 2 backend, 3 seed script updates, 3-4 frontend)

---

## Phase 3: UI/UX Polish

**Time estimate**: 3-4 hours | **API cost**: $0

### 3A. Landing Page

- Feature highlights section: adaptive learning, progress tracking, parent monitoring (3 illustrated cards)
- Live stats banner: "X,000+ questions across Y subjects and Z classes" (pulled from API)
- Better CTA hierarchy and visual flow

### 3B. Mobile Experience

- Bottom navigation bar for mobile (Browse, Quiz, Dashboard, Profile)
- Better touch targets on all interactive elements
- Swipe-friendly quiz answer options
- Responsive quiz summary with collapsible sections

### 3C. General Polish

- Loading skeletons for all async pages (browse, topic browser, quiz loading)
- Empty states with helpful illustrations for no-progress, no-sessions pages
- Improved breadcrumbs with better navigation context
- Toast notification system (session completed, profile saved, error alerts)
- Smooth page transitions

**Estimated files**: ~12-15 modified/new

---

## Phase 4: Testing & Reliability ✅ COMPLETED

**Time estimate**: 4-5 hours | **API cost**: $0

### 4A. Backend Tests (currently near-zero)

- Auth controller: login, refresh, logout, me (8-10 tests)
- Session controller: create, start, answer, skip, end, summary (12-15 tests)
- Progress controller: get, summary, export, import, reset (8-10 tests)
- CAM controller: curricula, themes, topics, questions (6-8 tests)
- Analytics + flagging endpoints (8-10 tests)
- Middleware: auth, rate limiting, validation (6-8 tests)
- Jest with test database

### 4B. Frontend Tests

- Dashboard components: stat cards, charts, session history, topic cards (10-12 tests)
- Quiz flow integration test (5-6 tests)
- Flag button and modal (3-4 tests)
- Browse navigation flow (4-5 tests)
- Curriculum context and API service mocks (6-8 tests)

### 4C. CI/CD

- GitHub Actions workflow: lint, type-check, unit tests, build
- Separate frontend and backend jobs
- Run on PR and push to main

**Estimated files**: ~15-20 test files, 1 GitHub Actions workflow

---

## Phase 5: CBSE Board

**Time estimate**: 10-12 hours | **API cost**: ~$8-10 (REQUIRES APPROVAL before each sub-phase)

Full CBSE curriculum for Classes 1-12, NCERT-aligned.

| Component | Count | Estimate |
|-----------|-------|----------|
| CAM files | ~36 files | 2 hours |
| Question banks (~50 per topic) | ~500+ files, ~25,000 questions | 5-6 hours |
| Explanation generation (Haiku API) | ~25,000 questions | 2-3 hours, **~$8-10 API** |
| Config + seeding | All classes | 1 hour |

### Sub-phases (each requires separate cost approval):
- **5A**: CBSE Classes 1-5 (Maths + Science) — ~8,000 questions — **API cost: ~$2.50**
- **5B**: CBSE Classes 6-10 (Maths + Physics + Chemistry + Biology) — ~12,000 questions — **API cost: ~$4**
- **5C**: CBSE Classes 11-12 (Maths + Physics + Chemistry + Biology) — ~5,800 questions — **API cost: ~$2**

---

## Phase 6: English Subject (ICSE)

**Time estimate**: 6-8 hours | **API cost**: ~$2-3 (REQUIRES APPROVAL)

| Component | Count | Estimate |
|-----------|-------|----------|
| CAM files | 12 files (1 per class) | 1 hour |
| Question banks | ~120 files, ~6,000 questions | 3-4 hours |
| Explanation generation | ~6,000 questions | 1-2 hours, **~$2-3 API** |
| Config + seeding | Mark English live | 30 min |

Topics: Grammar, Vocabulary, Comprehension, Sentence Formation, Tenses, Parts of Speech, Idioms & Phrases, Letter/Essay Writing (adapted by grade).

Question types: mcq (grammar, vocab), fill_blank (cloze), true_false (grammar rules), ordering (sentence rearrangement).

---

## Phase 7: Social Studies Subject (ICSE)

**Time estimate**: 6-8 hours | **API cost**: ~$2-3 (REQUIRES APPROVAL)

| Component | Count | Estimate |
|-----------|-------|----------|
| CAM files | 12 files (1 per class) | 1 hour |
| Question banks | ~120 files, ~6,000 questions | 3-4 hours |
| Explanation generation | ~6,000 questions | 1-2 hours, **~$2-3 API** |
| Config + seeding | Mark Social Studies live | 30 min |

Topics: History, Geography, Civics/Political Science (split varies by grade).

---

## Summary

| Phase | Description | Time | API Cost |
|-------|------------|------|----------|
| 1 | Analytics, Dashboard Redesign & Question Flagging | 5-7 hrs | $0 |
| 2 | Image-Based Questions Infrastructure | 3-4 hrs | $0 |
| 3 | UI/UX Polish | 3-4 hrs | $0 |
| 4 | Testing & Reliability | 4-5 hrs | $0 |
| 5 | CBSE Board (all classes) | 10-12 hrs | ~$8-10 |
| 6 | English Subject (ICSE) | 6-8 hrs | ~$2-3 |
| 7 | Social Studies Subject (ICSE) | 6-8 hrs | ~$2-3 |
| **Total** | | **36-48 hrs** | **$12-16** |

---

## Pending: Commit explanation fixes

The 9 missing explanation fixes (Class 1 & 3 Science) are ready to commit and push.
