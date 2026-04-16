# Newsly Quick Start Guide

Get **Newsly** up and running in 5 minutes!

## 1. Database Setup

Your Supabase credentials:
- **Project ID**: xabhtfxpgzkhsfrjtjjg
- **URL**: https://xabhtfxpgzkhsfrjtjjg.supabase.co

The environment variables are already configured in `.env.local`.

### Run the Database Schema

1. Go to [Supabase Dashboard](https://supabase.com)
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents from `scripts/01-setup-database.sql`
5. Click **Run**

This will create all necessary tables and seed categories.

## 2. Start Development Server

```bash
pnpm install
pnpm dev
```

The app will be available at `http://localhost:3000`

## 3. Test the App

### Sign Up
1. Go to home page
2. Click **Get Started**
3. Complete 4-step signup:
   - Enter email
   - Choose username
   - Set password (min 8 chars, 1 uppercase, 1 number)
   - Select at least 2 categories
4. You'll be automatically signed in and redirected to dashboard

### View Feed
1. Dashboard shows articles from your selected categories
2. Click **Edit Preferences** to change categories
3. Articles auto-refresh every 2 hours via background job

### Sign Out
- Click menu (top right) → **Sign Out**

## 4. Test with Placeholder Articles

The background scraper runs every 2 hours, but you can test it manually:

```bash
curl -X GET http://localhost:3000/api/cron/scrape-articles \
  -H "Authorization: Bearer your_cron_secret"
```

Or set `CRON_SECRET` in `.env.local` and visit the endpoint.

## 5. Deploy to Vercel

```bash
# Commit your code
git add .
git commit -m "Initial Newsly setup"
git push origin main

# Create Vercel project from dashboard at vercel.com
# Connect your GitHub repo and deploy
```

Add environment variables in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=https://xabhtfxpgzkhsfrjtjjg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=random_secret_key
CRON_SECRET=random_cron_secret
```

## Architecture Overview

```
User Signs Up
    ↓
4-Step Signup (Email → Username → Password → Categories)
    ↓
User Account Created in Database
    ↓
User Preferences Stored
    ↓
Redirected to Dashboard (Feed)
    ↓
Every 2 Hours: Background Job Scrapes & Stores Articles
    ↓
User Sees Personalized Feed
```

## File Organization

- **Auth Flow**: `/app/signup`, `/app/signin`
- **Dashboard**: `/app/dashboard`
- **API Endpoints**: `/app/api`
- **Utilities**: `/lib`
- **UI Components**: `/components`

## Next Steps

### 1. Integrate Real News API

Replace placeholder scraper in `/app/api/cron/scrape-articles/route.ts`:

```typescript
import fetch from 'node-fetch';

const response = await fetch(
  `https://newsapi.org/v2/everything?q=politics&apiKey=${process.env.NEWS_API_KEY}`
);
const data = await response.json();
// Transform data and insert into database
```

Supported APIs:
- NewsAPI (easiest)
- Guardian API
- NYTimes API
- RSS feeds

### 2. Add User Profiles

Create `/app/dashboard/profile/page.tsx` to let users:
- Update full name
- Add bio
- Upload avatar

### 3. Add Search & Filters

Search articles by title/keyword and filter by date range.

### 4. Add Notifications

Email/push notifications when new articles in user's categories are published.

### 5. Add Comments & Sharing

Let users comment on articles and share with friends.

## Troubleshooting

### "Database connection error"
- Check `.env.local` has correct Supabase credentials
- Verify database schema was created (check in Supabase)
- Restart development server

### "Articles not showing"
- Make sure you selected categories during signup
- Wait for cron job to run or test endpoint manually
- Check articles table in Supabase SQL Editor

### "Can't sign in"
- Verify email and password are correct
- Check user exists in `users` table
- Clear browser cookies and try again

## Support

For issues or questions:
1. Check README.md for detailed docs
2. Review the code comments
3. Check Supabase logs for database errors

Happy coding! 🚀
