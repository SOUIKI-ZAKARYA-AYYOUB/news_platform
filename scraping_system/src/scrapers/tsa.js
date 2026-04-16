import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

import { TSA_FEED_URL } from "../config/sites.js";
import { fetchText } from "../lib/http.js";
import {
  createArticleKey,
  decodeHtmlEntities,
  normalizeCategory,
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

function articleFromFeedItem(item) {
  return {
    title: decodeHtmlEntities(item.title ?? null),
    link: item.link ?? null,
    publicationDate: toIsoString(item.pubDate),
    category: normalizeCategory(Array.isArray(item.category) ? item.category[0] : item.category),
    description: stripHtml(item.description)
  };
}

async function enrichArticleFromPage(article, errors) {
  if (!article.link) {
    return {
      ...article,
      imageUrl: null,
      finalDescription: article.description
    };
  }

  try {
    const html = await fetchText(article.link);
    const $ = cheerio.load(html);

    const metaDescription =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      null;

    const metaImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    const metaPublished =
      $('meta[property="article:published_time"]').attr("content") ||
      article.publicationDate;

    const categoryText =
      $('a[rel="category tag"]').first().text().trim() ||
      article.category;

    return {
      ...article,
      publicationDate: toIsoString(metaPublished) ?? article.publicationDate,
      imageUrl: metaImage || null,
      finalDescription: stripHtml(metaDescription) ?? article.description,
      category: normalizeCategory(categoryText, article.category)
    };
  } catch (error) {
    errors.push({
      source: "TSA",
      url: article.link,
      message: error.message
    });

    return {
      ...article,
      imageUrl: null,
      finalDescription: article.description
    };
  }
}

function normalizeTsaArticle(article, cutoffHours) {
  if (!article.publicationDate || !withinHours(article.publicationDate, cutoffHours)) {
    return null;
  }

  const normalized = {
    source: "TSA",
    url: article.link,
    title: article.title?.trim() || null,
    description: article.finalDescription ?? null,
    image_url: article.imageUrl ?? null,
    publication_date: article.publicationDate,
    category: article.category ?? null
  };

  normalized.dedupe_key = createArticleKey(normalized);

  return normalized.title ? normalized : null;
}

async function fetchFeedPage(pageNumber) {
  const url = pageNumber === 1 ? TSA_FEED_URL : `${TSA_FEED_URL}?paged=${pageNumber}`;
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

export async function scrapeTsa({ hours }) {
  const errors = [];
  const candidates = [];

  for (let page = 1; page <= 5; page += 1) {
    let feedPage;

    try {
      feedPage = await fetchFeedPage(page);
    } catch (error) {
      errors.push({
        source: "TSA",
        url: page === 1 ? TSA_FEED_URL : `${TSA_FEED_URL}?paged=${page}`,
        message: error.message
      });
      break;
    }

    if (feedPage.items.length === 0) {
      break;
    }

    const pageArticles = feedPage.items.map(articleFromFeedItem);
    candidates.push(...pageArticles);

    const oldest = pageArticles
      .map((entry) => entry.publicationDate)
      .filter(Boolean)
      .sort()[0];

    if (!oldest || !withinHours(oldest, hours)) {
      break;
    }
  }

  const recentCandidates = candidates.filter(
    (entry) => entry.publicationDate && withinHours(entry.publicationDate, hours)
  );

  const enriched = await Promise.all(
    recentCandidates.map((article) => enrichArticleFromPage(article, errors))
  );

  return {
    source: "TSA",
    articles: enriched.map((article) => normalizeTsaArticle(article, hours)).filter(Boolean),
    errors,
    notes: [
      "TSA articles are discovered from the public RSS feed and enriched from article metadata pages."
    ]
  };
}
