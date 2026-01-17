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

### Session 1: Project Setup & Foundation (2-3 hrs) - COMPLETED
- [x] Create Next.js 14+ project in `/coolscool-web/`
- [x] Configure TypeScript, Tailwind (extending existing CSS tokens)
- [x] Set up environment variables
- [x] Copy and adapt existing CSS design system
- [x] Create basic layout with header/footer
- [x] Set up multi-board/class routing structure

### Session 2: Authentication & User Roles (2-3 hrs) - COMPLETED
- [x] Install and configure NextAuth.js v5
- [x] Set up Google OAuth provider
- [x] Create login page
- [x] Implement JWT exchange with backend
- [x] Add auth middleware for protected routes
- [x] Implement role-based access (child vs parent)
- [x] Create user menu component

### Session 3: Quiz Engine Migration (3-4 hrs) - COMPLETED
- [x] Convert quiz-engine-browser.js to TypeScript modules
- [x] Create type definitions for all data structures
- [x] Implement storage adapter pattern (localStorage vs API)
- [x] Add board/class context to quiz sessions
- [x] Write unit tests for mastery logic (81 tests passing)
- [x] Test with existing backend API (adapter configured)

### Session 4: React Components (3-4 hrs) - COMPLETED
- [x] Create UI components (Button, Card, Modal, Toast)
- [x] Create quiz components (QuestionDisplay, AnswerOptions, Timer)
- [x] Create topic components (ThemeList, TopicCard)
- [x] Create board/class selector components
- [x] Preserve existing CSS styling
- [x] Add accessibility (keyboard nav, ARIA)

### Session 5: Core Pages - Browse & Practice (3-4 hrs) - COMPLETED
- [x] Implement landing page with board selection
- [x] Implement browse pages (/browse, /browse/[board], etc.)
- [x] Implement practice page (topic browser)
- [x] Implement quiz page with session flow
- [x] Handle dynamic routing for boards/classes

### Session 6: Student Dashboard & Settings (2-3 hrs) - COMPLETED
- [x] Implement student dashboard page
- [x] Show progress across subjects/boards
- [x] Implement settings page (export/import/reset)
- [x] Add profile management

### Session 7: Parent Dashboard (3-4 hrs) - COMPLETED
- [x] Create parent dashboard overview page
- [x] Implement child list and linking (mock API, ready for backend)
- [x] Create individual child progress view
- [x] Add activity feed component
- [x] Implement progress charts (CSS-only, no external libraries)

### Session 8: State Management & API (2-3 hrs) - COMPLETED
- [x] Set up Zustand for quiz state
- [x] Set up React Query for server data
- [x] Create API service layer
- [x] Implement all backend endpoints
- [x] Add error handling and token refresh

### Session 9: Mixed Access Control (2-3 hrs) - COMPLETED
- [x] Implement free sample tracking (3 questions per topic)
- [x] Add login prompts when samples exhausted
- [x] Show "sign in to save progress" hints
- [x] Gate full question bank behind auth
- [x] Add access indicators on topic cards

### Session 10: Testing & Polish (2-3 hrs) - COMPLETED
- [x] Set up Jest + Testing Library
- [x] Write component tests
- [x] Set up Playwright for E2E
- [x] Write key user flow tests
- [x] Fix any discovered bugs

### Session 11: Deployment & Production (2-3 hrs) - IN PROGRESS
- [x] Test production build (193 static pages)
- [x] Verify all tests pass (234 tests: 153 Jest + 81 Vitest)
- [x] Review environment variables
- [x] Document Vercel deployment (DEPLOYMENT.md)
- [ ] Configure Vercel project
- [ ] Set up production environment variables
- [ ] Configure Google OAuth for production
- [ ] Deploy and verify

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

**Current Session**: Session 11 - Deployment & Production - IN PROGRESS
**Next Action**: Deploy to Vercel and verify production functionality

### Session 11 Implementation Notes (In Progress)
- **Pre-Deployment Verification**:
  - Production build: 193 static pages generated successfully
  - Jest tests: 153 passed (components, hooks, services)
  - Vitest tests: 81 passed (quiz engine)
  - Total: 234 unit tests passing
- **Environment Variables** (required for Vercel):
  - `NEXT_PUBLIC_API_URL` - defaults to `https://coolscool.onrender.com`
  - `NEXTAUTH_URL` - production URL (set after first deploy)
  - `NEXTAUTH_SECRET` - secure secret (generate with `openssl rand -base64 32`)
  - `GOOGLE_CLIENT_ID` - from Google Cloud Console
  - `GOOGLE_CLIENT_SECRET` - from Google Cloud Console
- **API Configuration**:
  - `src/lib/api/endpoints.ts` - centralized endpoint constants
  - `src/lib/api/client.ts` - unified fetch wrapper with auth token injection
  - `src/services/auth-api.ts` - Google OAuth token exchange
  - All API calls default to Render backend
- **Documentation Created**:
  - `coolscool-web/DEPLOYMENT.md` - comprehensive Vercel deployment guide
  - Step-by-step Vercel setup instructions
  - Google OAuth production configuration
  - Verification checklist
  - Troubleshooting guide
- **Next Steps**:
  - Create Vercel project and connect repository
  - Set environment variables in Vercel
  - Configure Google OAuth for production domain
  - Deploy and run verification checklist

### Session 10 Implementation Notes
- **Jest Configuration** (`jest.config.js`):
  - ts-jest preset for TypeScript support
  - jsdom test environment for React components
  - Path alias mapping (`@/` -> `src/`)
  - Excludes quiz-engine directory (uses Vitest)
- **Jest Setup** (`jest.setup.ts`):
  - @testing-library/jest-dom matchers
  - Mocks for window.matchMedia, IntersectionObserver, ResizeObserver
- **Mocks** (`__mocks__/`):
  - `next-auth/react.ts` - useSession, signIn, signOut with BackendUser type
  - `next/navigation.ts` - useRouter, useSearchParams, usePathname, useParams
- **Component Unit Tests** (153 Jest tests total):
  - `src/components/ui/button.test.tsx` - variants, sizes, loading, disabled, asChild
  - `src/components/ui/login-prompt.test.tsx` - benefits, callbacks, accessibility
  - `src/components/quiz/quiz-summary.test.tsx` - stats, proficiency, auth prompt
  - `src/components/topics/topic-card.test.tsx` - sample badges, accessibility
- **Hook/Service Tests**:
  - `src/hooks/use-access-control.test.ts` - auth states, sample tracking
  - `src/services/sample-tracker.test.ts` - localStorage operations, edge cases
- **Playwright Configuration** (`playwright.config.ts`):
  - Test directory: `tests/e2e/`
  - Multiple browsers: Chromium, Firefox, WebKit
  - Mobile viewports: Pixel 5, iPhone 12
  - Auto-start dev server
- **E2E Test Files**:
  - `tests/e2e/anonymous-quiz.spec.ts` - browse, time mode, quiz, samples, login prompt
  - `tests/e2e/topic-browse.spec.ts` - board/class/subject selection, accordions
  - `tests/e2e/fixtures/test-utils.ts` - helper functions for common operations
- **NPM Scripts Added**:
  - `npm test` - Jest component tests
  - `npm run test:watch` - Jest watch mode
  - `npm run test:coverage` - Jest with coverage
  - `npm run test:vitest` - Vitest quiz engine tests
  - `npm run test:e2e` - Playwright E2E tests
  - `npm run test:e2e:ui` - Playwright UI mode
- **Vitest Config Update** (`vitest.config.ts`):
  - Scoped to only `src/lib/quiz-engine/**/*.test.ts`
  - Prevents conflict with Jest test files
- **Test Coverage**:
  - Jest: 153 tests (components, hooks, services)
  - Vitest: 81 tests (quiz engine)
  - Total: 234 unit tests
- TypeScript compilation verified (no errors)

### Session 9 Implementation Notes
- **Sample Tracker Service** (`src/services/sample-tracker.ts`):
  - `SAMPLE_LIMIT = 3` constant for free questions per topic
  - `getSamplesRemaining(topicId)` - returns remaining samples (default 3)
  - `recordSampleUsed(topicId)` - decrements and returns new count
  - `hasFreeSamples(topicId)` - checks if samples > 0
  - `resetSamples(topicId?)` - reset one or all topics
  - `getAllSampleUsage()` - get all usage data
  - SSR-safe with localStorage availability checks
- **Access Control Hook** (`src/hooks/use-access-control.ts`):
  - Integrates with NextAuth.js `useSession`
  - Authenticated users: returns `Infinity`/`true` for all sample methods (unlimited)
  - Anonymous users: uses sample-tracker service
  - Returns: `isAuthenticated`, `isLoading`, `hasFreeSamples()`, `samplesRemaining()`, `recordSampleUsed()`, `requiresAuth`, `showLoginPrompt()`, `sampleLimit`
- **Login Prompt Component** (`src/components/ui/login-prompt.tsx`):
  - Shown when anonymous user exhausts samples
  - Displays "You've used all 3 free questions for this topic"
  - Lists benefits: save progress, unlimited practice, track mastery, leaderboards
  - Google sign-in button and "Continue browsing" option
  - Accessible with `aria-live="polite"`
- **Quiz Page Updates** (`src/app/(public)/quiz/page.tsx`):
  - Added `sample_exhausted` state
  - Checks samples before loading quiz for anonymous users
  - Records sample usage after each answer submission
  - Shows LoginPrompt when samples exhausted mid-quiz
  - Authenticated users bypass all sample tracking
- **Topic Card Updates** (`src/components/topics/topic-card.tsx`):
  - Added `isAuthenticated`, `samplesRemaining`, `sampleLimit` props
  - Shows "3 free" or "2 left" badge with gift icon when samples available
  - Shows "Sign in to practice" with lock icon when exhausted
  - CSS classes: `.topic-sample-badge.available`, `.topic-sample-badge.exhausted`
- **Topic Browser Updates** (`src/components/topics/topic-browser.tsx`):
  - Banner for anonymous users: "Sign in to track your progress across sessions"
  - Dismissible (stored in sessionStorage)
  - Passes sample info to all topic cards
- **Quiz Summary Updates** (`src/components/quiz/quiz-summary.tsx`):
  - Added `isAuthenticated` prop
  - Soft prompt for anonymous: "Sign in to save your progress and continue your learning journey!"
- **Theme List Updates** (`src/components/topics/theme-list.tsx`):
  - Extended `ThemeTopic` interface with `isAuthenticated?`, `samplesRemaining?`
- **CSS Additions** (`src/app/globals.css`):
  - ~180 lines for `.login-prompt`, `.topic-sample-badge`, `.summary-signin-prompt`, `.topic-browser-banner`
  - Responsive styles, consistent with design system variables
- **Exports Updated**:
  - `src/components/ui/index.ts` - Added LoginPrompt export
  - `src/hooks/index.ts` - Added useAccessControl export
- Build verified successfully (193 static pages)

### Session 8 Implementation Notes
- **Backend API Additions** (`coolscool-backend/src/`):
  - `db/migrations/002_user_settings.sql` - Settings table schema
  - `services/settings.service.ts` - Settings CRUD operations
  - `controllers/settings.controller.ts` - HTTP handlers
  - `routes/settings.routes.ts` - GET/PUT /api/v1/settings
  - `services/parent.service.ts` - Parent-child management, progress, activity
  - `controllers/parent.controller.ts` - Parent HTTP handlers
  - `routes/parent.routes.ts` - All parent endpoints:
    - GET/POST /api/v1/parent/children
    - DELETE /api/v1/parent/children/:childId
    - POST/DELETE /api/v1/parent/children/:childId/consent
    - GET /api/v1/parent/children/:childId/progress
    - GET /api/v1/parent/children/:childId/sessions
    - GET /api/v1/parent/activity
  - `app.ts` - Registered new routes
- **Frontend Dependencies**: zustand, @tanstack/react-query, immer, @tanstack/react-query-devtools
- **API Client** (`src/lib/api/`):
  - `client.ts` - Unified fetch wrapper with auto token injection and 401 handling
  - `endpoints.ts` - Centralized endpoint constants
  - `types.ts` - API response types (UserSettings, LinkedChild, ActivityItem, etc.)
  - `index.ts` - Barrel exports
- **Zustand Stores** (`src/stores/`):
  - `quiz-store.ts` - Quiz session state (session, question, feedback, timing, loading)
  - `context-store.ts` - Curriculum context with localStorage persistence
  - `ui-store.ts` - Global UI state (loading, toasts, modals)
  - `index.ts` - Exports with selectors
- **React Query** (`src/queries/`):
  - `query-client.ts` - Client config with retry logic, stale/gc times
  - `keys.ts` - Query key factory for type-safe keys
  - `use-settings-query.ts` - useSettings, useUpdateSettingsMutation
  - `use-progress-query.ts` - useProgress, useProgressSummary, export/import/reset mutations
  - `use-sessions-query.ts` - useSessions, useSessionDetail
  - `use-parent-queries.ts` - useParentDashboard, useChildManagement, useChildView, all mutations
  - `index.ts` - All exports
- **Providers** (`src/components/providers/`):
  - `query-provider.tsx` - QueryClientProvider with devtools and API client init
- **Hooks** (`src/hooks/`):
  - `use-auth-token.tsx` - Token access, API client configuration, session error handling
- **Layout Updated**: `src/app/layout.tsx` - Added QueryProvider
- TypeScript compilation verified (no errors)

### Session 7 Implementation Notes
- **Parent Dashboard Page** (`src/app/(protected)/parent/page.tsx`):
  - Welcome message with parent's name
  - List of linked children with summary cards
  - Activity feed showing recent child activities
  - Parent tips section with helpful guidance
  - Add child button (placeholder for future implementation)
  - Loading and error states
- **Child Progress Page** (`src/app/(protected)/parent/child/[id]/page.tsx`):
  - Breadcrumb navigation back to parent dashboard
  - Child header with avatar, name, streak display
  - Stats overview (XP, Sessions, Topics, Accuracy, Streak)
  - Progress charts (CSS-only): accuracy gauge, time spent, subject progress
  - Proficiency distribution bar with legend
  - Strengths and areas to improve insights
  - Topics in progress list with proficiency badges
  - Recent activity feed and session history sidebar
- **Parent Components** (`src/components/parent/`):
  - `child-card.tsx` - Summary card showing child stats, progress bar, streak
  - `child-list.tsx` - Grid of child cards with empty state
  - `activity-feed.tsx` - Activity list with typed icons (session, mastery, achievement, streak)
  - `progress-charts.tsx` - CSS-only charts (accuracy gauge, time spent, subject bars, proficiency distribution)
  - `index.ts` - Barrel export
- **Types** (`src/types/parent.ts`):
  - LinkedChild, ChildProgressSummary, ActivityItem
  - SubjectProgress, TopicProgressDetail, ChildFullProgress
  - ChildCardData, ParentDashboardData
- **Services** (`src/services/parent-api.ts`):
  - Mock data service with realistic child progress data
  - getLinkedChildren, getChildProgressSummary, getActivityFeed
  - getParentDashboardData, getChildFullProgress
  - linkChild, unlinkChild (placeholder for backend integration)
- **CSS Additions** (`src/app/globals.css`):
  - ~1050 lines for parent dashboard and child progress styles
  - Child cards, activity feed, progress charts
  - Proficiency distribution, insights cards
  - Responsive styles for all screen sizes
- Build verified successfully (193 static pages generated)

### Session 6 Implementation Notes
- **Dashboard page** (`src/app/(protected)/dashboard/page.tsx`):
  - Welcome message with user's first name
  - Progress overview showing Total XP, Sessions, Topics Started/Mastered, Accuracy
  - Session history with recent practice sessions, scores, and XP earned
  - Topics in progress with proficiency badges and quick practice links
  - Quick actions to browse topics or go to settings
  - Loading and error states
- **Settings page** (`src/app/(protected)/settings/page.tsx`):
  - Profile section showing avatar, display name, email, role badge
  - Theme toggle (Light/Dark/System) - preferences saved to localStorage
  - Sound effects toggle with switch component
  - Data management: Export, Import, Reset progress with confirmation modal
  - App information section (version, board, class, subject)
- **Dashboard Components** (`src/components/dashboard/`):
  - `stat-card.tsx` - Reusable stat display with icon and optional trend
  - `progress-overview.tsx` - Grid of stat cards for progress metrics
  - `session-history.tsx` - List of recent sessions with scores
  - `topic-progress-card.tsx` - Topic progress with proficiency, concepts, practice link
  - `index.ts` - Barrel export
- **Settings Components** (`src/components/settings/`):
  - `theme-toggle.tsx` - Three-option theme selector (Light/Dark/System)
  - `sound-toggle.tsx` - Toggle switch for sound effects
  - `data-management.tsx` - Export/Import/Reset with ToastProvider integration
  - `index.ts` - Barrel export
- **New Hook** (`src/hooks/use-progress.ts`):
  - Connects to quiz engine for progress data
  - Calculates derived stats (topics started, mastered, accuracy)
  - Provides refresh, exportData, importData, clearAllData methods
  - Handles loading and error states
- **Updated Files**:
  - `src/hooks/index.ts` - Added useProgress export
  - `src/app/layout.tsx` - Added ToastProvider wrapper
  - `src/app/globals.css` - Added ~900 lines for dashboard and settings styles
- Build verified successfully (192 static pages generated)

### Session 5 Implementation Notes
- **Core Pages fully functional with quiz flow**
- **New Services** (`src/services/`):
  - `curriculum-api.ts` - Fetches CAM data and question banks from static files
  - Question bank file mapping for all 33 topics
- **New Hooks** (`src/hooks/`):
  - `useQuizEngine` - Manages quiz engine state for React components
  - Handles initialization, session management, answer submission
- **New Quiz Components** (`src/components/quiz/`):
  - `TimeModeModal` - Time mode selection with 4 options (unlimited, 10min, 5min, 3min)
  - `QuizSummary` - Session complete view with stats and proficiency
- **New Topic Components** (`src/components/topics/`):
  - `TopicBrowser` - Client component that loads CAM, displays ThemeList, handles quiz start
- **Updated Subject Page** (`src/app/(public)/browse/[board]/[classLevel]/[subject]/page.tsx`):
  - Now shows real themes and topics from CAM data
  - Time mode modal integration
  - Navigation to quiz page on start
- **Quiz Page** (`src/app/(public)/quiz/page.tsx`):
  - Full quiz session flow with question display
  - Answer submission with feedback
  - Timer support for timed modes
  - Session summary on completion
  - Suspense boundary for useSearchParams
- **Static Data** (`public/`):
  - CAM data copied to `public/cam/data/`
  - Question banks copied to `public/questions/data/`
- **CSS additions to globals.css**:
  - Modal overlay and container styles
  - Time mode selection styles
  - Quiz summary styles
- Build verified successfully (190 static pages generated)

### Session 4 Implementation Notes
- All components created in `src/components/` with full TypeScript support
- **UI Components** (`src/components/ui/`):
  - `Button` - Variants (primary, secondary, ghost), sizes, loading state, asChild for Links
  - `Card` - CardHeader, CardContent, CardFooter, interactive variant
  - `Modal` - Focus trap, escape key, overlay click, body scroll lock
  - `Toast` - ToastProvider context, useToast hook, auto-dismiss, stacking
- **Quiz Components** (`src/components/quiz/`):
  - `QuestionDisplay` - Question number badge, styled text container
  - `AnswerOptions` - MCQ, True/False, Fill-blank, Ordering with drag-drop
  - `Timer` - MM:SS format, warning state, unlimited mode
  - `QuizProgress` - Animated progress bar with percentage
  - `QuizHeader` - Dark header combining timer, progress, topic name
  - `Feedback` - Correct/incorrect states, explanation, XP earned
- **Topic Components** (`src/components/topics/`):
  - `ProficiencyBadge` - 5 proficiency bands with colors
  - `TopicCard` - Name, concepts, questions, proficiency display
  - `ThemeSection` - Collapsible accordion with gradient icons
  - `ThemeList` - Manages accordion state (one expanded at a time)
- **Browse Components** (`src/components/browse/`):
  - `BoardCard`, `ClassCard`, `SubjectCard` - Selection cards
  - `BoardSelector`, `ClassSelector`, `SubjectSelector` - Grids of cards
  - `BrowseBreadcrumb` - Navigation breadcrumb
- **CSS additions to globals.css**:
  - All theme/topic styles migrated from original styles.css
  - Quiz session styles (header, options, feedback)
  - Browse grid and breadcrumb styles
  - Proficiency badge colors
- Accessibility: ARIA attributes, keyboard navigation (MCQ a/b/c/d, ordering arrows)
- Build verified successfully
- All 81 existing tests pass

### Session 3 Implementation Notes
- Quiz engine converted to TypeScript modules in `/src/lib/quiz-engine/`
- Modular architecture with separate files:
  - `types.ts` - All TypeScript interfaces and types
  - `mastery-tracker.ts` - XP and mastery progression logic
  - `proficiency-calculator.ts` - Topic proficiency bands
  - `question-selector.ts` - Adaptive question selection
  - `session-manager.ts` - Quiz session lifecycle
  - `export-manager.ts` - Data export/import functionality
  - `quiz-engine.ts` - Main QuizEngine class orchestrator
  - `storage/` - Storage adapter pattern (localStorage + API)
- Storage adapter pattern implemented:
  - `LocalStorageAdapter` - For anonymous users and offline support
  - `APIStorageAdapter` - For authenticated users syncing with backend
- Board/class context added to sessions and storage
- 81 unit tests passing (Vitest)
- Build verified successfully

### Session 2 Implementation Notes
- NextAuth.js v5 (beta) installed and configured
- Google OAuth with backend JWT exchange working
- Auth middleware protects `/dashboard`, `/parent`, `/settings` routes
- Role-based redirects: parents go to `/parent`, children go to `/dashboard`
- UserMenu component shows avatar, name, role badge
- Type augmentations in `src/types/next-auth.d.ts`
- Note: Next.js 16 shows middleware deprecation warning (still works, can address later)
