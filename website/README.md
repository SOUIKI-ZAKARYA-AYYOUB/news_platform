# Newsly Website

Newsly is a Next.js website that shows articles scraped by the scraping system.
Its role is to present the news feed to users, with optional personalization using Supabase.

## What This Website Is About

This app displays recent news from multiple sources in a clean dashboard view.
It can read local scraper JSON directly, or sync articles into Supabase when configured.

## How News Is Read And Displayed

- The API route app/api/articles reads scraper output when there is no active user session.
- The dashboard page app/dashboard/page.tsx loads those articles and renders them with ArticleCard components.
- The loader supports these default scraper output paths:
  - ../scraping_system/news/latest-news.json
  - ../scraping_system/data/news/latest-news.json

## Quick Run (Local)

### 1) Run the scraper first
From the scraping_system folder, generate fresh JSON:

```bash
npm run scrape
```

### 2) Install website dependencies
From the website folder:

```bash
npm install
```

### 3) Start the website

```bash
npm run dev
```

Open http://localhost:3000 and go to /dashboard to see the news feed.

## Optional Environment Variables

Create .env.local in website if you want custom paths or Supabase:

```env
# Optional custom scraper JSON file path
SCRAPER_OUTPUT_PATH=../scraping_system/news/latest-news.json

# Optional scraper project path for cron sync runs
SCRAPER_SYSTEM_PATH=../scraping_system

# Optional remote JSON source instead of local file
# SCRAPER_JSON_URL=https://example.com/latest-news.json

# Optional Supabase mode (for auth + preferences + DB storage)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# JWT_SECRET=your_jwt_secret
# CRON_SECRET=your_cron_secret
```

## Main Folders

- app: pages and API routes.
- components: UI building blocks for auth and dashboard.
- lib: auth, session, scraper-sync, and utility logic.
- context: global auth state.
- scripts: SQL setup files for Supabase.
