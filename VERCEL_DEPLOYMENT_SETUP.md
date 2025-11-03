# Vercel Deployment Setup Guide

## Overview
This project is deployed on Vercel from the `main` branch. The repository is structured as a monorepo with the Next.js app located in `apps/web/`.

## Repository Structure
```
BHIT WORK OS/ (git root)
├── apps/
│   └── web/        (Next.js application)
├── vercel.json     (Vercel configuration)
└── .gitignore
```

## Vercel Project Configuration

### 1. Build & Development Settings

In your Vercel project settings (Settings > General):

- **Framework Preset**: Other (or None)
- **Root Directory**: Leave blank (using vercel.json to specify paths)
- **Build Command**: Will be read from `vercel.json`
- **Output Directory**: Will be read from `vercel.json`
- **Install Command**: Will be read from `vercel.json`

The `vercel.json` file handles all build configuration automatically.

### 2. Environment Variables

Go to Settings > Environment Variables and add the following:

#### Required Supabase Variables
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

#### Required Google AI API
```
GOOGLE_AI_API_KEY=<your-google-ai-api-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

#### Optional Environment Variables
```
NODE_ENV=production
```

**Important**:
- Set these for **Production**, **Preview**, and **Development** environments
- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Never commit `.env.local` to git

### 3. Git Integration

Make sure Vercel is connected to the correct:
- **Git Provider**: GitHub (or your provider)
- **Repository**: Your repository name
- **Branch**: `main` (for production deployments)

### 4. Deployment Triggers

Vercel will automatically deploy when:
- Code is pushed to `main` branch (Production)
- Pull requests are created (Preview deployments)

## Troubleshooting

### Build Fails with "Missing environment variables"
- Check that all required environment variables are set in Vercel dashboard
- Ensure they're set for the correct environment (Production/Preview)
- Redeploy after adding environment variables

### Build Command Not Found
- Verify `vercel.json` exists in the repository root
- Check that `apps/web/package.json` has a `build` script

### TypeScript Errors During Build
- Run `npm run build` locally to verify the build passes
- Check that all dependencies are in `package.json`
- Ensure `tsconfig.json` is properly configured

### Wrong Branch Being Deployed
- Check Vercel project settings > Git
- Verify the production branch is set to `main`
- Check for any branch deployment overrides

## Testing Deployment Locally

To verify the build works before pushing:

```bash
cd apps/web
npm install
npm run build
npm start
```

## Getting Environment Variable Values

### Supabase Variables
1. Go to your Supabase project dashboard
2. Settings > API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Project API Key (anon, public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### Google AI API Keys
1. Go to Google AI Studio or Google Cloud Console
2. Create or select your project
3. Generate API keys for Gemini AI

## Manual Deployment

If you need to trigger a manual deployment:
1. Go to Vercel dashboard
2. Select your project
3. Click "Deployments"
4. Click "Redeploy" on the latest deployment
5. Or push a new commit to trigger auto-deployment

## Security Notes

- Never commit `.env.local` or environment variables to git
- Rotate service role keys periodically
- Use environment-specific keys (separate keys for production/development)
- Monitor API usage in Google Cloud Console and Supabase dashboard

## Support

If deployment issues persist:
1. Check Vercel deployment logs for specific errors
2. Verify all environment variables are set correctly
3. Ensure the build passes locally with `npm run build`
4. Check Vercel status page for any platform issues
