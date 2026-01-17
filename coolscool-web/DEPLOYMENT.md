# Cool S-Cool Frontend Deployment Guide

## Vercel Deployment

### Prerequisites

1. A Vercel account (https://vercel.com)
2. Google Cloud project with OAuth 2.0 credentials
3. Backend deployed on Render (https://coolscool.onrender.com)

### Step 1: Create Vercel Project

1. Go to https://vercel.com/new
2. Import the `coolscool-web` directory from your GitHub repository
3. Framework Preset: Next.js (auto-detected)
4. Root Directory: `coolscool-web`

### Step 2: Configure Environment Variables

In Vercel project settings > Environment Variables, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://coolscool.onrender.com` | Backend API URL |
| `NEXTAUTH_URL` | `https://your-vercel-domain.vercel.app` | Your production URL |
| `NEXTAUTH_SECRET` | `<generated-secret>` | Generate with: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | `<your-client-id>` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `<your-client-secret>` | From Google Cloud Console |

**Important**: After first deployment, update `NEXTAUTH_URL` with your actual Vercel domain.

### Step 3: Configure Google OAuth for Production

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project
3. Navigate to APIs & Services > Credentials
4. Edit your OAuth 2.0 Client ID
5. Add to **Authorized JavaScript origins**:
   - `https://your-vercel-domain.vercel.app`
   - (Optional) Custom domain if configured
6. Add to **Authorized redirect URIs**:
   - `https://your-vercel-domain.vercel.app/api/auth/callback/google`
   - (Optional) Custom domain callback URL

### Step 4: Deploy

1. Push to your main branch, or
2. Click "Deploy" in Vercel dashboard

Vercel will automatically:
- Detect Next.js framework
- Run `npm run build`
- Deploy to CDN

### Step 5: Verify Deployment

Test the following flows:

1. **Anonymous User Flow**
   - [ ] Browse boards/classes/subjects
   - [ ] Start a quiz as anonymous user
   - [ ] Complete 3 free sample questions
   - [ ] See login prompt when samples exhausted

2. **Authentication Flow**
   - [ ] Click "Sign in with Google"
   - [ ] Successfully authenticate
   - [ ] Redirect to dashboard

3. **Authenticated User Flow**
   - [ ] View dashboard with progress
   - [ ] Complete a quiz session
   - [ ] Progress saves to backend
   - [ ] Settings page works

4. **Parent Dashboard** (if applicable)
   - [ ] Parent can view linked children
   - [ ] Progress data displays correctly

### Troubleshooting

#### OAuth Errors
- Verify redirect URIs match exactly (including trailing slashes)
- Check that `NEXTAUTH_URL` matches your Vercel domain
- Ensure Google OAuth consent screen is configured

#### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend health: `curl https://coolscool.onrender.com/api/v1/health`
- Check browser console for CORS errors

#### Build Failures
- Run `npm run build` locally to reproduce errors
- Check Vercel build logs for specific errors

### Custom Domain (Optional)

1. In Vercel project settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain
5. Add custom domain to Google OAuth authorized origins/URIs

### Production URLs

| Service | URL |
|---------|-----|
| Frontend | `https://your-vercel-domain.vercel.app` |
| Backend | `https://coolscool.onrender.com` |
| Backend Health | `https://coolscool.onrender.com/api/v1/health` |
| Backend Auth | `https://coolscool.onrender.com/api/v1/auth/google` |

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Fill in your values

# Run development server
npm run dev

# Run tests
npm test           # Jest component tests
npm run test:vitest # Quiz engine tests
npm run test:e2e   # Playwright E2E tests

# Production build
npm run build
npm start
```
