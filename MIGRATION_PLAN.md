# Cool S-Cool: Frontend Migration Plan

## Overview

Migrate from vanilla JS single-page app to a Next.js 14+ multi-page website with:
- Google OAuth authentication
- Backend API integration (existing Render deployment)
- Protected questions (your moat)
- Free samples for anonymous users
- Dashboard, Settings, and proper website structure
- **Parent Dashboard** for monitoring child progress
- **Multi-class/board structure** (ICSE, CBSE, State boards across classes)

## User Requirements Summary

- **Framework**: Next.js 14+ with App Router
- **Pages**: Landing + Login + Dashboard + Practice + Settings + **Parent Dashboard**
- **Security**: Mixed access (free samples public, full content requires login)
- **Payments**: Skip for now, design for easy addition later
- **Multi-board**: Structure for ICSE, CBSE, State boards across classes 1-12
- **Timeline**: Do it properly across multiple sessions, phase by phase

---

## Architecture

```
/coolscool-web/                 # New Next.js project
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing page (public)
│   │   ├── (auth)/login/       # Login page
│   │   ├── (public)/
│   │   │   ├── browse/         # Browse all boards/classes (public)
│   │   │   ├── practice/[board]/[class]/  # Topic browser
│   │   │   └── quiz/[topicId]/ # Quiz (free samples + auth)
│   │   ├── (protected)/
│   │   │   ├── dashboard/      # Student dashboard
│   │   │   ├── parent/         # Parent dashboard
│   │   │   │   ├── page.tsx    # Overview of linked children
│   │   │   │   └── child/[id]/ # Individual child progress
│   │   │   └── settings/       # Settings
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── ui/                 # Button, Card, Modal, etc.
│   │   ├── quiz/               # Question, Options, Timer, etc.
│   │   ├── topics/             # Theme list, Topic cards
│   │   ├── dashboard/          # Student progress, Sessions
│   │   └── parent/             # Parent-specific components
│   ├── lib/
│   │   ├── quiz-engine/        # Migrated quiz logic (TypeScript)
│   │   └── curriculum/         # Multi-board/class utilities
│   ├── hooks/                  # useQuiz, useProgress, etc.
│   ├── services/               # API client
│   └── stores/                 # Zustand state
```

**Backend**: Keep existing Express API on Render (minor extensions for parent features)

---

## Multi-Board/Class Structure

### URL Structure
```
/browse                           # All boards overview
/browse/icse                      # ICSE classes
/browse/icse/class-5              # ICSE Class 5 subjects
/browse/icse/class-5/mathematics  # Topics for this subject

/practice/icse/class-5/mathematics           # Topic browser
/quiz/icse-class5-math-T01.01               # Quiz for specific topic
```

### Database Structure (already supports this)
```
themes table:
  - board: 'icse' | 'cbse' | 'state_karnataka' | etc.
  - class_level: 1-12
  - subject: 'mathematics' | 'science' | etc.
  - theme_id, theme_name, theme_order

topics table:
  - linked to themes
  - Contains boundaries, numeric_limits per board/class
```

### Curriculum Configuration
```typescript
// /src/lib/curriculum/config.ts
export const BOARDS = {
  icse: { name: 'ICSE', fullName: 'Indian Certificate of Secondary Education' },
  cbse: { name: 'CBSE', fullName: 'Central Board of Secondary Education' },
  karnataka: { name: 'Karnataka State', fullName: 'Karnataka State Board' },
  // Add more as needed
};

export const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const SUBJECTS = {
  mathematics: { name: 'Mathematics', icon: '📐' },
  science: { name: 'Science', icon: '🔬' },
  english: { name: 'English', icon: '📚' },
  // Add more as needed
};
```

---

## Parent Dashboard Features

### Parent-Child Relationship
```typescript
// User roles: 'child' | 'parent' | 'admin'
// Parent can link to multiple children
// Child can have one parent linked

interface ParentChildLink {
  parent_id: string;
  child_id: string;
  linked_at: Date;
  consent_given: boolean;
}
```

### Parent Dashboard Pages

**`/parent`** - Overview
- List of linked children
- Summary stats for each child
- Quick view of recent activity
- Add/remove child accounts

**`/parent/child/[id]`** - Individual Child View
- Detailed progress by subject
- Topic-level mastery breakdown
- Session history with performance
- Time spent analysis
- Strengths and areas to improve

### Parent Dashboard Components
```
components/parent/
├── child-list.tsx          # List of linked children
├── child-card.tsx          # Summary card for each child
├── child-progress.tsx      # Detailed progress view
├── activity-feed.tsx       # Recent sessions/achievements
├── add-child-modal.tsx     # Link new child account
└── progress-charts.tsx     # Visual progress charts
```

---

## Implementation Sessions

### Session 1: Project Setup & Foundation (2-3 hrs)
- [ ] Create Next.js 14+ project in `/coolscool-web/`
- [ ] Configure TypeScript, Tailwind (extending existing CSS tokens)
- [ ] Set up environment variables
- [ ] Copy and adapt existing CSS design system
- [ ] Create basic layout with header/footer
- [ ] Set up multi-board/class routing structure

### Session 2: Authentication & User Roles (2-3 hrs)
- [ ] Install and configure NextAuth.js v5
- [ ] Set up Google OAuth provider
- [ ] Create login page
- [ ] Implement JWT exchange with backend
- [ ] Add auth middleware for protected routes
- [ ] Implement role-based access (child vs parent)
- [ ] Create user menu component

### Session 3: Quiz Engine Migration (3-4 hrs)
- [ ] Convert quiz-engine-browser.js to TypeScript modules
- [ ] Create type definitions for all data structures
- [ ] Implement storage adapter pattern (localStorage vs API)
- [ ] Add board/class context to quiz sessions
- [ ] Write unit tests for mastery logic
- [ ] Test with existing backend API

### Session 4: React Components (3-4 hrs)
- [ ] Create UI components (Button, Card, Modal, Toast)
- [ ] Create quiz components (QuestionDisplay, AnswerOptions, Timer)
- [ ] Create topic components (ThemeList, TopicCard)
- [ ] Create board/class selector components
- [ ] Preserve existing CSS styling
- [ ] Add accessibility (keyboard nav, ARIA)

### Session 5: Core Pages - Browse & Practice (3-4 hrs)
- [ ] Implement landing page with board selection
- [ ] Implement browse pages (/browse, /browse/[board], etc.)
- [ ] Implement practice page (topic browser)
- [ ] Implement quiz page with session flow
- [ ] Handle dynamic routing for boards/classes

### Session 6: Student Dashboard & Settings (2-3 hrs)
- [ ] Implement student dashboard page
- [ ] Show progress across subjects/boards
- [ ] Implement settings page (export/import/reset)
- [ ] Add profile management

### Session 7: Parent Dashboard (3-4 hrs)
- [ ] Create parent dashboard overview page
- [ ] Implement child list and linking
- [ ] Create individual child progress view
- [ ] Add activity feed component
- [ ] Implement progress charts

### Session 8: State Management & API (2-3 hrs)
- [ ] Set up Zustand for quiz state
- [ ] Set up React Query for server data
- [ ] Create API service layer
- [ ] Implement all backend endpoints
- [ ] Add error handling and token refresh

### Session 9: Mixed Access Control (2-3 hrs)
- [ ] Implement free sample tracking (3 questions per topic)
- [ ] Add login prompts when samples exhausted
- [ ] Show "sign in to save progress" hints
- [ ] Gate full question bank behind auth
- [ ] Add access indicators on topic cards

### Session 10: Testing & Polish (2-3 hrs)
- [ ] Set up Jest + Testing Library
- [ ] Write component tests
- [ ] Set up Playwright for E2E
- [ ] Write key user flow tests
- [ ] Fix any discovered bugs

### Session 11: Deployment & Production (2-3 hrs)
- [ ] Configure Vercel for new project
- [ ] Update environment variables
- [ ] Test production build
- [ ] Deploy and verify
- [ ] Update DNS/domains if needed

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14+ App Router | Best for multi-page, SSR, Vercel-native |
| Auth | NextAuth.js v5 | Handles OAuth complexity, works with App Router |
| State | Zustand + React Query | Lightweight, good DX, server state separation |
| Styling | Keep CSS + Tailwind utilities | Preserve existing design system, add layout helpers |
| Quiz Engine | TypeScript port | Type safety, reuse existing logic |
| Storage | Adapter pattern | Switch between localStorage (anon) and API (auth) |
| Routing | Dynamic [board]/[class] segments | Clean URLs, scalable to new boards |

---

## Database Extensions Needed

### For Parent Dashboard (Backend)
```sql
-- Parent-child relationships
CREATE TABLE parent_child_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  consent_given BOOLEAN DEFAULT FALSE,
  UNIQUE(parent_id, child_id)
);

-- Index for fast lookups
CREATE INDEX idx_parent_child_parent ON parent_child_links(parent_id);
CREATE INDEX idx_parent_child_child ON parent_child_links(child_id);
```

### API Endpoints to Add
```
GET  /api/v1/parent/children          # List linked children
POST /api/v1/parent/children          # Link a child
DELETE /api/v1/parent/children/:id    # Unlink a child
GET  /api/v1/parent/children/:id/progress  # Child's full progress
GET  /api/v1/parent/children/:id/sessions  # Child's session history
```

---

## Files to Preserve/Migrate

| Source File | Migration Action |
|-------------|------------------|
| `ui/js/quiz-engine-browser.js` (1130 lines) | Convert to TypeScript modules |
| `ui/js/app.js` (1080 lines) | Convert to React components |
| `ui/css/styles.css` (1551 lines) | Keep as-is, integrate with Tailwind |
| `coolscool-backend/*` | Minor extensions for parent features |

---

## Free Samples Strategy

- Anonymous users get 3 free questions per topic
- Track usage in localStorage
- Show remaining count on topic cards
- Show login prompt when exhausted
- Authenticated users get full access

---

## Verification Checklist

After each session:
- [ ] Run `npm run dev` - app starts without errors
- [ ] Run `npm run build` - builds successfully
- [ ] Run `npm test` - tests pass
- [ ] Manual test of implemented features

Final verification:
- [ ] Anonymous user can browse boards/classes/topics
- [ ] Anonymous user can complete free samples
- [ ] Login prompt appears when samples exhausted
- [ ] Google login works end-to-end
- [ ] Authenticated user progress saves to backend
- [ ] Student dashboard shows correct progress
- [ ] Parent can view linked children's progress
- [ ] Multi-board navigation works correctly
- [ ] Settings export/import works
- [ ] Mobile responsive layout works

---

## Future Additions (Not in This Plan)

- Payments/subscriptions
- Leaderboard
- Mobile app
- Teacher dashboard
- Question content for additional boards/classes (structure ready)

---

## Execution Approach

We will implement this plan **one phase at a time**:
1. Complete Session 1
2. Test and verify
3. Move to Session 2
4. Repeat until all sessions complete

This allows for adjustments based on learnings from each phase.

---

## Current Progress

**Current Session**: Not started
**Next Action**: Begin Session 1 - Project Setup & Foundation
