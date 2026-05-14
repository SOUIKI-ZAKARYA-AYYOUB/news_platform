import { withinHours } from "./utils.js";

/**
 * Creates a normalised scrape error object.
 *
 * Extracts `error.message` from Error instances; converts anything else to a string.
 * These objects are collected into the `errors` array of each scraper's return value.
 *
 * @param {string} source - Uppercase source identifier (e.g. "TSA").
 * @param {string|null} url - The URL that caused the error, or null for run-level errors.
 * @param {Error|unknown} error - The thrown value.
 * @returns {{ source: string, url: string|null, message: string }}
 */
export function createScrapeError(source, url, error) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    source,
    url,
    message
  };
}

/**
 * Splits an array into chunks of at most `size` elements.
 *
 * The last chunk may be smaller than `size` if the array length is not a
 * multiple of `size`. Useful for batching concurrent HTTP requests.
 *
 * @template T
 * @param {T[]} items - The array to split.
 * @param {number} size - Maximum elements per chunk. Must be > 0.
 * @returns {T[][]} Array of chunks.
 * @throws {RangeError} When `size` is zero or negative.
 */
export function chunk(items, size) {
  if (size <= 0) {
    throw new RangeError("chunk size must be greater than zero");
  }

  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function toTimestamp(publication_date) {
  const ms = new Date(publication_date).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Returns articles within the requested time window, or a fallback set.
 *
 * Primary behaviour: returns all articles whose `publication_date` falls within
 * the last `hours` hours.
 *
 * Fallback (when no recent articles exist): returns up to `fallbackLimit` articles
 * sorted by `publication_date` descending. This ensures scrapers always return
 * something useful even when the time window contains nothing new.
 *
 * Articles without a `publication_date` are always excluded.
 * Null/undefined array entries are filtered out.
 *
 * @param {Array<{publication_date?: string}|null>} articles - Raw article array.
 * @param {number} hours - Time window in hours.
 * @param {{ now?: Date, fallbackLimit?: number }} [options={}]
 *   - `now`: reference time (default: current time); injectable for testing.
 *   - `fallbackLimit`: max fallback articles to return (default: 10).
 * @returns {Array<{publication_date: string}>} Filtered (and possibly fallback) articles.
 */
export function pickRecentOrFallback(articles, hours, options = {}) {
  const now = options.now ?? new Date();
  const fallbackLimit = options.fallbackLimit ?? 10;

  const usable = articles
    .filter(Boolean)
    .filter((article) => Boolean(article.publication_date));

  const recent = usable.filter((article) => withinHours(article.publication_date, hours, now));

  if (recent.length > 0) {
    return recent;
  }

  return usable
    .sort((left, right) => toTimestamp(right.publication_date) - toTimestamp(left.publication_date))
    .slice(0, fallbackLimit);
}