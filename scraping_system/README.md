# Scraping System

A modular Node.js scraper that collects news articles from Algerian and international news sources, clusters same-event stories, rewrites headlines for neutrality, and outputs a structured JSON payload.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [Architecture](#architecture)
- [Sources](#sources)
- [Output Format](#output-format)
- [Story Processing Pipeline](#story-processing-pipeline)
- [Adding a New Scraper](#adding-a-new-scraper)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Development](#development)

---

## Overview

The scraping system fetches articles from eight news sources, deduplicates them, and feeds them through a story-processing pipeline that:

1. Cleans and normalises article text (HTML stripping, mojibake repair, entity decoding)
2. Classifies articles into standard categories (politics, economy, sport, etc.)
3. Clusters articles that cover the same event using TF-IDF cosine similarity + Jaccard title overlap
4. Selects a representative article per cluster and rewrites the headline for neutrality
5. Generates an extractive summary from the cluster's combined text
6. Emits a JSON payload containing deduplicated stories, each with source attribution

---

## Quick Start

```bash
# Install dependencies
npm install

# Run with default settings (24-hour window, all sources)
node src/index.js

# Save output to a file
node src/index.js --output news/today.json

# Fetch the last 48 hours
node src/index.js --hours 48

# Scrape a custom site (uses the generic scraper)
node src/index.js --url https://example-news-site.com

# Skip story processing (raw articles only)
node src/index.js --no-process
```

---

## CLI Usage

```
node src/index.js [options]

Options:
  --hours <n>          Time window in hours (default: 24)
  --output <path>      Output file path (default: news/latest-news.json)
  --raw-output <path>  Path for the raw (pre-processed) JSON output
  --url <url>          Scrape a custom URL with the generic scraper
  --no-process         Skip the story-processing pipeline; emit raw articles
```

When `--no-process` is NOT set, two files are written:

| File | Content |
|---|---|
| `<output>` | Processed stories (clustered, deduplicated, neutralised) |
| `<output>-raw.json` | Raw articles before processing |

A run summary is printed to **stderr** after each run, showing per-source article counts, error counts, and timing.

---

## Architecture

```
src/
├── index.js                  Entry point — orchestrates scrapers and pipeline
├── process-stories.js        Standalone story processor (reads JSON from stdin)
├── config/
│   └── sites.js              Feed URLs, base URLs, constants
├── lib/
│   ├── cache.js              In-memory LRU cache for HTTP responses
│   ├── http.js               fetchText() with timeout and retry logic
│   ├── rss.js                RSS 2.0 and Atom feed parsing
│   ├── scraper.js            Shared scraper utilities (chunking, fallback selection)
│   └── utils.js              Text utilities (HTML stripping, entity decoding, date helpers)
└── scrapers/
    ├── aljazeera.js          Al Jazeera Arabic (RSS)
    ├── aps.js                APS — Algérie Presse Service (HTML archive)
    ├── echorouk.js           Echorouk Online — الشروق (RSS + page enrichment)
    ├── elhayat.js            El Hayat (RSS)
    ├── elheddaf.js           El Heddaf — sport (category page scraping)
    ├── ennahar.js            Ennahar Online (RSS)
    ├── generic.js            Generic scraper (feed/sitemap/HTML discovery)
    ├── tsa.js                TSA Algérie (RSS + page enrichment)
    └── winwin.js             Winwin — sport (RSS + Google News)
```

### Data flow

```
[Source websites]
       │
       ▼
[Scraper modules]  ──── fetchText() ────► [LRU cache]
       │
       ▼
[Raw articles array]
       │
       ├── dedupeArticles()    (URL + title key deduplication)
       │
       ▼
[processNewsPayload()]
       │
       ├── prepareArticles()   (clean, normalise, classify)
       ├── buildWeightedVectors()  (TF-IDF)
       ├── clusterArticles()   (Union-Find + cosine/Jaccard similarity)
       ├── buildStory()        (headline rewrite, summary extraction)
       └── buildMetaStory()    (source attribution, confidence scoring)
       │
       ▼
[Processed JSON output]
```

---

## Sources

| ID | Name | Language | Method |
|---|---|---|---|
| `APS` | Algérie Presse Service | FR | HTML archive scraping |
| `TSA` | TSA Algérie | FR | RSS + page enrichment |
| `ENNAHAR` | Ennahar Online | AR | RSS |
| `ECHOROUK` | Echorouk Online | AR | RSS + page enrichment |
| `ELHAYAT` | El Hayat | AR | RSS |
| `ALJAZEERA` | Al Jazeera Arabic | AR | RSS |
| `ELHEDDAF` | El Heddaf | AR | Category page scraping |
| `WINWIN` | Winwin | FR/AR | RSS + Google News XML |

---

## Output Format

The top-level output JSON has this shape:

```jsonc
{
  "scraped_at": "2026-05-14T10:00:00.000Z",
  "processed_at": "2026-05-14T10:00:45.123Z",
  "window_hours": 24,
  "raw_article_count": 312,
  "total_articles": 187,
  "story_count": 187,
  "sources": {
    "TSA": 45,
    "ENNAHAR": 60,
    "ECHOROUK": 55
    // ...
  },
  "categories": [
    "culture", "economy", "health", "other",
    "politics", "society", "sport", "technology"
  ],
  "notes": ["..."],
  "errors": [
    { "source": "APS", "url": "https://...", "message": "Request failed (503)" }
  ],
  "articles": [ /* Story objects — see below */ ],
  "clusters": [ /* MetaStory objects — see below */ ]
}
```

### Story object

```jsonc
{
  "source": "TSA",
  "url": "https://www.tsa-algerie.dz/...",
  "title": "Neutralised headline (bias-reduced)",
  "original_title": "Original headline from source",
  "description": "Extractive summary from cluster articles",
  "content": "Same as description",
  "summary": "Same as description",
  "bias_reduced_summary": "Same as description",
  "neutral_headline": "Same as title",
  "image_url": "https://...",
  "publication_date": "2026-05-14T08:30:00.000Z",
  "category": "politics",
  "categories": ["politics"],
  "original_categories": ["Actualité nationale", "Politique"],
  "cluster_id": "story_0042",
  "story_id": "story_0042",
  "cluster_type": "same_event",   // "unique" | "same_event" | "exact_duplicate"
  "cluster_size": 3,
  "source_count": 2,
  "sources": [
    {
      "source": "TSA",
      "title": "...",
      "url": "https://...",
      "published_at": "2026-05-14T08:30:00.000Z",
      "category": "politics"
    }
  ],
  "meta_story": { /* MetaStory — see below */ },
  "meta_story_text": "headline - summary"
}
```

### MetaStory object

```jsonc
{
  "story_id": "story_0042",
  "headline": "Neutralised headline",
  "summary": "Extractive summary",
  "category": "politics",
  "categories": ["politics"],
  "article_count": 3,
  "source_count": 2,
  "sources": ["TSA", "ENNAHAR"],
  "first_published_at": "2026-05-14T06:00:00.000Z",
  "latest_published_at": "2026-05-14T09:15:00.000Z",
  "confidence": "multi_source_cluster",  // or "single_source_story"
  "average_similarity": 0.7842
}
```

---

## Story Processing Pipeline

### 1. Text cleaning (`cleanText`)

Each article's `title`, `description`, and `content` fields go through:

1. **Mojibake repair** — detects mis-decoded UTF-8 (common in Arabic RSS feeds encoded as Latin-1) and converts with `Buffer.from(value, "latin1").toString("utf8")` when the repaired version scores higher on an Arabic/Latin character heuristic.
2. **HTML stripping** — removes all tags, converts `<br>` and `</p>` to spaces.
3. **Entity decoding** — converts `&amp;`, `&nbsp;`, `&#8217;`, `&mdash;`, and 20+ others to their Unicode equivalents.
4. **Feed boilerplate removal** — strips "The post … appeared first on …" footers in English and Arabic.
5. **Whitespace normalisation** — collapses runs of whitespace to a single space.

### 2. Category classification

Each article is classified into one of eight standard categories:

| Category | Example matching terms |
|---|---|
| `sport` | football, league, match, رياضة, كرة |
| `politics` | election, gouvernement, سياسة, انتخاب |
| `economy` | market, finance, اقتصاد, تجارة |
| `health` | hospital, santé, صحة, بيئة |
| `technology` | digital, cyber, تكنولوجيا, ذكاء |
| `culture` | cinema, arts, ثقافة, فن |
| `society` | education, national, الجزائر, مجتمع |
| `other` | (fallback) |

The classifier scores each rule's terms against a normalised (NFKD, lowercase, diacritic-stripped) concatenation of the article's category field, title, description, content, and source name. Multi-word terms score 2 points; single-word terms score 1.

### 3. Clustering

Articles are grouped by Union-Find. Two articles are merged into the same cluster when:

- They share the same normalised URL, OR
- They share the same normalised title, OR
- Their combined similarity score exceeds a threshold:
  - `combinedScore ≥ 0.68`, where `combinedScore = cosine * 0.75 + jaccard * 0.25`
  - OR `combinedScore ≥ 0.58` AND `titleJaccard ≥ 0.45`
  - OR `cosine ≥ 0.74` AND `titleJaccard ≥ 0.25`

Only articles in the same primary category are compared for similarity (to limit O(n²) comparisons to same-topic groups).

### 4. Headline selection and bias reduction

For each cluster, all candidate titles are run through `reduceBias()`, which:
- Strips clickbait prefixes (`BREAKING:`, `URGENT —`, `EXCLUSIVE:`)
- Replaces emotionally charged verbs (`slams` → `criticizes`, `reveals` → `reports`)
- Removes sensationalist adjectives (`shocking`, `stunning`, `explosive`, etc.)
- Applies the same replacements in French and Arabic

The best candidate is selected by preferring headlines in the 35–140 character range, then by length (longer preferred as more informative).

### 5. Summary generation

An extractive summary is built from sentences across all articles in the cluster:

1. Split all `description` and `content` fields into sentences (split on `.`, `!`, `?`, `؟`, `؛`)
2. Filter sentences shorter than 30 characters
3. Score each sentence by the sum of its token frequencies (TF across the cluster), normalised by `√(token_count + 4)`
4. Penalise sentences appearing later in the corpus by `order × 0.01`
5. Select up to 3 sentences staying under 720 total characters

---

## Adding a New Scraper

1. **Create** `src/scrapers/<name>.js` and export a `scrape<Name>({ hours })` function that returns:

```js
{
  source: "NAME",          // uppercase string identifier
  articles: [...],         // see article shape below
  errors: [...],           // { source, url, message }
  notes: [...]             // string[]
}
```

Each article in the array should have:

```js
{
  source: "NAME",
  url: "https://...",
  title: "...",
  description: "..." | null,
  image_url: "..." | null,
  publication_date: "2026-05-14T08:00:00.000Z" | null,  // ISO 8601
  category: "politics" | null,
  dedupe_key: "..."        // use createArticleKey(article) from lib/utils.js
}
```

2. **Add** your feed URL (if any) to `src/config/sites.js`.

3. **Register** the scraper in `src/index.js`:

```js
import { scrapeMySource } from "./scrapers/mysource.js";

const SCRAPERS = [
  // ...existing scrapers...
  { source: "MYSOURCE", run: scrapeMySource }
];
```

4. **Test** with:

```bash
node src/index.js --hours 24 --output /tmp/test.json 2>&1 | grep MYSOURCE
```

### Scraper best practices

- Use `fetchText()` from `lib/http.js` — it includes a 30-second timeout and automatic retry on 5xx/429/timeout errors.
- Use `withinHours(publication_date, hours)` from `lib/utils.js` to filter articles to the requested window.
- Always return a fallback (latest N articles) when no articles fall in the time window.
- Use `createArticleKey(article)` for the `dedupe_key` — it normalises on URL first, then falls back to `source::title::date`.
- Wrap individual article fetches in try/catch and push to `errors` — never let one bad article abort the entire run.
- Use batched `Promise.all()` (3–6 concurrently) when enriching articles from their pages to avoid hammering the server.

---

## Configuration

All configurable constants live in `src/config/sites.js`:

| Export | Value | Used by |
|---|---|---|
| `APS_ARCHIVE_URL` | `https://www.aps.dz/fr/archive` | `aps.js` |
| `APS_BASE_URL` | `https://www.aps.dz` | `aps.js` |
| `TSA_FEED_URL` | `https://www.tsa-algerie.dz/feed/` | `tsa.js` |
| `ENNAHAR_FEED_URL` | `https://www.ennaharonline.com/feed/` | `ennahar.js` |
| `ECHOROUK_FEED_URL` | `https://www.echoroukonline.com/feed/` | `echorouk.js` |
| `ELHAYAT_FEED_URL` | `https://elhayat.dz/feed/` | `elhayat.js` |
| `WINWIN_FEED_URL` | `https://www.winwin.com/feed` | `winwin.js` |
| `WINWIN_GOOGLE_NEWS_URL` | `https://www.winwin.com/google-news.xml` | `winwin.js` |
| `ALGERIA_TIMEZONE` | `Africa/Algiers` | Various |
| `OUTPUT_DEFAULT_PATH` | `news/latest-news.json` | `index.js` |
| `USER_AGENT` | Chrome 135 UA string | `http.js` |

---

## Error Handling

Errors are collected, not thrown. Each scraper returns `errors: []` containing objects with `{ source, url, message }`. The top-level runner catches scraper-level panics and adds a single error entry.

The final JSON payload includes the full `errors` array so downstream consumers can inspect failures without re-running.

The run summary printed to stderr also lists the first 10 errors with their source and URL.

---

## Development

```bash
# Install dependencies
npm install

# Run the scraper
node src/index.js --hours 6 --output /tmp/out.json

# Run just the story processor on existing raw JSON
cat /tmp/out-raw.json | node src/process-stories.js > /tmp/processed.json

# Lint
npm run lint

# Run tests (if configured)
npm test
```

### Dependencies

| Package | Purpose |
|---|---|
| `cheerio` | Server-side HTML parsing and querying |
| `fast-xml-parser` | Fast XML/RSS/Atom parsing without DOM overhead |
