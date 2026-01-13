# Continuation Prompt for New Thread

Copy and paste the following into a new Claude Code session:

---

## Context

I'm building an enterprise-grade educational quiz app called **Cool S-cool** (QMing-Kids) for ICSE Class 5 Mathematics students (ages 10-11).

**Read these files first to understand the project:**
1. `ENTERPRISE_TRANSFORMATION.md` - Full documentation of what's been built and what remains
2. `qming-kids-backend/` - Partially built Node.js/Express backend

## What's Already Built

### Backend (Partially Complete)
Located in `qming-kids-backend/`:
- Express app with TypeScript
- PostgreSQL schema (11 tables) in `src/db/migrations/001_initial_schema.sql`
- Google OAuth authentication (complete)
- JWT token management (complete)
- Mastery tracking service (ported from quiz-engine)
- Proficiency bands service (ported from quiz-engine)
- Security middleware (Helmet, CORS, rate limiting)
- Data seeding scripts for CAM and questions

### Original App
- Static quiz app in `ui/` (vanilla JS)
- Quiz engine in `quiz-engine/` (to be ported to backend)
- Questions in `questions/data/*.json` (~1,600 questions)
- CAM in `cam/data/icse-class5-mathematics-cam.json`
- Currently deployed at `coolscool.vercel.app`

## What Needs to Be Done

### Backend (Remaining)
1. **Session Service** - Port `quiz-engine/core/question-selector.js` and `session-manager.js`
2. **Session Routes** - Create, start, get question, submit answer, skip, end
3. **Progress Routes** - Get progress, export, import, reset
4. **CAM Routes** - Get curriculum structure
5. **Render Deployment** - `render.yaml` and deploy

### React Native Mobile App (Not Started)
- Full React Native app for iOS and Android
- Google Sign-In integration
- All quiz functionality (MCQ, fill-blank, ordering, true/false)
- Proficiency badges and progress tracking

### Compliance (Not Started)
- COPPA parental consent flow
- Privacy policy
- App store requirements

## Technical Decisions Made
- **Database:** PostgreSQL on Render (free tier)
- **Mobile:** React Native (not PWA)
- **Question Security:** Maximum protection (one question at a time, server-side only)
- **Offline:** Not required (online-only)
- **Auth:** Google OAuth with JWT

## My Accounts
- Vercel (web hosting)
- Render (backend + database)
- GitHub (version control)

---

## What I Need Help With

[DESCRIBE YOUR SPECIFIC REQUEST HERE - e.g., "Continue building the session service and routes" or "Start the React Native mobile app" or "Deploy to Render"]

---

## Additional App Requirements

[ADD YOUR ADDITIONAL DETAILS HERE - What features should the app have? What should the user experience be like? Any specific requirements for the mobile app or web app?]

---
