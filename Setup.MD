# CoolSCool Backend Deployment Setup Guide

## Progress Tracker

- [x] Step 1: Revoke old Neon database password
- [x] Step 2: Update render.yaml with correct build command
- [ ] Step 3: Commit the backend to git
- [ ] Step 4: Push to GitHub
- [ ] Step 5: Set environment variables in Render dashboard
- [ ] Step 6: Deploy on Render
- [ ] Step 7: Verify deployment

---

## Step 1: Revoke Old Database Password ✅ DONE

You have already set a new password on Neon. Great!

---

## Step 2: Update render.yaml ✅ DONE

The build command now includes database migrations and seeding:
```
npm install && npm run build && npm run migrate && npm run seed:cam && npm run seed:questions
```

---

## Step 3: Commit Backend to Git

The `coolscool-backend/` folder is currently untracked and needs to be committed.

**Status:** Pending

---

## Step 4: Push to GitHub

Push all changes to your GitHub repository.

**Status:** Pending

---

## Step 5: Set Environment Variables in Render

You need to set these in Render dashboard:

| Variable | Value | Status |
|----------|-------|--------|
| DATABASE_URL | Your new Neon connection string | Pending |
| GOOGLE_CLIENT_ID | Your Google OAuth Client ID | Pending |
| GOOGLE_CLIENT_SECRET | Your Google OAuth Client Secret | Pending |
| CORS_ORIGIN | Your Vercel frontend URL | Pending |
| JWT_SECRET | (Render auto-generates) | Pending |
| JWT_REFRESH_SECRET | (Render auto-generates) | Pending |

---

## Step 6: Deploy on Render

Trigger deployment from Render dashboard.

**Status:** Pending

---

## Step 7: Verify Deployment

Test these endpoints:
- [ ] Health check: `GET https://coolscool-api.onrender.com/health`
- [ ] CAM data: `GET https://coolscool-api.onrender.com/api/v1/cam`

**Status:** Pending

---

## Current Step: 3 - Commit Backend to Git

Next action: Claude will commit the coolscool-backend folder and all changes to git.
