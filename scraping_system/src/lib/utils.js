import fs from "node:fs/promises";
import path from "node:path";

/**
 * Strips HTML tags from a string and returns plain text.
 *
 * Converts `<br>` and `</p>` to spaces before stripping so inline elements
 * do not run words together. Collapses whitespace and trims the result.
 *
 * @param {unknown} value - Any value. Non-strings and falsy values return null.
 * @returns {string|null} Cleaned plain text, or null if the result is empty.
 */
export function stripHtml(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

/**
 * Decodes HTML entities in a string to their Unicode equivalents.
 *
 * Handles named entities (&amp;, &lt;, &gt;, &quot;, &apos;, &nbsp;, &hellip;,
 * curly quotes, dashes), decimal numeric references (&#8211;), hexadecimal
 * references (&#x2014;), and common WordPress/CMS-specific numeric codes.
 *
 * @param {unknown} value - Any value. Non-strings return null; empty strings return null.
 * @returns {string|null} String with entities decoded, or null for invalid input.
 */
export function decodeHtmlEntities(value) {
  if (!value || typeof value !== "string") {
    return value ?? null;
  }

  return value
    .replace(/&nbsp;/gi, “ “)
    .replace(/&hellip;/gi, “...”)
    .replace(/&amp;/gi, “&”)
    .replace(/&lt;/gi, “<”)
    .replace(/&gt;/gi, “>”)
    .replace(/&quot;/gi, ‘”’)
    .replace(/&apos;/gi, “’”)
    .replace(/&#039;/g, “’”)
    .replace(/&#8217;/g, “’”)
    .replace(/&#8216;/g, “‘”)
    .replace(/&#8211;/g, “–“)
    .replace(/&#8212;/g, “—“)
    .replace(/&#8220;/g, ““”)
    .replace(/&#8221;/g, “””)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}

/**
 * Parses CLI arguments for the scraper entry point.
 *
 * Supported flags:
 *   --hours <n>          Time window in hours (default: 24; must be a positive integer)
 *   --output <path>      Output file path
 *   --site-url <url>     URL to scrape with the generic scraper
 *   --url <url>          Alias for --site-url
 *   --no-process         Skip story processing; emit raw articles
 *   --raw-output <path>  Path for raw (pre-processed) JSON output
 *
 * @param {string[]} argv - Argument tokens (typically process.argv.slice(2))
 * @returns {{ hours: number, output: string|null, siteUrl: string|null, processStories: boolean, rawOutput: string|null }}
 * @throws {Error} When --hours is not a positive integer.
 */
export function parseArgs(argv) {
  const args = {
    hours: 24,
    output: null,
    siteUrl: null,
    processStories: true,
    rawOutput: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--hours" && argv[index + 1]) {
      args.hours = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (token === "--output" && argv[index + 1]) {
      args.output = argv[index + 1];
      index += 1;
      continue;
    }

    if ((token === "--site-url" || token === "--url") && argv[index + 1]) {
      args.siteUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--no-process") {
      args.processStories = false;
      continue;
    }

    if (token === "--raw-output" && argv[index + 1]) {
      args.rawOutput = argv[index + 1];
      index += 1;
    }
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0) {
    throw new Error("`--hours` must be a positive integer.");
  }

  return args;
}

/**
 * Converts a URL's hostname into an uppercase source identifier string.
 *
 * Strips the `www.` prefix, removes the TLD, joins remaining parts with `_`,
 * and uppercases the result. Replaces non-alphanumeric characters with `_`.
 *
 * @example
 *   hostnameToSourceName("https://www.tsa-algerie.dz/")  // → "TSA_ALGERIE"
 *   hostnameToSourceName("https://news.bbc.co.uk/")      // → "NEWS_BBC_CO"
 *
 * @param {string} url - Any valid URL string.
 * @returns {string} Uppercase source name, or "GENERIC" if the URL is invalid.
 */
export function hostnameToSourceName(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname
      .split(".")
      .filter(Boolean)
      .slice(0, -1)
      .join("_")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  } catch {
    return "GENERIC";
  }
}

/**
 * Converts any date-like value to an ISO 8601 string, or null if invalid.
 *
 * Accepts Date objects, ISO strings, RFC 2822 strings, and numeric timestamps.
 * Returns null for falsy values, unparseable strings, or `Invalid Date`.
 *
 * @param {Date|string|number|null|undefined} value - A date-like value.
 * @returns {string|null} ISO 8601 string (e.g. "2026-05-14T10:00:00.000Z"), or null.
 */
export function toIsoString(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Returns true if a date falls within the last `hours` hours relative to `now`.
 *
 * Dates in the future (after `now`) return false.
 * Invalid date values return false.
 *
 * @param {string|Date|number} dateValue - The date to test.
 * @param {number} hours - The time window in hours.
 * @param {Date} [now=new Date()] - Reference point (injectable for testing).
 * @returns {boolean}
 */
export function withinHours(dateValue, hours, now = new Date()) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const diffMs = now.getTime() - date.getTime();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

function dayKeyInTimeZone(dateValue, timeZone) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/**
 * Returns true if two dates fall on the same calendar day in the given timezone.
 *
 * Uses `Intl.DateTimeFormat` with the `en-CA` locale (which produces YYYY-MM-DD)
 * to compute each date's day string in the target timezone.
 *
 * @param {string|Date} dateValue - The date to test.
 * @param {string|Date} referenceDate - The reference date.
 * @param {string} timeZone - IANA timezone identifier (e.g. "Africa/Algiers").
 * @returns {boolean}
 */
export function isSameDayInTimeZone(dateValue, referenceDate, timeZone) {
  const currentDay = dayKeyInTimeZone(dateValue, timeZone);
  const referenceDay = dayKeyInTimeZone(referenceDate, timeZone);

  return Boolean(currentDay && referenceDay && currentDay === referenceDay);
}

/**
 * Returns true if `dateValue` falls on today's calendar date in the given timezone.
 *
 * @param {string|Date} dateValue - The date to test.
 * @param {string} timeZone - IANA timezone identifier.
 * @param {Date} [now=new Date()] - Reference "today" (injectable for testing).
 * @returns {boolean}
 */
export function isTodayInTimeZone(dateValue, timeZone, now = new Date()) {
  return isSameDayInTimeZone(dateValue, now, timeZone);
}

/**
 * Returns a stable deduplication key for an article.
 *
 * Uses the `url` field when available (preferred — most stable).
 * Falls back to `source::title::publication_date` when URL is absent.
 *
 * @param {{ url?: string, source?: string, title?: string, publication_date?: string }} article
 * @returns {string}
 */
export function createArticleKey(article) {
  if (article.url) {
    return article.url;
  }

  return [
    article.source ?? "",
    article.title ?? "",
    article.publication_date ?? ""
  ].join("::");
}

/**
 * Trims and validates a category string.
 *
 * Returns `fallback` (default: null) for non-string inputs or whitespace-only strings.
 *
 * @param {unknown} value - The raw category value.
 * @param {string|null} [fallback=null] - Value to return when input is invalid.
 * @returns {string|null}
 */
export function normalizeCategory(value, fallback = null) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  return cleaned || fallback;
}

/**
 * Safely resolves a candidate URL against a base URL.
 *
 * Returns the absolute URL string, or null if the candidate is falsy or
 * the URL constructor throws (malformed input).
 *
 * @param {string} base - The base URL (e.g. the page URL).
 * @param {string|null|undefined} candidate - An absolute or relative URL.
 * @returns {string|null}
 */
export function resolveUrl(base, candidate) {
  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

/**
 * Writes data to a JSON file, creating parent directories as needed.
 *
 * The output always ends with a trailing newline (POSIX-compatible).
 * Resolves relative paths against `process.cwd()`.
 *
 * @param {string} filePath - Relative or absolute path for the output file.
 * @param {unknown} data - Any JSON-serialisable value.
 * @returns {Promise<string>} The absolute path of the written file.
 */
export async function writeJsonFile(filePath, data) {
  const absolutePath = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return absolutePath;
}
