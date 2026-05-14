import { OUTPUT_DEFAULT_PATH } from "./config/sites.js";
import { getRunCache } from "./lib/cache.js";
import { createScrapeError } from "./lib/scraper.js";
import { processNewsPayload } from "./lib/story-processor.js";
import { createArticleKey, parseArgs, writeJsonFile } from "./lib/utils.js";
import { scrapeAps } from "./scrapers/aps.js";
import { scrapeAljazeera } from "./scrapers/aljazeera.js";
import { scrapeEchorouk } from "./scrapers/echorouk.js";
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
  { source: "ECHOROUK", run: scrapeEchorouk },
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
  const startMs = Date.now();

  try {
    const result = await scraper.run({ hours });
    return { ...result, durationMs: Date.now() - startMs };
  } catch (error) {
    return {
      source: scraper.source,
      articles: [],
      errors: [createScrapeError(scraper.source, null, error)],
      notes: [`${scraper.source} scraper failed and was skipped.`],
      durationMs: Date.now() - startMs
    };
  }
}

function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function printRunSummary(scrapeResults, totalArticles, storyCount, totalMs) {
  const lines = [
    "",
    "=== Scrape run summary ===",
    `  Window   : ${scrapeResults[0]?.window_hours ?? "?"} hours`,
    `  Duration : ${formatDuration(totalMs)}`,
    `  Articles : ${totalArticles} raw → ${storyCount} stories`,
    "",
    "  Source          Articles  Errors  Time",
    "  " + "-".repeat(44)
  ];

  for (const result of scrapeResults) {
    const src = result.source.padEnd(16);
    const arts = String(result.articles.length).padStart(8);
    const errs = String(result.errors.length).padStart(7);
    const dur = formatDuration(result.durationMs ?? 0).padStart(6);
    lines.push(`  ${src}${arts}  ${errs}  ${dur}`);
  }

  const allErrors = scrapeResults.flatMap((result) => result.errors);
  if (allErrors.length > 0) {
    lines.push("", `  ${allErrors.length} error(s):`);
    for (const error of allErrors.slice(0, 10)) {
      const url = error.url ? ` (${error.url})` : "";
      lines.push(`    [${error.source}]${url} ${error.message}`);
    }
    if (allErrors.length > 10) {
      lines.push(`    … and ${allErrors.length - 10} more`);
    }
  }

  lines.push("", `  Cache : ${getRunCache().stats().size} entries cached`);
  lines.push("=".repeat(27), "");

  process.stderr.write(lines.join("\n") + "\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scrapedAt = new Date().toISOString();
  const outputPath = args.output ?? OUTPUT_DEFAULT_PATH;
  const configuredScrapers = [...SCRAPERS];
  const runStartMs = Date.now();

  if (args.siteUrl) {
    configuredScrapers.push({
      source: "GENERIC",
      run: ({ hours }) => scrapeGenericSite({ siteUrl: args.siteUrl, hours })
    });
  }

  process.stderr.write(
    `[scraper] Starting run: ${configuredScrapers.length} sources, window=${args.hours}h\n`
  );

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
  const storyCount = payload.story_count ?? payload.total_articles ?? 0;

  printRunSummary(
    scrapeResults.map((r) => ({ ...r, window_hours: args.hours })),
    articles.length,
    storyCount,
    Date.now() - runStartMs
  );

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.stderr.write(`[scraper] Saved output to ${writtenPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
