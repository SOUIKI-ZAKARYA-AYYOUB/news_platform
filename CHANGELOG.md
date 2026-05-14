# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **Echorouk scraper** (`scraping_system/src/scrapers/echorouk.js`) — full scraper for
  Echorouk Online (الشروق أونلاين), one of Algeria's most-read Arabic newspapers. Fetches
  up to 6 RSS pages, extracts the highest-resolution image via `srcset`, strips Arabic/French
  boilerplate footers, and enriches articles missing images by visiting their article pages
  in batches of 5.
- **LRU cache module** (`scraping_system/src/lib/cache.js`) — in-memory cache with
  configurable max-entries and TTL, backed by a `Map` for O(1) access and natural
  insertion-order eviction. A shared `runCache` instance is exported so all scrapers in a
  process share one cache without coupling.
- **`cachedFetch` wrapper** in `cache.js` — wraps any `fetchFn` with transparent caching;
  accepts an optional custom cache instance for testing.
- **Atom feed support** in `rss.js` — `parseRssItems()` now detects `<feed><entry>` Atom
  documents and normalises entries to the same shape as RSS items, including `link[@href]`
  and `summary` extraction.
- **Per-scraper timing** in `index.js` — each `runScraper()` call records wall-clock
  duration and surfaces it in the run summary table.
- **Run summary table** printed to stderr after each run, showing per-source article count,
  error count, and duration, plus error details and cache stats.
- `ECHOROUK_FEED_URL` constant exported from `src/config/sites.js`.

### Fixed
- **Elheddaf batch skip bug** — the article-fetch loop used `index += 8` but sliced
  `entries.slice(index, index + 3)`, silently skipping ~62 % of discovered article URLs.
  Loop step is now `BATCH_SIZE = 3`.
- **Elheddaf date sort** — `publication_date.localeCompare()` replaced with
  `new Date(...).getTime()` comparison to handle non-ISO date strings correctly.
- **`decodeHtmlEntities` coverage** — added 13 missing HTML entities: `&lt;`, `&gt;`,
  `&apos;`, `&#8216;` (left single quote), `&#8212;` (em dash), `&ndash;`, `&mdash;`,
  `&lsquo;`, `&rsquo;`, `&ldquo;`, `&rdquo;`, `&#8230;` (ellipsis). Fixed `&#8211;`
  mapping from plain ASCII hyphen `-` to proper en-dash `–`.
- **`chunk()` guard** — `chunk(items, 0)` now throws `RangeError` instead of entering an
  infinite loop.
- **`pickRecentOrFallback` date sort** — replaced `localeCompare` with a numeric timestamp
  comparator via a `toTimestamp()` helper that guards against invalid dates.
- **Headline sort tiebreaker** in `rewriteHeadline()` — previously preferred *shorter*
  headlines when scores tied (`leftLength - rightLength`). Flipped to `rightLength -
  leftLength` so more informative (longer) headlines win.
- **HTTP retry logic** — `fetchText()` now retries up to 2 times on `429`, `500`, `502`,
  `503`, `504`, and timeout (`AbortError`) with linear backoff (1 s, 2 s). Non-retryable
  errors (e.g. `404`, network DNS failures) propagate immediately.
- **`apiJson<T>()` helper** added to `website/lib/api.ts` — wraps `apiFetch`, asserts
  `response.ok`, and throws a descriptive error containing the status code and response
  body. Eliminates boilerplate at every call site.

---

## [0.5.0] — 2026-04-30

### Added
- **Self-hosted PostgreSQL** via the `pg` driver — replaced Supabase client with direct
  `pg.Pool` connections in `website/lib/db.ts`. Connection parameters are read from
  environment variables (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`).
- All API route handlers updated to use `db.query()` instead of `supabase.from()`.
- `BIGSERIAL` primary key coercion — PostgreSQL returns `BIGSERIAL` IDs as strings;
  API responses and Zod schemas now cast them to `number` with `Number(id)`.
- Sign-up step 4 now shows all standard categories regardless of whether any articles
  have been indexed yet, so new installs don't show an empty category picker.

### Changed
- `website/lib/supabase.ts` retained for reference but no longer used in production code.

---

## [0.4.0] — 2026-04-15

### Added
- 30-second `AbortController` timeout on every `fetchText()` call to prevent scraper
  processes hanging indefinitely on slow servers.
- `withinHours()` now accepts an optional `now` parameter for deterministic unit testing.
- `isSameDayInTimeZone()` and `isTodayInTimeZone()` helpers in `utils.js`.
- `writeJsonFile()` helper creates intermediate directories automatically.

### Fixed
- APS archive scraper no longer crashes when the archive page returns a non-200 status
  for individual article URLs — errors are collected and the run continues.
- Winwin Google News XML occasionally returns an empty `<channel>` — `parseRssItems()`
  now returns `[]` in that case instead of throwing.

---

## [0.3.0] — 2026-03-20

### Added
- **Story processor** (`lib/story-processor.js`) — clusters same-event articles using
  TF-IDF vectors and cosine similarity, rewrites headlines for neutrality, and generates
  extractive summaries.
- `reduceBias()` exported as a standalone function for use by downstream consumers.
- `processNewsPayload()` exported for use by `process-stories.js`.
- Standard category list (`STANDARD_CATEGORIES`) exported.
- `cluster_type` field on each story: `"unique"`, `"same_event"`, or `"exact_duplicate"`
  based on cluster size and average cosine similarity.
- `confidence` field on each meta story: `"single_source_story"` or
  `"multi_source_cluster"`.
- `process-stories.js` standalone entry point reads raw JSON from stdin or a file path
  and writes processed JSON to stdout.

### Changed
- `index.js` now runs the story processor by default; pass `--no-process` to skip.

---

## [0.2.0] — 2026-03-01

### Added
- **Elheddaf scraper** — discovers article links from 10 category pages and enriches
  each article by visiting its page.
- **Winwin scraper** — fetches from the main RSS feed and the Google News XML sitemap,
  merges results, and deduplicates by URL.
- **Al Jazeera scraper** — fetches from Al Jazeera's Arabic RSS feeds across multiple
  topic categories.
- **Generic scraper** — auto-discovers articles from any site via RSS autodiscovery,
  XML sitemap parsing, or homepage structure analysis.
- `hostnameToSourceName()` — converts a URL to an uppercase source identifier.
- `resolveUrl()` — safely resolves relative URLs against a base.
- `normalizeCategory()` — trims and validates category strings.
- `createArticleKey()` — stable deduplication key based on URL or `source::title::date`.

### Fixed
- El Hayat feed occasionally returns items without a `<pubDate>` — `toIsoString()` now
  returns `null` instead of `"Invalid Date"`.

---

## [0.1.0] — 2026-02-10

### Added
- Initial project structure with `src/index.js` entry point.
- **APS scraper** — scrapes the Algérie Presse Service French-language archive page.
- **TSA scraper** — fetches from TSA Algérie RSS with page-level enrichment for images.
- **Ennahar scraper** — fetches from Ennahar Online RSS (Arabic).
- **El Hayat scraper** — fetches from El Hayat RSS (Arabic).
- `fetchText()` with configurable `User-Agent` and `Accept-Language` headers.
- `stripHtml()`, `decodeHtmlEntities()`, `toIsoString()`, `withinHours()`.
- `parseArgs()` — parses `--hours`, `--output`, `--url`, `--no-process`, `--raw-output`.
- `writeJsonFile()` — writes JSON with trailing newline and creates parent directories.
- `parseRssItems()` — parses RSS 2.0 channel items using `fast-xml-parser`.
- `dedupeArticles()` in `index.js` — deduplicates across sources using URL or
  `source::title::date` key.
- Default output path `news/latest-news.json`.
