# Algeria News Scraper

This project collects recent news from APS, TSA, Ennahar, Elhayat, Aljazeera, Elheddaf, and WinWin.
It outputs a single normalized JSON file that your website or API can consume directly.
---

# How To Run

### 1) Install dependencies
```bash
npm install
```

### 2) Run with default options
```bash
npm run scrape
```

### 3) Run with custom window and output
```bash
node src/index.js --hours 24 --output data/news/latest-news.json
```

## Where To Find The News JSON

After running, the generated news file is saved in data/news/latest-news.json.
This is the news JSON file you should use in your system.

---

## Folder Roles

### scraping_system/
Project root that contains source code, config, and generated data.
Run installation and scraping commands from this folder.

### data/
Storage folder for generated scraper output files.
Keeps runtime artifacts separated from source code.

### data/news/
Holds the latest generated news JSON files.
Default output file is created here after each run.

### src/
Contains all executable scraping logic.
Entry point, helpers, config, and per-source scrapers live here.

### src/config/
Stores shared constants such as feed URLs and default settings.
Keeps site endpoints centralized for easy updates.

### src/lib/
Provides reusable utilities used by all scrapers.
Includes HTTP fetch logic, RSS parsing, and generic scraper helpers.

### src/scrapers/
Contains one scraper module per news source.
Each file discovers, parses, and normalizes articles for one website.

## File Usage (2 lines each)

### aps-archive-debug.html
Local debug snapshot used to inspect APS archive payload format.
Helpful when APS page structure changes and parsing needs fixes.

### package.json
Defines project metadata, dependencies, and npm scripts.
Use it to install packages and run the scraper command.

### README.md
Explains project structure, commands, and output location.
Use this file as the quick start and maintenance reference.

### src/index.js
Main entry point that runs all source scrapers.
Combines results, removes duplicates, and writes final JSON output.

### src/config/sites.js
Contains all source URLs, user-agent string, and default output path.
Keeps scraper configuration in one simple file.

### src/lib/http.js
Wraps fetch with default headers and error handling.
Ensures all network requests behave consistently.

### src/lib/utils.js
Contains shared text, date, URL, args, and file-write helpers.
Used by all scrapers to keep normalization logic consistent.

### src/lib/rss.js
Provides shared RSS/XML page fetch and item parsing logic.
Removes duplicate RSS handling code from multiple scrapers.

### src/lib/scraper.js
Provides shared scraper helpers like error formatting and chunking.
Also includes common recent-window or fallback article selection.

### src/scrapers/aps.js
Scrapes APS archive sections and subsection pages.
Extracts article payloads, normalizes fields, and returns APS items.

### src/scrapers/tsa.js
Scrapes TSA using its public RSS feed pages.
Enriches items with metadata from article pages when available.

### src/scrapers/ennahar.js
Scrapes Ennahar from paged RSS entries.
Keeps recent-window items and falls back to latest when needed.

### src/scrapers/elhayat.js
Scrapes Elhayat from paged RSS entries.
Normalizes title, date, category, image, and cleaned description.

### src/scrapers/aljazeera.js
Discovers Aljazeera article URLs from public section pages.
Parses article metadata and publication dates from page content.

### src/scrapers/elheddaf.js
Discovers Elheddaf links from known category pages.
Fetches article details and parses publication date formats.

### src/scrapers/winwin.js
Scrapes WinWin using Google News sitemap with RSS fallback.
Enriches item details from article pages and normalizes category names.
