import * as cheerio from "cheerio";

import { fetchText } from "../lib/http.js";
import {
  createArticleKey,
  decodeHtmlEntities,
  normalizeCategory,
  resolveUrl,
  stripHtml,
  toIsoString,
  withinHours
} from "../lib/utils.js";

const ELHEDDAF_BASE_URL = "https://www.elheddaf.com";

const CATEGORY_PAGES = [
  { name: "National", url: `${ELHEDDAF_BASE_URL}/article/index?cat=26` },
  { name: "National Team", url: `${ELHEDDAF_BASE_URL}/article/index?cat=28` },
  { name: "International", url: `${ELHEDDAF_BASE_URL}/article/index?cat=29` },
  { name: "Arab Football", url: `${ELHEDDAF_BASE_URL}/article/index?cat=30` },
  { name: "Africa Cup", url: `${ELHEDDAF_BASE_URL}/article/index?cat=31` },
  { name: "Professionals", url: `${ELHEDDAF_BASE_URL}/article/index?cat=35` },
  { name: "Champions League", url: `${ELHEDDAF_BASE_URL}/article/index?cat=42` },
  { name: "Europa League", url: `${ELHEDDAF_BASE_URL}/article/index?cat=45` },
  { name: "Media", url: `${ELHEDDAF_BASE_URL}/article/index?cat=52` },
  { name: "World Cup", url: `${ELHEDDAF_BASE_URL}/article/index?cat=67` }
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeArabicIndicDigits(value) {
  if (!value || typeof value !== "string") {
    return value;
  }

  return value.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString());
}

function parseDate(raw) {
  if (!raw) {
    return null;
  }

  const normalized = normalizeArabicIndicDigits(raw).trim();

  const yearFirstMatch = normalized.match(
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s*[-–|]\s*(\d{1,2}):(\d{2}))?/
  );

  if (yearFirstMatch) {
    const [, year, month, day, hour = "00", minute = "00"] = yearFirstMatch;
    return toIsoString(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`
    );
  }

  const dayFirstMatch = normalized.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/
  );

  if (dayFirstMatch) {
    const [, day, month, year, hour = "00", minute = "00"] = dayFirstMatch;
    return toIsoString(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`
    );
  }

  return toIsoString(normalized);
}

function discoverLinksFromCategoryPage(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href]').each((_, element) => {
    const href = $(element).attr("href");
    const resolved = resolveUrl(baseUrl, href);

    if (!resolved) {
      return;
    }

    if (resolved.includes("/article/detail") || resolved.includes("/article/show")) {
      links.add(resolved);
    }
  });

  return [...links];
}

function normalizeUrlForRetry(url) {
  try {
    return encodeURI(decodeURI(url));
  } catch {
    return encodeURI(url);
  }
}

async function fetchArticleHtml(url) {
  const fallbackUrl = normalizeUrlForRetry(url);
  const candidates = fallbackUrl === url ? [url] : [url, fallbackUrl];
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const candidate of candidates) {
      try {
        return await fetchText(candidate);
      } catch (error) {
        lastError = error;
      }
    }

    await wait(250 * attempt);
  }

  throw lastError;
}

async function scrapeArticle(url, fallbackCategory, errors) {
  try {
    const html = await fetchArticleHtml(url);
    const $ = cheerio.load(html);

    const rawTitle =
      stripHtml(
        $("h1.titre").first().text() ||
          $('meta[property="og:title"]').attr("content") ||
          $("title").text()
      ) || null;

    const title = rawTitle?.includes(" : ") ? rawTitle.split(" : ").slice(1).join(" : ").trim() : rawTitle;

    const description =
      stripHtml(
        $(".chapeau").first().text() ||
          $('meta[name="description"]').attr("content") ||
          $('meta[property="og:description"]').attr("content")
      ) || null;

    const imageUrl =
      resolveUrl(
        ELHEDDAF_BASE_URL,
        $(".photo-article img").first().attr("src") || $('meta[property="og:image"]').attr("content")
      ) || null;

    const rawDate =
      $(".date-info .date").first().text().trim() ||
      $(".date-info").first().text().trim() ||
      $('meta[property="article:published_time"]').attr("content") ||
      $("time[datetime]").first().attr("datetime") ||
      (
        html.match(
          /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}(?:\s*[-–|]\s*\d{1,2}:\d{2})?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}(?:\s+\d{1,2}:\d{2})?/
        ) || [null]
      )[0] ||
      null;

    const publicationDate = parseDate(rawDate);

    const category =
      normalizeCategory(
        $(
          ".breadcrumb li:last-child a, .cat-name, .category-title, .rubrique, .section-title"
        )
          .first()
          .text(),
        fallbackCategory
      ) || fallbackCategory;

    return {
      source: "ELHEDDAF",
      url,
      title: decodeHtmlEntities(title),
      description,
      image_url: imageUrl,
      publication_date: publicationDate,
      category
    };
  } catch (error) {
    errors.push({
      source: "ELHEDDAF",
      url,
      message: error.message
    });

    return null;
  }
}

function normalizeElheddafArticle(article) {
  if (!article || !article.title || !article.publication_date) {
    return null;
  }

  const normalized = {
    ...article,
    dedupe_key: createArticleKey(article)
  };

  return normalized;
}

function pickArticlesForWindowOrFallback(scrapedArticles, hours, now = new Date()) {
  const normalized = scrapedArticles.map((article) => normalizeElheddafArticle(article)).filter(Boolean);
  const recent = normalized.filter((article) => withinHours(article.publication_date, hours, now));

  if (recent.length > 0) {
    return recent;
  }

  return normalized
    .sort((left, right) => right.publication_date.localeCompare(left.publication_date))
    .slice(0, 10);
}

export async function scrapeElheddaf({ hours }) {
  const errors = [];
  const discovered = new Map();
  const now = new Date();

  for (const categoryPage of CATEGORY_PAGES) {
    try {
      const html = await fetchText(categoryPage.url);
      const links = discoverLinksFromCategoryPage(html, categoryPage.url);

      for (const url of links.slice(0, 25)) {
        if (!discovered.has(url)) {
          discovered.set(url, categoryPage.name);
        }
      }
    } catch (error) {
      errors.push({
        source: "ELHEDDAF",
        url: categoryPage.url,
        message: error.message
      });
    }
  }

  const entries = [...discovered.entries()];
  const scraped = [];

  for (let index = 0; index < entries.length; index += 8) {
    const batch = entries.slice(index, index + 3);
    const results = await Promise.all(
      batch.map(([url, fallbackCategory]) => scrapeArticle(url, fallbackCategory, errors))
    );

    scraped.push(...results.filter(Boolean));
  }

  return {
    source: "ELHEDDAF",
    articles: pickArticlesForWindowOrFallback(scraped, hours, now),
    errors,
    notes: [
      "Elheddaf articles are discovered from public category pages and filtered by requested hours, with latest-item fallback when needed."
    ]
  };
}