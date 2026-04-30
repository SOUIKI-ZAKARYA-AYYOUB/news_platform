import { OUTPUT_DEFAULT_PATH } from "./config/sites.js";
import { createScrapeError } from "./lib/scraper.js";
import { processNewsPayload } from "./lib/story-processor.js";
import { createArticleKey, parseArgs, writeJsonFile } from "./lib/utils.js";
import { scrapeAps } from "./scrapers/aps.js";
import { scrapeAljazeera } from "./scrapers/aljazeera.js";
import { scrapeElhayat } from "./scrapers/elhayat.js";
import { scrapeElheddaf } from "./scrapers/elheddaf.js";
import { scrapeEnnahar } from "./scrapers/ennahar.js";
import { scrapeGenericSite } from "./scrapers/generic.js";
import { scrapeTsa } from "./scrapers/tsa.js";
import { scrapeWinwin } from "./scrapers/winwin.js";

const SCRAPERS = [
  { source: "APS", run: scrapeAps },
  { source: "TSA", run: scrapeTsa },
  { source: "ENNAHAR", run: scrapeEnnahar },
  { source: "ELHAYAT", run: scrapeElhayat },
  { source: "ALJAZEERA", run: scrapeAljazeera },
  { source: "ELHEDDAF", run: scrapeElheddaf },
  { source: "WINWIN", run: scrapeWinwin }
];

function dedupeArticles(articles) {
  const seen = new Set();
  const deduped = [];

  for (const article of articles) {
    if (!article) {
      continue;
    }

    const dedupeKey = article.dedupe_key ?? createArticleKey(article);

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    deduped.push(article);
  }

  return deduped.map(({ dedupe_key, ...article }) => article);
}

async function runScraper(scraper, hours) {
  try {
    return await scraper.run({ hours });
  } catch (error) {
    return {
      source: scraper.source,
      articles: [],
      errors: [createScrapeError(scraper.source, null, error)],
      notes: [`${scraper.source} scraper failed and was skipped.`]
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scrapedAt = new Date().toISOString();
  const outputPath = args.output ?? OUTPUT_DEFAULT_PATH;
  const configuredScrapers = [...SCRAPERS];

  if (args.siteUrl) {
    configuredScrapers.push({
      source: "GENERIC",
      run: ({ hours }) => scrapeGenericSite({ siteUrl: args.siteUrl, hours })
    });
  }

  const scrapeResults = await Promise.all(
    configuredScrapers.map((scraper) => runScraper(scraper, args.hours))
  );

  const articles = dedupeArticles(
    scrapeResults
      .flatMap((result) => result.articles)
      .sort((left, right) =>
        (right.publication_date ?? "").localeCompare(left.publication_date ?? "")
      )
  );

  const sources = Object.fromEntries(
    scrapeResults.map((result) => [result.source, result.articles.length])
  );

  const rawPayload = {
    scraped_at: scrapedAt,
    window_hours: args.hours,
    total_articles: articles.length,
    sources,
    notes: scrapeResults.flatMap((result) => result.notes),
    errors: scrapeResults.flatMap((result) => result.errors),
    articles
  };

  const payload = args.processStories
    ? processNewsPayload(rawPayload, { scrapedAt })
    : rawPayload;

  if (args.processStories) {
    const rawOutputPath =
      args.rawOutput ??
      (outputPath.endsWith(".json")
        ? outputPath.replace(/\.json$/i, "-raw.json")
        : `${outputPath}-raw.json`);

    await writeJsonFile(rawOutputPath, rawPayload);
  }

  const writtenPath = await writeJsonFile(outputPath, payload);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.stderr.write(`Saved output to ${writtenPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
