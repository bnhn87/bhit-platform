# Vercel Deployment Troubleshooting Guide

**Last Updated:** 2025-11-03
**Status:** Ready for Deployment

---

## Quick Diagnosis Checklist

Before anything else, check these in Vercel dashboard:

- [ ] All environment variables are set (see list below)
- [ ] Environment variables are set for **Production**, **Preview**, AND **Development**
- [ ] Correct branch is selected for deployment (`main`)
- [ ] `vercel.json` exists in repository root
- [ ] Latest commit is being deployed (check commit hash)

---

## Required Environment Variables

### ✅ Must Be Set in Vercel Dashboard

Go to: **Project Settings** → **Environment Variables**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
```

### ⚠️ Important Notes:
1. **Apply to all environments**: Production, Preview, Development
2. **No quotes**: Enter values without quotes
3. **No trailing spaces**: Copy/paste carefully
4. **Full URLs**: Include `https://` in URLs
5. **Keys must match**: Use keys from the SAME Supabase project

### Optional but Recommended:
```
DATABASE_URL=postgresql://postgres...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

---

## Common Vercel Build Errors

### Error 1: "Missing required environment variables"

**Error Message:**
```
Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add all required variables listed above
3. Make sure they're set for all environments (Production, Preview, Development)
4. Click "Redeploy" after adding variables

**Why it happens:**
- Environment variables from `.env.local` are not automatically copied to Vercel
- Each environment must be configured separately

---

### Error 2: "Command failed with exit code 1"

**Error Message:**
```
Error: Command "cd apps/web && npm run build" exited with 1
```

**Causes & Solutions:**

**A. Wrong Build Command:**
- **Check**: Vercel is trying to run `cd apps/web && npm run build`
- **Fix**: This is correct IF you have `vercel.json` at repo root
- **Verify**: `vercel.json` exists and has correct configuration

**B. Missing Dependencies:**
- **Check**: Look for "Module not found" errors in logs
- **Fix**: Ensure `package.json` has all dependencies
- **Local test**: Run `rm -rf node_modules && npm install && npm run build`

**C. TypeScript Errors:**
- **Check**: Look for "Type error" messages in logs
- **Fix**: Run `npm run build` locally first
- **If passing locally**: Issue is environment-specific

**D. Out of Memory:**
- **Check**: Look for "JavaScript heap out of memory" in logs
- **Fix**: Contact Vercel support or upgrade plan
- **Workaround**: Add to `package.json`:
  ```json
  "scripts": {
    "build": "NODE_OPTIONS='--max_old_space_size=4096' next build"
  }
  ```

---

### Error 3: "Module not found: Can't resolve..."

**Error Message:**
```
Module not found: Can't resolve '@heroicons/react/24/outline'
```

**Solution:**
1. Ensure dependency is in `package.json`
2. Run locally: `npm install @heroicons/react`
3. Commit `package.json` and `package-lock.json`
4. Push to trigger new deployment

**Already Fixed:** ✅ This was fixed in commit `8d7f41c`

---

### Error 4: "Build exceeded maximum duration"

**Error Message:**
```
Error: Build exceeded maximum duration of 45 minutes
```

**Solutions:**
1. **Optimize build**: Check for infinite loops or slow operations
2. **Clear cache**: Redeploy without cache
3. **Upgrade plan**: Free tier has 45min limit, Pro has 60min

---

### Error 5: "404: NOT_FOUND"

**After successful build, page shows 404**

**Solutions:**
1. **Check routes**: Ensure pages are in correct directory structure
2. **Middleware**: Check middleware.ts isn't blocking routes
3. **Rewrites**: Verify next.config.js rewrites/redirects
4. **ISR/SSG**: Check getStaticPaths if using static generation

---

## Vercel Configuration

### vercel.json (Repository Root)

Current configuration:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd apps/web && npm install && npm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "cd apps/web && npm install",
  "framework": null,
  "devCommand": "cd apps/web && npm run dev"
}
```

### Project Settings to Verify

In Vercel Dashboard → Settings:

**Build & Development Settings:**
- Framework Preset: `Other` or `Next.js` (auto-detected)
- Root Directory: Leave blank (or set to `apps/web`)
- Build Command: Handled by `vercel.json`
- Output Directory: Handled by `vercel.json`
- Install Command: Handled by `vercel.json`

**Git:**
- Repository: Correct GitHub repo
- Production Branch: `main`
- Auto-deploy: Enabled

**Node.js Version:**
- Should be 18.x or higher
- Check in deployment logs: "Node.js version: 18.x"

---

## Step-by-Step Deployment Fix

### Step 1: Verify Local Build

```bash
cd /Users/benjaminhone_1/Desktop/BHIT\ WORK\ OS/apps/web
npm run build
```

✅ Should complete without errors
❌ If fails, fix errors before deploying

### Step 2: Check Git Status

```bash
git status
git log --oneline -5
```

✅ Should be on `main` branch
✅ Should show recent commits
✅ No uncommitted changes that need to be deployed

### Step 3: Verify Vercel.json

```bash
cat /Users/benjaminhone_1/Desktop/BHIT\ WORK\ OS/vercel.json
```

✅ File should exist at repo root
✅ Should contain build configuration

### Step 4: Set Environment Variables

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (paste from `.env.local`)
   - Environment: Check **Production**, **Preview**, **Development**
   - Click **Save**
5. Repeat for all required variables

### Step 5: Trigger Deployment

**Option A: Git Push**
```bash
git add .
git commit -m "Fix deployment configuration"
git push origin main
```

**Option B: Manual Redeploy**
1. Go to Vercel Dashboard → Deployments
2. Find latest deployment
3. Click **"..."** → **Redeploy**
4. Check **"Use existing build cache"** or uncheck for fresh build

### Step 6: Monitor Deployment

1. Watch the build logs in real-time
2. Look for the specific error message
3. Note the step where it fails:
   - Installing dependencies?
   - Running build command?
   - Type checking?
   - Generating pages?

---

## Getting Deployment Logs

### In Vercel Dashboard:
1. Go to **Deployments**
2. Click on the failed deployment
3. Click **"Building"** to see full logs
4. Copy error messages

### Via Vercel CLI:
```bash
npm i -g vercel
vercel login
vercel logs [deployment-url]
```

---

## Environment Variable Debugging

### Check if Variables are Set:

Create `pages/api/debug/env-check.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  return res.json({
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    urlStart: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20),
  });
}
```

Access: `https://your-deployment-url.vercel.app/api/debug/env-check`

---

## Build Performance Tips

### 1. Use Build Cache
- Vercel caches `node_modules` and `.next/cache`
- Only clear if you suspect cache corruption

### 2. Optimize Dependencies
```bash
# Check bundle size
npm run build -- --profile

# Analyze what's being bundled
npm install -g @next/bundle-analyzer
```

### 3. Reduce Build Time
- Use `output: 'standalone'` in next.config.js
- Enable SWC minification (already enabled by default in Next 15)
- Consider removing unused dependencies

---

## Emergency Rollback

If new deployment is broken:

1. Go to Vercel Dashboard → Deployments
2. Find a working previous deployment
3. Click **"..."** → **"Promote to Production"**
4. This instantly rolls back to the working version

---

## Contact Support

If none of these solutions work:

1. **Vercel Support**: https://vercel.com/support
2. **Include**:
   - Deployment URL
   - Error messages from logs
   - Steps you've tried
   - Screenshot of environment variables (names only, not values)

---

## Checklist Before Asking for Help

- [ ] All environment variables set in Vercel dashboard
- [ ] Variables applied to all environments (Production/Preview/Dev)
- [ ] Local build passes: `npm run build`
- [ ] Latest code is pushed to `main` branch
- [ ] `vercel.json` exists at repository root
- [ ] No TypeScript errors locally
- [ ] Tried redeploying after setting variables
- [ ] Checked deployment logs for specific error
- [ ] Cleared Vercel build cache and redeployed

---

## Current Build Status

✅ **Local Build**: Passing (1.8s compile time)
✅ **TypeScript**: All errors fixed
✅ **Dependencies**: All installed
✅ **Configuration**: vercel.json created
✅ **Documentation**: Complete

**Next Action**: Set environment variables in Vercel dashboard and redeploy.
