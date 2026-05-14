import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

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

const ECHOROUK_BASE_URL = "https://www.echoroukonline.com";
const ECHOROUK_FEED_URL = `${ECHOROUK_BASE_URL}/feed/`;
const MAX_FEED_PAGES = 6;
const ENRICH_BATCH_SIZE = 5;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseAttributeValue: false
});

function parseFeed(xml) {
  const parsed = xmlParser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? [];
  return Array.isArray(items) ? items : [items];
}

function extractImageFromContent(html) {
  if (!html || typeof html !== "string") {
    return null;
  }

  const srcset = html.match(/srcset=["']([^"']+)["']/i)?.[1];
  if (srcset) {
    const largest = srcset
      .split(",")
      .map((entry) => entry.trim().split(/\s+/))
      .filter((parts) => parts.length === 2)
      .sort((left, right) => Number.parseInt(right[1], 10) - Number.parseInt(left[1], 10))[0];

    if (largest?.[0]) {
      return resolveUrl(ECHOROUK_BASE_URL, largest[0]);
    }
  }

  const src = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  return src ? resolveUrl(ECHOROUK_BASE_URL, src) : null;
}

function cleanDescription(value) {
  const stripped = stripHtml(value);
  if (!stripped) {
    return null;
  }

  return stripped
    .replace(/\s*ظهرت المقالة\s+.+?\s+أولاً على\s+.+?\.?\s*$/u, "")
    .replace(/\s*The post\s+.+?\s+appeared first on\s+.+?\.?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim() || null;
}

function articleFromFeedItem(item) {
  const category = Array.isArray(item.category)
    ? item.category.find((cat) => typeof cat === "string" || cat?.["#text"])
    : item.category;

  const categoryText = typeof category === "string"
    ? category
    : category?.["#text"] ?? category?.["@_term"] ?? null;

  return {
    title: decodeHtmlEntities(stripHtml(item.title) || item.title || null),
    link: item.link ?? item.guid ?? null,
    publicationDate: toIsoString(item.pubDate ?? item["dc:date"] ?? null),
    category: normalizeCategory(categoryText),
    description: cleanDescription(item.description ?? item["content:encoded"]),
    imageUrl: extractImageFromContent(item["content:encoded"] ?? item.description)
  };
}

async function enrichFromArticlePage(article, errors) {
  if (!article.link) {
    return article;
  }

  try {
    const html = await fetchText(article.link);
    const $ = cheerio.load(html);

    const ogImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    const ogDescription =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      null;

    const publishedTime =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[itemprop="datePublished"]').attr("content") ||
      $("time[datetime]").first().attr("datetime") ||
      null;

    const sectionText =
      $('meta[property="article:section"]').attr("content") ||
      $(".breadcrumb a").eq(1).text().trim() ||
      $('[class*="category"] a,[class*="section"] a').first().text().trim() ||
      null;

    return {
      ...article,
      imageUrl: ogImage ? resolveUrl(ECHOROUK_BASE_URL, ogImage) : article.imageUrl,
      description: cleanDescription(ogDescription) ?? article.description,
      publicationDate: toIsoString(publishedTime) ?? article.publicationDate,
      category: normalizeCategory(sectionText, article.category)
    };
  } catch (error) {
    errors.push({
      source: "ECHOROUK",
      url: article.link,
      message: error.message
    });

    return article;
  }
}

function normalizeEchoroukArticle(article) {
  if (!article.title || !article.publicationDate) {
    return null;
  }

  const normalized = {
    source: "ECHOROUK",
    url: article.link,
    title: article.title.trim(),
    description: article.description ?? null,
    image_url: article.imageUrl ?? null,
    publication_date: article.publicationDate,
    category: article.category ?? null
  };

  normalized.dedupe_key = createArticleKey(normalized);

  return normalized;
}

function pickArticlesForWindowOrFallback(candidates, hours, now = new Date()) {
  const normalized = candidates.map(normalizeEchoroukArticle).filter(Boolean);
  const recent = normalized.filter((article) =>
    withinHours(article.publication_date, hours, now)
  );

  if (recent.length > 0) {
    return recent;
  }

  return normalized
    .sort(
      (left, right) =>
        new Date(right.publication_date).getTime() - new Date(left.publication_date).getTime()
    )
    .slice(0, 10);
}

async function fetchFeedPage(pageNumber) {
  const url =
    pageNumber === 1 ? ECHOROUK_FEED_URL : `${ECHOROUK_FEED_URL}?paged=${pageNumber}`;
  const xml = await fetchText(url, {
    headers: {
      accept:
        "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7"
    }
  });

  return { url, items: parseFeed(xml) };
}

export async function scrapeEchorouk({ hours = 24 } = {}) {
  const errors = [];
  const candidates = [];
  const now = new Date();

  for (let page = 1; page <= MAX_FEED_PAGES; page += 1) {
    let feedPage;

    try {
      feedPage = await fetchFeedPage(page);
    } catch (error) {
      errors.push({
        source: "ECHOROUK",
        url:
          page === 1
            ? ECHOROUK_FEED_URL
            : `${ECHOROUK_FEED_URL}?paged=${page}`,
        message: error.message
      });
      break;
    }

    if (feedPage.items.length === 0) {
      break;
    }

    const pageArticles = feedPage.items.map(articleFromFeedItem);
    candidates.push(...pageArticles);

    const hasRecentEntries = pageArticles.some(
      (entry) => entry.publicationDate && withinHours(entry.publicationDate, hours, now)
    );

    if (!hasRecentEntries) {
      break;
    }
  }

  const recentCandidates = candidates.filter(
    (article) =>
      article.publicationDate && withinHours(article.publicationDate, hours, now)
  );

  const needsEnrichment = recentCandidates.filter((article) => !article.imageUrl);
  const alreadyEnriched = recentCandidates.filter((article) => article.imageUrl);

  const enriched = [];
  for (let i = 0; i < needsEnrichment.length; i += ENRICH_BATCH_SIZE) {
    const batch = needsEnrichment.slice(i, i + ENRICH_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((article) => enrichFromArticlePage(article, errors))
    );
    enriched.push(...results);
  }

  const allArticles = pickArticlesForWindowOrFallback(
    [...alreadyEnriched, ...enriched],
    hours,
    now
  );

  return {
    source: "ECHOROUK",
    articles: allArticles,
    errors,
    notes: [
      "Echorouk articles are sourced from the public RSS feed. Articles missing images are enriched from their article pages."
    ]
  };
}
