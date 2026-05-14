import { withinHours } from "./utils.js";

export function createScrapeError(source, url, error) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    source,
    url,
    message
  };
}

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