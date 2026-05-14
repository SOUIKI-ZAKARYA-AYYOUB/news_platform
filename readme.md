# Newsly — Intelligent News Aggregation Platform

Newsly is an end-to-end news aggregation platform that scrapes articles from **7+ Algerian and regional news sources** in Arabic, French, and English, deduplicates them using **TF-IDF clustering**, rewrites clickbait headlines into neutral ones, generates AI summaries, and serves everything through a modern **Next.js** web dashboard.

The platform is built around three independent modules that work together as a pipeline:

```
Scraping System ──► Embedding Model ──► Website
   (Node.js)          (Python)         (Next.js)
```

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture & Pipeline](#architecture--pipeline)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Scraping System](#1-scraping-system)
  - [2. Embedding Model](#2-embedding-model)
  - [3. Website](#3-website)
- [Environment Variables](#environment-variables)
- [Technologies](#technologies)

---

## Project Overview

Traditional news feeds are noisy: duplicate stories from different outlets, clickbait headlines, sensationalized language, and no unified categorization across languages. Newsly solves this by:

1. **Scraping** — Collecting articles from APS, TSA, Al Jazeera, Ennahar, Elheddaf, WinWin, El Hayat, and any generic RSS site.
2. **Normalizing** — Standardizing categories across Arabic, French, and English into 8 canonical labels (sport, politics, economy, health, technology, culture, society, other).
3. **Clustering** — Grouping same-event articles from different sources using TF-IDF embeddings with cosine similarity (Union-Find algorithm).
4. **Bias Reduction** — Stripping charged language, clickbait, and emotional exaggeration from headlines and summaries with deterministic rewrite rules.
5. **Summarization** — Generating one clean, neutral summary per story cluster using extractive NLP, with an optional Groq LLM boost.
6. **Explanation** — Adding "Why It Matters" context through AI-generated analysis of real-world implications.
7. **Delivery** — Serving a personalized, clean daily briefing through a modern web dashboard.

---

## Architecture & Pipeline

```
┌────────────────────────────────────────────────────────────────────┐
│                        SCRAPING SYSTEM                             │
│                                                                    │
│  7+ Source Scrapers ──► Text Cleaning ──► Mojibake Repair          │
│         │                                     │                    │
│         ▼                                     ▼                    │
│  Category Normalization          TF-IDF Vectorization              │
│  (rule-based multilingual)       (token weighting)                 │
│         │                              │                           │
│         ▼                              ▼                           │
│  Standard Categories ◄──── Cosine Similarity Clustering            │
│         │                        (Union-Find)                      │
│         ▼                              │                           │
│  Bias Reduction ◄──────────────────────┘                           │
│  (charged word replacement)                                        │
│         │                                                          │
│         ▼                                                          │
│  Headline Rewriting + Extractive Summarization                     │
│         │                                                          │
│         ▼                                                          │
│  Meta-Story Assembly ──► latest-news.json                          │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                      EMBEDDING MODEL (Python)                      │
│                                                                    │
│  Load latest-news.json ──► Extract unique source categories        │
│         │                                                          │
│         ▼                                                          │
│  GloVe (glove-wiki-gigaword-100) word vectors                      │
│         │                                                          │
│         ▼                                                          │
│  Hybrid Classification:                                            │
│    • Manual overrides for known edge cases                         │
│    • French/Arabic → English token translation                     │
│    • Embedding similarity scoring (max + mean blend)               │
│    • Rule-overlap boosting                                         │
│    • Confidence threshold + gap checks                             │
│         │                                                          │
│         ▼                                                          │
│  Write standardized categories back to latest-news.json            │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                        WEBSITE (Next.js)                           │
│                                                                    │
│  Reads latest-news.json ──► Public Article Feed API                │
│         │                                                          │
│         ├──► Landing Page (pipeline explainer, features)           │
│         ├──► Dashboard (article cards, category filters)           │
│         ├──► AI Summarization (Groq LLM integration)               │
│         ├──► "Why It Matters" analysis per article                 │
│         └──► User Auth (signup, preferences, trusted sources)      │
│                                                                    │
│  Optional: Supabase for persistent storage + user management       │
└────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
news_platform/
├── scraping_system/          # Node.js news scraper & story processor
│   ├── src/
│   │   ├── scrapers/         # Per-source scrapers (APS, TSA, Al Jazeera, etc.)
│   │   ├── lib/
│   │   │   ├── story-processor.js   # TF-IDF clustering, bias reduction, summarization
│   │   │   ├── utils.js             # Date handling, timezone helpers
│   │   │   ├── http.js              # HTTP fetch wrapper
│   │   │   ├── rss.js               # RSS/Atom feed parser
│   │   │   └── scraper.js           # Base scraper utilities
│   │   ├── config/           # Source configuration
│   │   ├── index.js          # Main entry point
│   │   └── process-stories.js # Standalone reprocessor
│   ├── news/                 # Generated output (gitignored)
│   │   ├── latest-news.json      # Processed platform feed
│   │   └── latest-news-raw.json  # Raw scraper output
│   └── package.json
│
├── word_embeding/            # Python embedding model for category classification
│   ├── model.ipynb           # Jupyter notebook (7 steps)
│   └── requirements.txt     # Python dependencies
│
├── website/                  # Next.js web application
│   ├── app/                  # App Router pages & API routes
│   │   ├── api/              # REST endpoints (articles, auth, summarize, etc.)
│   │   ├── dashboard/        # Dashboard, profile, preferences pages
│   │   ├── signin/           # Sign-in page
│   │   ├── signup/           # Multi-step sign-up flow
│   │   └── page.tsx          # Landing page
│   ├── components/           # Reusable UI components
│   ├── context/              # React context providers (Auth, I18n)
│   ├── lib/                  # Utilities (API client, auth, scraper-sync, etc.)
│   └── package.json
│
├── models/                   # Downloaded ML models (gitignored)
├── .gitignore
└── readme.md
```

---

## Prerequisites

| Tool       | Version   | Purpose                              |
| ---------- | --------- | ------------------------------------ |
| **Node.js**   | ≥ 20      | Scraping system + website            |
| **npm**       | ≥ 9       | Package management                   |
| **Python**    | ≥ 3.9     | Embedding model notebook             |
| **pip**       | latest    | Python package management            |

---

## Getting Started

### 1. Scraping System

The scraper collects articles from 7+ news sources, cleans text (including mojibake repair for Arabic), normalizes categories, clusters same-event articles using TF-IDF + cosine similarity, removes bias from headlines, and generates extractive summaries.

```bash
cd scraping_system
npm install
npm run scrape
```

This produces two files in `scraping_system/news/`:
- **`latest-news.json`** — Processed feed with clustered stories, neutral headlines, and summaries
- **`latest-news-raw.json`** — Raw scraper output before processing

#### Reprocess without re-scraping

```bash
npm run process -- --input news/latest-news-raw.json --output news/latest-news.json
```

#### Add a generic news site

```bash
node src/index.js --site-url https://example-news-site.com --hours 24
```

The generic scraper uses RSS discovery, sitemap parsing, and homepage card detection — no LLM required.

---

### 2. Embedding Model

The Jupyter notebook uses **GloVe word embeddings** (via gensim) to classify the 45+ multilingual source categories into 8 standardized English labels. It uses a hybrid approach combining:
- Manual overrides for known edge cases
- French-to-English and Arabic-to-English token translation
- Embedding similarity scoring (60% best-hit + 40% mean blend)
- Rule-overlap boosting and confidence thresholds

#### Install Python dependencies

```bash
cd word_embeding
pip install -r requirements.txt
```

#### Run the notebook

```bash
jupyter notebook model.ipynb
```

Run all cells in order. On first run, the notebook will download the `glove-wiki-gigaword-100` model (~128 MB) and cache it in the `models/` directory at the project root for future reuse.

> **Note:** This step is optional if the scraping system's built-in rule-based classifier already produces acceptable category mappings. The notebook is primarily for experimentation and validation.

---

### 3. Website

The website reads the scraped JSON feed and serves it through a Next.js dashboard with authentication, personalized category filtering, and AI-powered features.

```bash
cd website
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

The website works in two modes:
- **Local mode** (default) — Reads directly from `scraping_system/news/latest-news.json`, uses file-based auth
- **Supabase mode** — Connect to a Supabase instance for persistent article storage and user management

---

## Environment Variables

Create a `.env.local` file inside the `website/` directory:

```env
# ── Required ──
JWT_SECRET=your-secret-key-here

# ── Optional: AI Features (Groq) ──
GROQ_API_KEY=your-groq-api-key

# ── Optional: Supabase (for persistent storage) ──
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ── Optional: Scraper paths (auto-detected by default) ──
SCRAPER_SYSTEM_PATH=../scraping_system
SCRAPER_OUTPUT_PATH=../scraping_system/news/latest-news.json
```

| Variable                | Required | Description                                              |
| ----------------------- | -------- | -------------------------------------------------------- |
| `JWT_SECRET`            | Yes      | Secret key for session token signing                     |
| `GROQ_API_KEY`          | No       | Enables AI summaries, digests, and "Why It Matters"      |
| `NEXT_PUBLIC_SUPABASE_URL` | No    | Supabase project URL for persistent storage              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key                               |
| `SCRAPER_SYSTEM_PATH`   | No       | Override scraper project location (auto-detected)        |
| `SCRAPER_OUTPUT_PATH`   | No       | Override JSON feed path (auto-detected)                  |

---

## Technologies

### Scraping System (Node.js)
| Technology       | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| **Cheerio**      | HTML parsing and DOM traversal for web scraping         |
| **fast-xml-parser** | RSS/Atom feed parsing                               |
| **TF-IDF**       | Custom implementation for article vectorization        |
| **Union-Find**   | Efficient article clustering by cosine similarity      |

### Embedding Model (Python)
| Technology       | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| **Gensim**       | Word vector model loading (GloVe)                      |
| **NumPy**        | Numerical operations for similarity scoring            |
| **Jupyter**      | Interactive notebook environment                       |

### Website (Next.js)
| Technology       | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| **Next.js 16**   | React framework with App Router                        |
| **React 19**     | UI component library                                   |
| **Tailwind CSS 4** | Utility-first styling                                |
| **Radix UI**     | Accessible headless UI primitives                      |
| **Supabase**     | Optional database and auth backend                     |
| **Groq API**     | LLM-powered summaries (Llama 4 Scout)                  |
| **Jose**         | JWT token creation and verification                    |
| **Zod**          | Runtime schema validation                              |
| **Lucide React** | Icon library                                           |
