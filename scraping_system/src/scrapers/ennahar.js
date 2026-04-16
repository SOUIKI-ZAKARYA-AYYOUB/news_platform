import { XMLParser } from "fast-xml-parser";

import { ENNAHAR_FEED_URL } from "../config/sites.js";
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

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

function parseFeed(xml) {
  const parsed = xmlParser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? [];
  return Array.isArray(items) ? items : [items];
}

function extractFirstImageUrl(...htmlCandidates) {
  for (const candidate of htmlCandidates) {
    if (!candidate || typeof candidate !== "string") {
      continue;
    }

    const match = candidate.match(/<img[^>]+src=["']([^"']+)["']/i);

    if (match?.[1]) {
      return resolveUrl("https://www.ennaharonline.com/", match[1]);
    }
  }

  return null;
}

function cleanFeedDescription(value) {
  const cleaned = stripHtml(value);

  if (!cleaned) {
    return null;
  }

  return cleaned
    .replace(/\s*The post\s+.+?\s+appeared first on\s+.+?\.?\s*$/i, "")
    .trim() || null;
}

function articleFromFeedItem(item) {
  const publicationDate = toIsoString(item.pubDate);
  const contentEncoded = item["content:encoded"] ?? null;

  return {
    title: decodeHtmlEntities(item.title ?? null),
    link: item.link ?? null,
    publicationDate,
    category: normalizeCategory(Array.isArray(item.category) ? item.category[0] : item.category),
    description: cleanFeedDescription(item.description),
    imageUrl: extractFirstImageUrl(contentEncoded, item.description)
  };
}

function normalizeEnnaharArticle(article) {
  if (!article.publicationDate) {
    return null;
  }

  const normalized = {
    source: "ENNAHAR",
    url: article.link,
    title: article.title?.trim() || null,
    description: article.description,
    image_url: article.imageUrl,
    publication_date: article.publicationDate,
    category: article.category ?? null
  };

  normalized.dedupe_key = createArticleKey(normalized);

  return normalized.title ? normalized : null;
}

function pickArticlesForWindowOrFallback(candidates, hours, now = new Date()) {
  const normalized = candidates.map((article) => normalizeEnnaharArticle(article)).filter(Boolean);
  const recent = normalized.filter((article) => withinHours(article.publication_date, hours, now));

  if (recent.length > 0) {
    return recent;
  }

  return normalized
    .sort((left, right) => right.publication_date.localeCompare(left.publication_date))
    .slice(0, 10);
}

async function fetchFeedPage(pageNumber) {
  const url = pageNumber === 1 ? ENNAHAR_FEED_URL : `${ENNAHAR_FEED_URL}?paged=${pageNumber}`;
  const xml = await fetchText(url, {
    headers: {
      accept: "application/rss+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7"
    }
  });

  return {
    url,
    items: parseFeed(xml)
  };
}

export async function scrapeEnnahar({ hours = 24 } = {}) {
  const errors = [];
  const candidates = [];
  const now = new Date();

  for (let page = 1; page <= 6; page += 1) {
    let feedPage;

    try {
      feedPage = await fetchFeedPage(page);
    } catch (error) {
      errors.push({
        source: "ENNAHAR",
        url: page === 1 ? ENNAHAR_FEED_URL : `${ENNAHAR_FEED_URL}?paged=${page}`,
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

  const articles = pickArticlesForWindowOrFallback(candidates, hours, now);

  return {
    source: "ENNAHAR",
    articles,
    errors,
    notes: [
      "Ennahar articles are discovered from the public RSS feed and filtered by requested hours, with latest-item fallback when needed."
    ]
  };
}
