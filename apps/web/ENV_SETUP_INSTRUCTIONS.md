# Environment Variables Setup Instructions

## 🚨 Action Required: Complete Your Environment Configuration

I've created your `.env.local` file with the Supabase project URL, but you need to add the API keys to complete the setup.

## Steps to Get Your Supabase Keys

### 1. Get API Keys
Visit your Supabase Dashboard API Settings:
**https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/settings/api**

You'll find three important values:

#### a) Project URL (Already filled in ✅)
- Value: `https://wivpmbeuwxpwlptemjuf.supabase.co`
- Already set in `.env.local`

#### b) Anon (Public) Key ⚠️ **REQUIRED**
- Look for: "Project API keys" section → "anon" / "public"
- Copy this value and replace `your_supabase_anon_key_here` in `.env.local`

#### c) Service Role Key ⚠️ **REQUIRED**
- Look for: "Project API keys" section → "service_role"
- Copy this value and replace `your_supabase_service_role_key_here` in `.env.local`
- **Warning**: This key has admin privileges. Never commit it to git or expose it in client-side code.

### 2. Get Database Password (Optional but Recommended)
Visit your Supabase Database Settings:
**https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/settings/database**

- Look for "Connection pooling" → "Transaction mode"
- Copy the connection string
- Replace `[YOUR-PASSWORD]` in the `DATABASE_URL` in `.env.local`

### 3. AI Services (Optional)
Only needed if you're using AI features:

#### Gemini API Key
- Visit: https://aistudio.google.com/app/apikey
- Create/copy your API key
- Replace `your_gemini_api_key` in `.env.local`

#### OpenAI API Key
- Visit: https://platform.openai.com/api-keys
- Create/copy your API key
- Replace `your_openai_api_key` in `.env.local`

## Quick Edit Command

To edit your `.env.local` file:

```bash
cd apps/web
nano .env.local  # or use your preferred editor
```

## After Setting Up Environment Variables

Once you've filled in the required keys, run:

```bash
cd apps/web
npm run build
```

If the build succeeds, you're all set! 🎉

## Security Reminder

- ✅ `.env.local` is already in `.gitignore` (won't be committed)
- ⚠️ Never share your `SERVICE_ROLE_KEY` publicly
- ⚠️ Never commit `.env.local` to version control
- ⚠️ Use different keys for development and production

## Troubleshooting

### Build still failing?
1. Make sure you've replaced ALL placeholder values in `.env.local`
2. Check that the keys don't have any extra spaces or quotes
3. Restart your development server if it's running

### Can't find the keys?
1. Make sure you're logged into the correct Supabase account
2. Verify you have access to project `wivpmbeuwxpwlptemjuf`
3. Check with your team admin if you don't have access

## Need Help?

If you encounter issues:
1. Verify your Supabase project is active
2. Check that you have the correct permissions
3. Review the Supabase dashboard for any project status issues
