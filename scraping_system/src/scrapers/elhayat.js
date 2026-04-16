import { ELHAYAT_FEED_URL } from "../config/sites.js";
import { fetchRssPage } from "../lib/rss.js";
import { createScrapeError, pickRecentOrFallback } from "../lib/scraper.js";
import {
  createArticleKey,
  decodeHtmlEntities,
  normalizeCategory,
  resolveUrl,
  stripHtml,
  toIsoString,
  withinHours
} from "../lib/utils.js";

function extractFirstImageUrl(...htmlCandidates) {
  for (const candidate of htmlCandidates) {
    if (!candidate || typeof candidate !== "string") {
      continue;
    }

    const match = candidate.match(/<img[^>]+src=["']([^"']+)["']/i);

    if (match?.[1]) {
      return resolveUrl("https://elhayat.dz/", match[1]);
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

function normalizeElhayatArticle(article) {
  if (!article.publicationDate) {
    return null;
  }

  const normalized = {
    source: "ELHAYAT",
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

export async function scrapeElhayat({ hours = 24 } = {}) {
  const errors = [];
  const candidates = [];
  const now = new Date();

  for (let page = 1; page <= 6; page += 1) {
    let feedPage;

    try {
      feedPage = await fetchRssPage(ELHAYAT_FEED_URL, page);
    } catch (error) {
      const url = page === 1 ? ELHAYAT_FEED_URL : `${ELHAYAT_FEED_URL}?paged=${page}`;
      errors.push(createScrapeError("ELHAYAT", url, error));
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

  const articles = pickRecentOrFallback(
    candidates.map((article) => normalizeElhayatArticle(article)).filter(Boolean),
    hours,
    { fallbackLimit: 10, now }
  );

  return {
    source: "ELHAYAT",
    articles,
    errors,
    notes: [
      "El Hayat articles are discovered from the public RSS feed and filtered by requested hours, with latest-item fallback when needed."
    ]
  };
}
