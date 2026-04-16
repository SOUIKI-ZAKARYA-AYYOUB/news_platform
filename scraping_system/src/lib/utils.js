import fs from "node:fs/promises";
import path from "node:path";

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

export function decodeHtmlEntities(value) {
  if (!value || typeof value !== "string") {
    return value ?? null;
  }

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "...")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "-")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”");
}

export function parseArgs(argv) {
  const args = {
    hours: 24,
    output: null
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
    }
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0) {
    throw new Error("`--hours` must be a positive integer.");
  }

  return args;
}

export function toIsoString(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

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

export function isSameDayInTimeZone(dateValue, referenceDate, timeZone) {
  const currentDay = dayKeyInTimeZone(dateValue, timeZone);
  const referenceDay = dayKeyInTimeZone(referenceDate, timeZone);

  return Boolean(currentDay && referenceDay && currentDay === referenceDay);
}

export function isTodayInTimeZone(dateValue, timeZone, now = new Date()) {
  return isSameDayInTimeZone(dateValue, now, timeZone);
}

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

export function normalizeCategory(value, fallback = null) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  return cleaned || fallback;
}

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

export async function writeJsonFile(filePath, data) {
  const absolutePath = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return absolutePath;
}
