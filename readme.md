# News Platform - Run Guide

This project has 3 main parts:

1. Run the scraping and story processing system
2. Run the website
3. Optionally inspect the notebook model experiments

## 1) Run The Scraping System

From the project root:

```powershell
cd scraping_system
npm install
npm run scrape
```

This updates the news JSON data used by the model and website.
The scraper now automatically:

- normalizes categories
- handles multi-category articles
- clusters same-event articles
- generates one neutral headline and summary per story
- reduces loaded/clickbait language with deterministic rewrite rules
- builds a meta-story object with sources, dates, category, and cluster metadata

The processed platform feed is written to:

```text
scraping_system/news/latest-news.json
```

The raw scraper feed is kept next to it as:

```text
scraping_system/news/latest-news-raw.json
```

To reprocess an existing raw feed without scraping again:

```powershell
cd scraping_system
npm run process -- --input news/latest-news-raw.json --output news/latest-news.json
```

To try the new generic fallback scraper for an arbitrary news site:

```powershell
cd scraping_system
node src/index.js --site-url https://example-news-site.com --hours 24
```

That keeps the built-in source scrapers and adds one generic scraper run for the URL you pass. The generic scraper uses RSS, sitemap discovery, homepage repeated-card detection, and article metadata extraction without using any LLM.

## 2) Run The Website

From the project root:

```powershell
cd website
npm install
npm run dev
```

Open the local URL shown in the terminal (usually http://localhost:3000).

## 3) Optional: Run The Notebook Model

From the project root:

```powershell
cd word_embeding
jupyter notebook model.ipynb
```

Then run the notebook cells in order to inspect the earlier embedding/category experiments.
