# QMing-Kids Enterprise Transformation

## Project Overview

**Goal:** Transform a static quiz web app into an enterprise-grade, secure platform with:
- Backend API on Render (Node.js/Express + PostgreSQL)
- React Native mobile apps (iOS + Android)
- Google OAuth authentication with parental consent
- Maximum question protection (server-side only, one at a time)
- COPPA/GDPR compliance for children's data

**Target Audience:** ICSE Class 5 students (ages 10-11) practicing Mathematics

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Native   │     │    Vercel       │     │    Render       │
│  iOS/Android    │────▶│   (Web App)     │────▶│   Backend API   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │   PostgreSQL    │
                                                │   (Render)      │
                                                └─────────────────┘
```

**Services Used:**
| Service | Purpose | Tier |
|---------|---------|------|
| Vercel | Web app hosting | Free |
| Render | Backend API + PostgreSQL | Free |
| GitHub | Version control | Free |
| Google Cloud | OAuth authentication | Free |

---

## Current State (What Exists)

### Original Static App (`ui/`)
- Vanilla HTML/CSS/JS quiz app
- Questions stored as JSON files (`questions/data/*.json`)
- Progress stored in localStorage
- Deployed to Vercel at `coolscool.vercel.app`
- No authentication, no question protection

### Quiz Engine (`quiz-engine/`)
- Mastery tracking (4/5 threshold)
- Adaptive question selection
- Proficiency bands (5 levels)
- Session management
- All client-side JavaScript

### Content
- **CAM (Curriculum Authority Model):** 10 themes, 32 topics, ~150 concepts
- **Questions:** ~1,600 questions across 30 topic files
- **Question Types:** MCQ, fill-blank, true/false, ordering, match

---

## Phase 1: Backend API (PARTIALLY COMPLETE)

### Completed ✓

#### Project Structure
```
qming-kids-backend/
├── src/
│   ├── config/
│   │   ├── index.ts              ✓ Environment configuration
│   │   └── database.ts           ✓ PostgreSQL connection pool
│   ├── db/
│   │   ├── index.ts              ✓ Query helpers & transactions
│   │   └── migrations/
│   │       └── 001_initial_schema.sql  ✓ Complete database schema
│   ├── middleware/
│   │   ├── security.ts           ✓ Helmet, CORS, HPP
│   │   ├── rateLimit.ts          ✓ Rate limiters (global, auth, quiz)
│   │   ├── error.ts              ✓ Error classes & handler
│   │   ├── auth.ts               ✓ JWT authentication middleware
│   │   └── validate.ts           ✓ Joi validation schemas
│   ├── models/
│   │   └── user.model.ts         ✓ User CRUD, refresh tokens, audit logs
│   ├── services/
│   │   ├── auth.service.ts       ✓ Google OAuth, JWT generation
│   │   ├── mastery.service.ts    ✓ 4/5 mastery tracking (ported)
│   │   └── proficiency.service.ts ✓ Proficiency bands (ported)
│   ├── controllers/
│   │   └── auth.controller.ts    ✓ Auth endpoint handlers
│   ├── routes/
│   │   ├── health.ts             ✓ Health check endpoint
│   │   └── auth.routes.ts        ✓ Auth routes
│   ├── utils/
│   │   └── jwt.ts                ✓ JWT sign/verify utilities
│   └── app.ts                    ✓ Express app with middleware
├── scripts/
│   ├── migrate.ts                ✓ Database migration runner
│   ├── seed-cam.ts               ✓ CAM data seeder
│   └── seed-questions.ts         ✓ Questions seeder
├── package.json                  ✓
├── tsconfig.json                 ✓
└── .env.example                  ✓
```

#### Database Schema (11 tables)
- `users` - Google OAuth accounts, parent/child relationships
- `themes` - CAM themes (T01, T02, etc.)
- `topics` - CAM topics (T01.01, T01.02, etc.)
- `concepts` - CAM concepts with difficulty levels
- `canonical_explanations` - Topic explanations
- `questions` - Question bank (protected)
- `quiz_sessions` - Active sessions with question queue
- `session_answers` - Answer history per session
- `concept_progress` - Per-user mastery tracking
- `topic_progress` - Aggregated proficiency per topic
- `refresh_tokens` - JWT refresh token storage
- `audit_logs` - Security audit trail

#### Authentication System
- Google OAuth via `google-auth-library`
- JWT access tokens (15min expiry)
- Refresh token rotation (7 day expiry)
- HttpOnly cookie storage for refresh tokens
- Token revocation support

#### API Endpoints (Implemented)
```
GET  /health                    - Health check
POST /api/v1/auth/google        - Google OAuth login
POST /api/v1/auth/refresh       - Refresh access token
POST /api/v1/auth/logout        - Logout (revoke token)
POST /api/v1/auth/logout-all    - Logout all devices
GET  /api/v1/auth/me            - Get current user
```

### Remaining (Phase 1)

#### Session Service
- [ ] Question selector (adaptive algorithm)
- [ ] Session creation with question queue
- [ ] Answer submission & validation
- [ ] Session state management

#### Session Endpoints
```
POST /api/v1/sessions                    - Create quiz session
POST /api/v1/sessions/:id/start          - Start session
GET  /api/v1/sessions/:id/question       - Get current question (NO answer)
POST /api/v1/sessions/:id/answer         - Submit answer
POST /api/v1/sessions/:id/skip           - Skip question
POST /api/v1/sessions/:id/end            - End session
GET  /api/v1/sessions                    - List user sessions
```

#### Progress Endpoints
```
GET  /api/v1/progress                    - Full user progress
GET  /api/v1/progress/summary            - Dashboard stats
GET  /api/v1/progress/topics/:topicId    - Topic progress
POST /api/v1/progress/export             - Export as JSON
POST /api/v1/progress/import             - Import from JSON
DELETE /api/v1/progress                  - Reset all progress
```

#### CAM Endpoints
```
GET  /api/v1/cam                         - Full curriculum structure
GET  /api/v1/cam/topics/:topicId         - Single topic details
```

#### Deployment
- [ ] Create `render.yaml` for Render deployment
- [ ] Set up PostgreSQL on Render
- [ ] Configure environment variables
- [ ] Deploy and test

---

## Phase 2: React Native Mobile App (NOT STARTED)

### Project Structure (Planned)
```
qming-kids-mobile/
├── src/
│   ├── api/                 # API client + React Query hooks
│   ├── components/          # UI components
│   │   ├── common/          # Button, Card, Modal, etc.
│   │   ├── quiz/            # MCQOptions, Timer, Feedback
│   │   ├── home/            # ThemeSection, TopicCard
│   │   └── settings/        # StatCard, SettingsItem
│   ├── screens/             # Screen components
│   │   ├── auth/            # Login, Splash
│   │   ├── home/            # Home (topic browser)
│   │   ├── quiz/            # Quiz, Summary
│   │   └── settings/        # Settings
│   ├── navigation/          # React Navigation setup
│   ├── store/               # Zustand state management
│   ├── services/            # Auth, quiz engine
│   ├── theme/               # Colors, typography, spacing
│   └── types/               # TypeScript interfaces
├── android/                 # Android native
└── ios/                     # iOS native
```

### Key Dependencies
```json
{
  "react-native": "^0.73",
  "@react-navigation/native": "^6.x",
  "@react-native-google-signin/google-signin": "^11.x",
  "react-native-keychain": "^8.x",
  "zustand": "^4.x",
  "@tanstack/react-query": "^5.x",
  "react-native-reanimated": "^3.x",
  "react-native-draggable-flatlist": "^4.x"
}
```

### Screens
1. **SplashScreen** - Token validation on launch
2. **LoginScreen** - Google OAuth + parental consent
3. **HomeScreen** - Topic browser with proficiency badges
4. **QuizScreen** - Question display (all types)
5. **SummaryScreen** - Session results
6. **SettingsScreen** - Stats, export/import, reset

---

## Phase 3: Security & Compliance (NOT STARTED)

### Question Protection (7 Layers)
1. Authentication required for all question access
2. Session binding - questions tied to active sessions
3. One question at a time - never expose full bank
4. Correct answer withheld until submission
5. Rate limiting - 30 questions/minute max
6. Request fingerprinting for anomaly detection
7. Audit logging for all question access

### COPPA Compliance (US - Children under 13)
- [ ] Parental consent flow with email verification
- [ ] Parent dashboard (view/delete child data)
- [ ] No behavioral advertising
- [ ] Data retention policy (12 months inactive)
- [ ] Privacy policy for children

### GDPR Compliance (EU)
- [ ] Geo-based consent flows
- [ ] Data subject rights (access, delete, export)
- [ ] Data Protection Impact Assessment

### App Store Compliance
**iOS (Kids Category):**
- Age band 9-11
- No third-party analytics SDKs
- Parental gate for external links
- Complete App Privacy Labels

**Android (Families Policy):**
- Families Policy questionnaire
- Data Safety Section
- COPPA/GDPR certification

---

## Phase 4: Web App Updates (NOT STARTED)

- [ ] Update `vercel.json` with security headers
- [ ] Add authentication flow to web app
- [ ] Connect to backend API instead of JSON files
- [ ] Remove direct question file access

---

## Phase 5: Testing & Launch (NOT STARTED)

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for API
- [ ] E2E tests for critical flows
- [ ] Security penetration testing
- [ ] Load testing

### App Store Submission
- [ ] iOS App Store listing
- [ ] Google Play listing
- [ ] Screenshots and marketing materials

---

## Key Files Reference

### Existing (to port/reference)
| File | Purpose |
|------|---------|
| `quiz-engine/core/mastery-tracker.js` | Mastery logic (ported) |
| `quiz-engine/core/proficiency-calculator.js` | Proficiency bands (ported) |
| `quiz-engine/core/question-selector.js` | Adaptive selection (to port) |
| `quiz-engine/core/session-manager.js` | Session state (to port) |
| `ui/js/app.js` | UI flow reference |
| `ui/css/styles.css` | Design tokens |
| `cam/data/icse-class5-mathematics-cam.json` | Curriculum structure |
| `questions/data/*.json` | 30 question bank files |

### New Backend Files
| File | Purpose |
|------|---------|
| `qming-kids-backend/src/app.ts` | Express app entry |
| `qming-kids-backend/src/services/auth.service.ts` | Google OAuth |
| `qming-kids-backend/src/services/mastery.service.ts` | Mastery tracking |
| `qming-kids-backend/src/services/proficiency.service.ts` | Proficiency bands |
| `qming-kids-backend/src/middleware/auth.ts` | JWT middleware |
| `qming-kids-backend/src/db/migrations/001_initial_schema.sql` | Full schema |

---

## Environment Variables Required

```env
# Server
NODE_ENV=production
PORT=3001

# Database (from Render)
DATABASE_URL=postgresql://...

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# JWT (generate secure random strings)
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Security
CORS_ORIGIN=https://coolscool.vercel.app
```

---

## Next Steps (Priority Order)

1. **Complete Session Service** - Question selection, answer submission
2. **Create Session/Progress Routes** - Complete API
3. **Deploy to Render** - Test in production
4. **Update Web App** - Connect to backend
5. **Start React Native** - Mobile app development
6. **Compliance** - COPPA, app store requirements

---

## Notes for Continuation

- User wants **full implementation** (not MVP)
- Chose **React Native** for mobile (not PWA)
- Chose **PostgreSQL on Render** for database
- Chose **Maximum protection** for questions (one at a time)
- **No offline support** needed (online-only)
- User has existing accounts on Vercel, Render, GitHub
- Current web app deployed at `coolscool.vercel.app`
