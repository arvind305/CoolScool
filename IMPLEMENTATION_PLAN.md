# CoolSCool Implementation Plan

## Date: 2026-02-09
## Scope: Explanation Pipeline Overhaul + User Profile System

---

## CURRENT STATE (Verified Facts)

### Question Data — JSON Files
- **28,114 total questions** across 443+ topic files in `questions/data/`
  - Maths: 15,273 questions across 250 files (Classes 1-10; Class 5 = 32 loose files in `questions/data/` root)
  - Science: 12,841 questions across 225 files (Classes 1-5 EVS, Classes 6-10 Physics/Chemistry/Biology)
- **Zero questions in any JSON file** have `explanation_correct` or `explanation_incorrect` fields

### Question Data — Database (Verified via Live Query on 2026-02-09)

**Maths — 99.4% complete in DB:**

| Class | Total | Has Explanations | Missing |
|-------|-------|-----------------|---------|
| 1     | 1,200 | 1,200           | 0       |
| 2     | 1,150 | 1,150           | 0       |
| 3     | 1,450 | 1,450           | 0       |
| 4     | 750   | 750             | 0       |
| 5     | 1,688 | 1,600           | **88**  |
| 6     | 1,300 | 1,300           | 0       |
| 7     | 1,250 | 1,250           | 0       |
| 8     | 1,100 | 1,100           | 0       |
| 9     | 1,450 | 1,450           | 0       |
| 10    | 1,250 | 1,250           | 0       |
| **Total** | **12,588** | **12,500** | **88** |

**Science — ~28% complete in DB (generator ran but stopped partway):**

| Subject    | Class | Total | Has Explanations | Missing |
|------------|-------|-------|-----------------|---------|
| Science    | 1     | 570   | 181             | 389     |
| Science    | 2     | 570   | 176             | 394     |
| Science    | 3     | 570   | 171             | 399     |
| Science    | 4     | 684   | 228             | 456     |
| Science    | 5     | 798   | 157             | 641     |
| Biology    | 6     | 513   | 97              | 416     |
| Biology    | 7     | 627   | 139             | 488     |
| Biology    | 8     | 513   | 27              | 486     |
| Biology    | 9     | 741   | 99              | 642     |
| Biology    | 10    | 797   | 90              | 707     |
| Chemistry  | 6     | 456   | 181             | 275     |
| Chemistry  | 7     | 570   | 186             | 384     |
| Chemistry  | 8     | 628   | 172             | 456     |
| Chemistry  | 9     | 684   | 152             | 532     |
| Chemistry  | 10    | 798   | 21              | 777     |
| Physics    | 6     | 456   | 151             | 305     |
| Physics    | 7     | 570   | 155             | 415     |
| Physics    | 8     | 870   | 149             | 721     |
| Physics    | 9     | 683   | 132             | 551     |
| Physics    | 10    | 741   | 135             | 606     |
| **Total**  |       | **12,839** | **3,598** | **9,240** |

### Seed Scripts
- `coolscool-backend/scripts/seed-science.ts` — Seeds science Classes 1-10 (has uncommitted fix for ordering format)
- `coolscool-backend/scripts/seed-all-classes.ts` — Seeds maths Classes 1-4, 6-10 (skips Class 5)
- `coolscool-backend/scripts/seed-questions.ts` — Generic question loader
- All seed scripts do NOT read explanation fields from JSON because those fields don't exist in the files yet

### Authentication & Users
- **Auth**: NextAuth 5 + Google OAuth → Express backend with JWT (access 15m, refresh 7d)
- **Users table**: `google_id`, `email`, `display_name`, `avatar_url`, `role`, `parent_id`, `parental_consent_given/date`, `is_active`, timestamps
- **Google OAuth currently captures**: `sub` → google_id, `email`, `name` → display_name, `picture` → avatar_url
- **Google OAuth provides but NOT captured**: `given_name` (first name), `family_name` (last name)
- **No `user_profiles` table** for extended profile data
- **No profile page** in frontend. Settings page (`/settings`) stores preferences in localStorage only
- **`user_settings` table** exists in DB but frontend doesn't use it

### Tech Stack
- **Frontend**: Next.js 16.1.2, React 19.2.3, deployed on Vercel
- **Backend**: Express 4.18.2, TypeScript, raw SQL with `pg`, deployed on Render
- **Database**: PostgreSQL on Neon (ap-southeast-1)
- **Auth**: NextAuth 5, Google OAuth, JWT with refresh token rotation
- **ANTHROPIC_API_KEY**: Configured and ready at project root

---

## PART 1: EXPLANATION PIPELINE OVERHAUL

### Goal
Make JSON files the **single source of truth** — questions AND explanations live together in version-controlled files. The database is always reproducible from files alone.

### Step 1.0: Move Class 5 Maths Files

Move the 32 loose Class 5 Maths JSON files from `questions/data/*.json` into `questions/data/class5/` to match the directory pattern used by all other classes.

Update `coolscool-backend/scripts/seed-all-classes.ts` to include Class 5 in its seeding loop (currently skipped).

### Strategy: Export First, Generate Only What's Missing

| Source | Questions | Action | API Calls | Cost |
|--------|-----------|--------|-----------|------|
| Maths (DB → files) | 12,500 | Export existing explanations from DB into JSON files | 0 | $0 |
| Maths Class 5 gaps | 88 | Generate via API into JSON files | 88 | ~$0.01 |
| Science (DB → files) | 3,598 | Export existing explanations from DB into JSON files | 0 | $0 |
| Science gaps (API → files) | 9,240 | Generate via API into JSON files | 9,240 | ~$0.30 |
| **Total** | **25,426** | | **9,328** | **~$0.31** |

### Step 1.1: Create DB-to-File Export Script

**New script**: `scripts/export-explanations-from-db.ts`

This script:
1. Connects to the database
2. Queries all questions that HAVE `explanation_correct` AND `explanation_incorrect` (non-NULL)
3. For each JSON file in `questions/data/` subdirectories:
   - Reads the file
   - For each question, looks up the DB explanation by matching `question_id` string (e.g., `T09.01.Q003`) within the same curriculum (board + class + subject from `cam_reference`)
   - If found, adds `explanation_correct` and `explanation_incorrect` to the question object
   - Writes the updated JSON back to the file (preserving formatting)
4. Logs: how many questions enriched, how many had no match in DB
5. Supports `--dry-run` to preview without writing

This handles **16,098 questions** — all existing Maths and partial Science explanations. Zero API calls.

### Step 1.2: Create File-Based API Explanation Generator

**New script**: `scripts/generate-explanations-to-files.ts`

This script:
1. Scans `questions/data/` subdirectories for question JSON files
2. For each file, reads all questions
3. **Skips** questions that already have both `explanation_correct` AND `explanation_incorrect` (populated by Step 1.1)
4. For questions missing either field, calls Claude API to generate both
5. Writes the updated JSON back to the file (preserving all existing fields)
6. CLI flags:
   - `--dir <path>` — Process specific directory (e.g., `class10-physics`)
   - `--class <N>` — Filter by class level (reads `cam_reference.class` from each file)
   - `--subject <name>` — Filter by subject (reads `cam_reference.subject`)
   - `--topic <id>` — Process specific topic only
   - `--dry-run` — Print prompts without calling API or writing files
   - `--concurrency <N>` — Parallel API calls (default: 5, max: 10)
7. Progress logging: `[143/9328] T09.01.Q003 — done` or `— skipped`
8. Summary: total processed, skipped, errors, time elapsed

**Prompt per question** (reuse existing prompt structure):
- Subject-aware, age-appropriate language per class level
- Uses canonical explanation from the JSON file as topic context
- Generates `explanation_correct` (1-2 sentences) and `explanation_incorrect` (2-3 sentences)
- Response: JSON `{"explanation_correct": "...", "explanation_incorrect": "..."}`

**Model**: Claude 3 Haiku (`claude-3-haiku-20240307`)

### Step 1.3: Execution Order

```bash
# 1. Export existing explanations from DB → JSON files (~2 min, free)
npx tsx scripts/export-explanations-from-db.ts

# 2. Generate remaining 88 Maths Class 5 gaps (seconds)
npx tsx scripts/generate-explanations-to-files.ts --subject Mathematics --class 5

# 3. Generate remaining ~9,240 Science gaps (~15-20 min with concurrency 5)
npx tsx scripts/generate-explanations-to-files.ts --subject Science
npx tsx scripts/generate-explanations-to-files.ts --subject Physics
npx tsx scripts/generate-explanations-to-files.ts --subject Chemistry
npx tsx scripts/generate-explanations-to-files.ts --subject Biology
```

### Step 1.4: Update Seed Scripts to Read Explanations from JSON

Modify all three seed scripts to read `explanation_correct` and `explanation_incorrect` from each question object in JSON and include them in the INSERT:

1. `coolscool-backend/scripts/seed-science.ts`
2. `coolscool-backend/scripts/seed-all-classes.ts`
3. `coolscool-backend/scripts/seed-questions.ts`

Small change per file — add two columns to the INSERT and two more fields read from each question.

### Step 1.5: Re-Seed Using Upsert

```bash
# Maths (classes 1-10, including Class 5 now)
npx tsx coolscool-backend/scripts/seed-all-classes.ts

# Science (classes 1-10)
npx tsx coolscool-backend/scripts/seed-science.ts
```

Uses `ON CONFLICT ... DO UPDATE` — overlays the enriched JSON data on top of existing DB rows. No data loss, no wipe needed. Existing explanations in the DB stay intact; new ones from JSON files fill in any remaining gaps.

### Step 1.6: Verify & Clean Up

- Spot-check 5-10 questions per subject in DB
- Verify quiz flow shows explanations on correct/incorrect answers
- Delete old `scripts/generate-explanations.ts` (superseded)
- Commit all enriched JSON files and scripts

---

## PART 2: USER PROFILE SYSTEM

### Goal
Capture user information from Google OAuth (name, email) plus extended profile data. Display on a profile page where users can view and edit their information.

### Step 2.1: Database Migration — `user_profiles` Table

**New migration**: `coolscool-backend/src/db/migrations/005_user_profiles.sql`

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Personal info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),

    -- Education
    grade INTEGER CHECK (grade BETWEEN 1 AND 12),
    school_name VARCHAR(255),

    -- Location
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',

    -- About
    bio TEXT,

    -- Parent/Guardian info
    parent_guardian_name VARCHAR(200),
    parent_guardian_phone VARCHAR(20),
    parent_guardian_email VARCHAR(255),
    parent_guardian_relationship VARCHAR(50),  -- 'father', 'mother', 'guardian', 'other'

    -- Learning preferences
    preferred_language VARCHAR(50) DEFAULT 'English',
    learning_style VARCHAR(50),               -- 'visual', 'auditory', 'reading', 'kinesthetic'
    subjects_of_interest TEXT[],              -- ['Mathematics', 'Physics', 'Biology']

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);

-- Auto-create empty profile when new user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_profile
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Backfill profiles for all existing users who don't have one
INSERT INTO user_profiles (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Apply updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 2.2: Capture `given_name` and `family_name` from Google OAuth

**Changes to `coolscool-backend/src/services/auth.service.ts`:**

1. Extend `GoogleUserInfo` interface:
   ```typescript
   export interface GoogleUserInfo {
     googleId: string;
     email: string;
     name?: string;
     givenName?: string;    // NEW — from payload.given_name
     familyName?: string;   // NEW — from payload.family_name
     picture?: string;
   }
   ```

2. In `verifyGoogleToken()`, extract `payload.given_name` and `payload.family_name`

3. In `authenticateWithGoogle()`, after user find/create, upsert profile:
   ```typescript
   await profileModel.upsertProfile(user.id, {
     first_name: googleUser.givenName,
     last_name: googleUser.familyName,
   });
   ```
   Uses `COALESCE` — if user has manually edited their name, Google data does NOT overwrite it on subsequent logins.

### Step 2.3: Backend Profile Model + API Routes

**New files:**

1. **`coolscool-backend/src/models/profile.model.ts`**
   - `getProfile(userId)` — SELECT joining users + user_profiles
   - `updateProfile(userId, fields)` — Dynamic UPDATE with only provided fields
   - `upsertProfile(userId, fields)` — INSERT ON CONFLICT for Google OAuth data

2. **`coolscool-backend/src/controllers/profile.controller.ts`**
   - `getProfile(req, res)` — Handler for GET
   - `updateProfile(req, res)` — Handler for PUT with Joi validation

3. **`coolscool-backend/src/routes/profile.routes.ts`**
   - `GET /api/v1/profile` — Requires auth, returns full profile
   - `PUT /api/v1/profile` — Requires auth, updates profile fields

**GET /api/v1/profile response:**
```json
{
  "id": "uuid",
  "email": "user@gmail.com",
  "displayName": "Arvind Kumar",
  "avatarUrl": "https://...",
  "role": "child",
  "firstName": "Arvind",
  "lastName": "Kumar",
  "phoneNumber": null,
  "dateOfBirth": null,
  "gender": null,
  "grade": null,
  "schoolName": null,
  "city": null,
  "state": null,
  "country": "India",
  "bio": null,
  "parentGuardianName": null,
  "parentGuardianPhone": null,
  "parentGuardianEmail": null,
  "parentGuardianRelationship": null,
  "preferredLanguage": "English",
  "learningStyle": null,
  "subjectsOfInterest": [],
  "createdAt": "2026-02-09T...",
  "lastLoginAt": "2026-02-09T..."
}
```

**PUT /api/v1/profile** — all fields optional:
```json
{
  "firstName": "Arvind",
  "lastName": "Kumar",
  "phoneNumber": "+91-9876543210",
  "dateOfBirth": "2012-05-15",
  "gender": "male",
  "grade": 8,
  "schoolName": "Delhi Public School",
  "city": "Mumbai",
  "state": "Maharashtra",
  "bio": "I love maths!",
  "parentGuardianName": "Rajesh Kumar",
  "parentGuardianPhone": "+91-9876543211",
  "parentGuardianEmail": "rajesh@gmail.com",
  "parentGuardianRelationship": "father",
  "preferredLanguage": "English",
  "learningStyle": "visual",
  "subjectsOfInterest": ["Mathematics", "Physics"]
}
```

**Validation (Joi):**
- `firstName`: string, max 100
- `lastName`: string, max 100
- `phoneNumber`: string, max 20
- `dateOfBirth`: ISO date, must be in the past
- `gender`: one of `['male', 'female', 'other', 'prefer_not_to_say']`
- `grade`: integer 1-12
- `schoolName`: string, max 255
- `city`: string, max 100
- `state`: string, max 100
- `bio`: string, max 500
- `parentGuardianName`: string, max 200
- `parentGuardianPhone`: string, max 20
- `parentGuardianEmail`: string, valid email, max 255
- `parentGuardianRelationship`: one of `['father', 'mother', 'guardian', 'other']`
- `preferredLanguage`: string, max 50
- `learningStyle`: one of `['visual', 'auditory', 'reading', 'kinesthetic']`
- `subjectsOfInterest`: array of strings, max 10 items

### Step 2.4: Frontend Profile Page

**New route**: `/profile` (added to protected routes in middleware)

**New files:**
- `coolscool-web/src/app/(protected)/profile/page.tsx`
- `coolscool-web/src/components/profile/profile-form.tsx`
- `coolscool-web/src/services/profile-api.ts`

**Profile page layout:**
1. **Header section**: Avatar (from Google), display name, email, role badge
2. **Profile form** — editable fields grouped in sections:
   - **Personal**: First name, Last name, Date of birth, Gender
   - **Contact**: Phone number, Email (read-only — from Google)
   - **Education**: Grade/Class, School name
   - **Location**: City, State, Country
   - **Parent/Guardian**: Name, Phone, Email, Relationship
   - **Learning Preferences**: Preferred language, Learning style, Subjects of interest (multi-select)
   - **About**: Bio (textarea)
3. **Save button**: Calls `PUT /api/v1/profile`
4. **Success/error feedback**: Inline message or toast

**Navigation updates:**
- Add "My Profile" link to user menu dropdown (`user-menu.tsx`)

### Step 2.5: Update Auth Response & Frontend Types

1. Backend `authenticateWithGoogle()` response returns `firstName` and `lastName` from profile
2. Backend `GET /api/v1/auth/me` joins with `user_profiles` for basic info
3. Frontend types (`types/auth.ts`, `types/next-auth.d.ts`) extended with `firstName`, `lastName`
4. Full profile data fetched via `GET /api/v1/profile` on the profile page only

### Step 2.6: Register Routes

- `coolscool-backend/src/app.ts` — import and mount profile routes
- `coolscool-web/src/middleware.ts` — add `/profile` to protected route list

---

## FILE CHANGE SUMMARY

### New Files
| File | Purpose |
|------|---------|
| `scripts/export-explanations-from-db.ts` | Export existing DB explanations into JSON files |
| `scripts/generate-explanations-to-files.ts` | Generate missing explanations via API into JSON files |
| `coolscool-backend/src/db/migrations/005_user_profiles.sql` | user_profiles table + trigger + backfill |
| `coolscool-backend/src/models/profile.model.ts` | Profile database operations |
| `coolscool-backend/src/controllers/profile.controller.ts` | Profile route handlers |
| `coolscool-backend/src/routes/profile.routes.ts` | Profile route definitions |
| `coolscool-web/src/app/(protected)/profile/page.tsx` | Profile page |
| `coolscool-web/src/components/profile/profile-form.tsx` | Profile edit form component |
| `coolscool-web/src/services/profile-api.ts` | Frontend profile API client |

### Modified Files
| File | Change |
|------|--------|
| `coolscool-backend/scripts/seed-science.ts` | Read explanation fields from JSON, include in INSERT |
| `coolscool-backend/scripts/seed-all-classes.ts` | Same + include Class 5 in seeding loop |
| `coolscool-backend/scripts/seed-questions.ts` | Same |
| `coolscool-backend/src/services/auth.service.ts` | Capture given_name/family_name, upsert profile on login |
| `coolscool-backend/src/app.ts` | Register profile routes |
| `coolscool-web/src/middleware.ts` | Add `/profile` to protected routes |
| `coolscool-web/src/components/auth/user-menu.tsx` | Add "My Profile" link |
| `coolscool-web/src/types/auth.ts` | Extend BackendUser with firstName, lastName |
| `coolscool-web/src/types/next-auth.d.ts` | Extend session types |
| `questions/data/**/*.json` | All 443+ files get explanation fields added to every question |

### Files Moved
| From | To |
|------|-----|
| `questions/data/T*.json` (32 files) | `questions/data/class5/T*.json` |

### Files to Delete
| File | Reason |
|------|--------|
| `scripts/generate-explanations.ts` | Superseded by file-based scripts |
| `questions/validation/*.js` (7 files) | Debug/temp scripts |
| `_class3_topiclines.jsonl` | Temp file |
| `_class3_topics.json` | Temp file |
| `nul` | Accidental empty file |

---

## EXECUTION ORDER

```
Phase 0: Housekeeping
  0.1  Move 32 Class 5 Maths files from questions/data/ to questions/data/class5/
  0.2  Delete temp files (nul, _class3_topiclines.jsonl, _class3_topics.json)

Phase 1: Explanation Pipeline (no user-facing changes)
  1.1  Create scripts/export-explanations-from-db.ts
  1.2  Create scripts/generate-explanations-to-files.ts
  1.3  Run export script — pulls 16,098 existing explanations from DB into JSON files
  1.4  Run generator for Maths Class 5 (88 questions via API)
  1.5  Run generator for Science/Physics/Chemistry/Biology (~9,240 questions via API)
  1.6  Verify all JSON files have explanations on every question
  1.7  Update 3 seed scripts to read explanation fields from JSON
  1.8  Re-seed DB via upsert (maths + science)
  1.9  Spot-check DB, verify quiz shows explanations
  1.10 Delete old scripts/generate-explanations.ts
  1.11 Commit

Phase 2: User Profile System
  2.1  Create + run migration 005_user_profiles.sql
  2.2  Create profile.model.ts
  2.3  Create profile.controller.ts + profile.routes.ts
  2.4  Register profile routes in app.ts
  2.5  Update auth.service.ts — capture given_name/family_name, upsert profile
  2.6  Create frontend profile-api.ts service
  2.7  Create profile page + profile form component
  2.8  Update user-menu.tsx with "My Profile" link
  2.9  Update middleware.ts with /profile route
  2.10 Update frontend auth types
  2.11 Test end-to-end: sign in → profile auto-created → view → edit → save
  2.12 Commit

Phase 3: Final Verification
  3.1  Full app test: login, browse, quiz with explanations, profile
  3.2  Clean up validation scripts (questions/validation/*.js)
  3.3  Final commit
```

---

## RISKS AND MITIGATIONS

| Risk | Mitigation |
|------|------------|
| DB question_id doesn't match JSON question_id during export | Match on `question_id` + curriculum (board/class/subject). Log mismatches. |
| API rate limits during science generation | Configurable concurrency, resume capability (skip already-done questions) |
| Bad/hallucinated explanations from API | Spot-check samples per subject; generator re-runnable per topic |
| Google OAuth doesn't always return given_name/family_name | Optional in Google payload; COALESCE and null-safe handling |
| Existing users won't have profiles | Migration includes backfill INSERT for all existing users |
| Class 5 Maths file move breaks seed script | Update seed-all-classes.ts to include Class 5 in its loop |
| Upsert during re-seed could overwrite good DB explanations with NULL | Seed scripts use COALESCE: only update explanation if JSON value is non-null |
