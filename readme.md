# News Platform - Run Guide

This project has 3 main parts that should be run in order:

1. Run the scraping system
2. Run the model
3. Run the website

## 1) Run The Scraping System

From the project root:

```powershell
cd scraping_system
npm install
npm run scrape
```

This updates the news JSON data used by the model and website.

To try the new generic fallback scraper for an arbitrary news site:

```powershell
cd scraping_system
node src/index.js --site-url https://example-news-site.com --hours 24
```

That keeps the built-in source scrapers and adds one generic scraper run for the URL you pass. The generic scraper uses RSS, sitemap discovery, homepage repeated-card detection, and article metadata extraction without using any LLM.

## 2) Run The Model

From the project root:

```powershell
cd word_embeding
jupyter notebook model.ipynb
```

Then run the notebook cells in order to standardize categories and update the data.

## 3) Run The Website

From the project root:

```powershell
cd website
npm install
npm run dev
```

Open the local URL shown in the terminal (usually http://localhost:3000