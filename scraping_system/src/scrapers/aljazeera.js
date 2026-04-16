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

const ALJAZEERA_BASE_URL = "https://www.aljazeera.net";

const ALJAZEERA_SECTION_URLS = [
  "https://www.aljazeera.net/news/",
  "https://www.aljazeera.net/where/mideast/arab/",
  "https://www.aljazeera.net/where/intl/",
  "https://www.aljazeera.net/politics/",
  "https://www.aljazeera.net/sport/",
  "https://www.aljazeera.net/tech/",
  "https://www.aljazeera.net/culture/"
];

function extractDateFromJsonLd($) {
  const scripts = $('script[type="application/ld+json"]');

  for (const script of scripts.toArray()) {
    const raw = $(script).html();

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (stack.length > 0) {
        const current = stack.shift();

        if (!current || typeof current !== "object") {
          continue;
        }

        if (typeof current.datePublished === "string") {
          return current.datePublished;
        }

        if (typeof current.dateCreated === "string") {
          return current.dateCreated;
        }

        for (const value of Object.values(current)) {
          if (Array.isArray(value)) {
            stack.push(...value);
          } else if (value && typeof value === "object") {
            stack.push(value);
          }
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractDateFromUrl(url) {
  const match = url.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\/|$)/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`;
}

function extractPublicationDate($, articleUrl) {
  const fromMeta =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="publish-date"]').attr("content") ||
    $('meta[itemprop="datePublished"]').attr("content") ||
    $('time[datetime]').first().attr("datetime") ||
    extractDateFromJsonLd($) ||
    extractDateFromUrl(articleUrl);

  return toIsoString(fromMeta);
}

function isArticleUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== "www.aljazeera.net" && parsed.hostname !== "aljazeera.net") {
      return false;
    }

    if (parsed.pathname.includes("/liveblog/")) {
      return false;
    }

    return /\/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\/|$)/.test(parsed.pathname);
  } catch {
    return false;
  }
}

function discoverSectionLinks(html, sectionUrl) {
  const $ = cheerio.load(html);
  const discovered = new Set();

  $('a[href]').each((_, anchor) => {
    const href = $(anchor).attr("href");
    const resolved = resolveUrl(sectionUrl, href);

    if (!resolved || !isArticleUrl(resolved)) {
      return;
    }

    discovered.add(resolved);
  });

  return [...discovered];
}

function categoryFromSectionUrl(sectionUrl) {
  try {
    const pathname = new URL(sectionUrl).pathname;
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      return "General";
    }

    return decodeURIComponent(parts[parts.length - 1]).replace(/-/g, " ");
  } catch {
    return "General";
  }
}

async function scrapeArticle(url, fallbackCategory, errors) {
  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);

    const title =
      stripHtml(
        $('meta[property="og:title"]').attr("content") ||
          $('meta[name="twitter:title"]').attr("content") ||
          $("h1").first().text()
      ) || null;

    const description =
      stripHtml(
        $('meta[property="og:description"]').attr("content") ||
          $('meta[name="description"]').attr("content") ||
          $('article p').first().text()
      ) || null;

    const imageUrl =
      resolveUrl(ALJAZEERA_BASE_URL, $('meta[property="og:image"]').attr("content")) ||
      resolveUrl(ALJAZEERA_BASE_URL, $('meta[name="twitter:image"]').attr("content")) ||
      null;

    const category =
      normalizeCategory(
        $(
          '.breadcrumb li:last-child a, .breadcrumb li:nth-last-child(2) a, [class*="category"] a, [class*="topic"] a'
        )
          .first()
          .text(),
        fallbackCategory
      ) || null;

    const publicationDate = extractPublicationDate($, url);

    return {
      source: "ALJAZEERA",
      url,
      title: decodeHtmlEntities(title),
      description,
      image_url: imageUrl,
      publication_date: publicationDate,
      category
    };
  } catch (error) {
    errors.push({
      source: "ALJAZEERA",
      url,
      message: error.message
    });

    return null;
  }
}

function normalizeAljazeeraArticle(article) {
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
  const normalized = scrapedArticles.map((article) => normalizeAljazeeraArticle(article)).filter(Boolean);
  const recent = normalized.filter((article) => withinHours(article.publication_date, hours, now));

  if (recent.length > 0) {
    return recent;
  }

  return normalized
    .sort((left, right) => right.publication_date.localeCompare(left.publication_date))
    .slice(0, 20);
}

export async function scrapeAljazeera({ hours }) {
  const errors = [];
  const discovered = new Map();
  const now = new Date();

  for (const sectionUrl of ALJAZEERA_SECTION_URLS) {
    try {
      const html = await fetchText(sectionUrl);
      const urls = discoverSectionLinks(html, sectionUrl);
      const fallbackCategory = categoryFromSectionUrl(sectionUrl);

      for (const url of urls.slice(0, 40)) {
        if (!discovered.has(url)) {
          discovered.set(url, fallbackCategory);
        }
      }
    } catch (error) {
      errors.push({
        source: "ALJAZEERA",
        url: sectionUrl,
        message: error.message
      });
    }
  }

  const entries = [...discovered.entries()];
  const scraped = [];

  for (let index = 0; index < entries.length; index += 8) {
    const batch = entries.slice(index, index + 8);
    const results = await Promise.all(
      batch.map(([url, sectionUrl]) => scrapeArticle(url, sectionUrl, errors))
    );

    scraped.push(...results.filter(Boolean));
  }

  return {
    source: "ALJAZEERA",
    articles: pickArticlesForWindowOrFallback(scraped, hours, now),
    errors,
    notes: [
      "Al Jazeera articles are discovered from public section pages and filtered by requested hours, with latest-item fallback when needed."
    ]
  };
}