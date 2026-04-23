import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

import { fetchText } from "../lib/http.js";
import {
  createArticleKey,
  decodeHtmlEntities,
  hostnameToSourceName,
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

const MAX_ARTICLE_CANDIDATES = 40;
const MAX_SITEMAP_URLS = 5;
const MAX_SITEMAP_ARTICLE_URLS = 80;

function safeArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildFeedCandidates(siteUrl, html) {
  const candidates = [];

  if (html) {
    const $ = cheerio.load(html);

    $('link[rel="alternate"]').each((_, element) => {
      const type = ($(element).attr("type") || "").toLowerCase();
      const href = $(element).attr("href");

      if (!type.includes("rss") && !type.includes("atom") && !type.includes("xml")) {
        return;
      }

      candidates.push(resolveUrl(siteUrl, href));
    });
  }

  candidates.push(
    resolveUrl(siteUrl, "/feed"),
    resolveUrl(siteUrl, "/feed/"),
    resolveUrl(siteUrl, "/rss"),
    resolveUrl(siteUrl, "/rss/"),
    resolveUrl(siteUrl, "/rss.xml"),
    resolveUrl(siteUrl, "/feed.xml"),
    resolveUrl(siteUrl, "/atom.xml"),
    resolveUrl(siteUrl, "/index.xml")
  );

  return unique(candidates);
}

function extractFeedItems(xml) {
  const parsed = xmlParser.parse(xml);
  const rssItems = parsed?.rss?.channel?.item;

  if (rssItems) {
    return safeArray(rssItems);
  }

  const atomEntries = parsed?.feed?.entry;
  return safeArray(atomEntries);
}

function parseFeedArticle(item, baseUrl) {
  const linkValue =
    item.link?.["@_href"] ||
    item.link?.href ||
    (typeof item.link === "string" ? item.link : null) ||
    item.guid ||
    null;

  const categoryValue = Array.isArray(item.category)
    ? item.category[0]?.["#text"] || item.category[0]
    : item.category?.["#text"] || item.category?.["@_term"] || item.category;

  return {
    url: resolveUrl(baseUrl, linkValue),
    title: decodeHtmlEntities(stripHtml(item.title) || item.title || null),
    description: stripHtml(
      item.description || item.summary || item["content:encoded"] || item.content || null
    ),
    publication_date: toIsoString(
      item.pubDate || item.published || item.updated || item["dc:date"] || null
    ),
    category: normalizeCategory(stripHtml(categoryValue))
  };
}

async function discoverFeedArticles(siteUrl, html, errors) {
  for (const feedUrl of buildFeedCandidates(siteUrl, html)) {
    try {
      const xml = await fetchText(feedUrl, {
        headers: {
          accept: "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7"
        }
      });

      const items = extractFeedItems(xml).map((item) => parseFeedArticle(item, siteUrl)).filter(Boolean);

      if (items.length > 0) {
        return {
          feedUrl,
          articles: items.filter((item) => item.url && item.title)
        };
      }
    } catch (error) {
      errors.push({
        source: hostnameToSourceName(siteUrl),
        url: feedUrl,
        message: error.message
      });
    }
  }

  return {
    feedUrl: null,
    articles: []
  };
}

function extractLocEntries(parsed) {
  const sitemapEntries = safeArray(parsed?.sitemapindex?.sitemap);

  if (sitemapEntries.length > 0) {
    return sitemapEntries.map((entry) => entry.loc).filter(Boolean);
  }

  const urlEntries = safeArray(parsed?.urlset?.url);
  return urlEntries.map((entry) => entry.loc).filter(Boolean);
}

function looksLikeArticleUrl(url, siteHostname) {
  try {
    const parsed = new URL(url);

    if (siteHostname && parsed.hostname !== siteHostname && parsed.hostname !== `www.${siteHostname}`) {
      return false;
    }

    const path = parsed.pathname.toLowerCase();

    if (
      path === "/" ||
      path.includes("/tag/") ||
      path.includes("/author/") ||
      path.includes("/category/") ||
      path.includes("/page/") ||
      path.endsWith(".jpg") ||
      path.endsWith(".jpeg") ||
      path.endsWith(".png") ||
      path.endsWith(".webp") ||
      path.endsWith(".gif") ||
      path.endsWith(".xml")
    ) {
      return false;
    }

    return /\/\d{4}\/\d{1,2}\/\d{1,2}\//.test(path) || path.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

async function discoverFromSitemap(siteUrl, errors) {
  const siteHostname = new URL(siteUrl).hostname.replace(/^www\./, "");
  const candidates = unique([
    resolveUrl(siteUrl, "/sitemap.xml"),
    resolveUrl(siteUrl, "/sitemap_index.xml")
  ]);

  const articleUrls = new Set();
  const attempted = [];

  while (candidates.length > 0 && attempted.length < MAX_SITEMAP_URLS) {
    const sitemapUrl = candidates.shift();

    if (!sitemapUrl || attempted.includes(sitemapUrl)) {
      continue;
    }

    attempted.push(sitemapUrl);

    try {
      const xml = await fetchText(sitemapUrl, {
        headers: {
          accept: "application/xml,text/xml;q=0.9,*/*;q=0.8"
        }
      });
      const parsed = xmlParser.parse(xml);
      const locEntries = extractLocEntries(parsed);

      for (const loc of locEntries) {
        if (loc.endsWith(".xml")) {
          candidates.push(loc);
          continue;
        }

        if (looksLikeArticleUrl(loc, siteHostname)) {
          articleUrls.add(loc);
        }

        if (articleUrls.size >= MAX_SITEMAP_ARTICLE_URLS) {
          break;
        }
      }
    } catch (error) {
      errors.push({
        source: hostnameToSourceName(siteUrl),
        url: sitemapUrl,
        message: error.message
      });
    }

    if (articleUrls.size >= MAX_SITEMAP_ARTICLE_URLS) {
      break;
    }
  }

  return [...articleUrls];
}

function nodeSignature($, element) {
  const tag = element.tagName || element.name || "div";
  const className = ($(element).attr("class") || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .sort()
    .join(".");

  return className ? `${tag}.${className}` : tag;
}

function scoreContainer($, element) {
  const node = $(element);
  const linkCount = node.find("a[href]").length;
  const imageCount = node.find("img").length;
  const timeCount = node.find("time,[datetime],[class*='date'],[class*='time']").length;
  const text = stripHtml(node.text()) || "";
  const heading = stripHtml(node.find("h1,h2,h3,h4").first().text()) || "";

  let score = 0;

  if (linkCount >= 1) {
    score += 2;
  }

  if (imageCount >= 1) {
    score += 1;
  }

  if (timeCount >= 1) {
    score += 1;
  }

  if (heading.length >= 20) {
    score += 2;
  }

  if (text.length >= 40 && text.length <= 600) {
    score += 1;
  }

  return score;
}

function discoverHomepageArticleUrls(siteUrl, html) {
  const $ = cheerio.load(html);
  const candidates = new Map();

  $("article, li, div, section").each((_, element) => {
    const score = scoreContainer($, element);

    if (score < 4) {
      return;
    }

    const signature = nodeSignature($, element);
    const entry = candidates.get(signature) ?? { score: 0, elements: [] };
    entry.score += score;
    entry.elements.push(element);
    candidates.set(signature, entry);
  });

  const rankedContainers = [...candidates.values()]
    .filter((entry) => entry.elements.length >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  const urls = new Set();

  for (const container of rankedContainers) {
    for (const element of container.elements) {
      const href = $(element).find("a[href]").first().attr("href");
      const resolved = resolveUrl(siteUrl, href);

      if (resolved && looksLikeArticleUrl(resolved, new URL(siteUrl).hostname.replace(/^www\./, ""))) {
        urls.add(resolved);
      }
    }
  }

  if (urls.size > 0) {
    return [...urls];
  }

  $('a[href]').each((_, anchor) => {
    const resolved = resolveUrl(siteUrl, $(anchor).attr("href"));
    const label = stripHtml($(anchor).text()) || "";

    if (resolved && label.length >= 20 && looksLikeArticleUrl(resolved, new URL(siteUrl).hostname.replace(/^www\./, ""))) {
      urls.add(resolved);
    }
  });

  return [...urls];
}

function extractJsonLdObjects($) {
  const objects = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html();

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      objects.push(parsed);
    } catch {
      return;
    }
  });

  return objects;
}

function flattenJsonLd(values) {
  const queue = [...values];
  const flattened = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!current || typeof current !== "object") {
      continue;
    }

    flattened.push(current);

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return flattened;
}

function extractArticleMetadata(siteUrl, url, html, fallback = {}) {
  const $ = cheerio.load(html);
  const jsonLdNodes = flattenJsonLd(extractJsonLdObjects($));
  const articleNode = jsonLdNodes.find((node) => {
    const type = node["@type"];

    if (Array.isArray(type)) {
      return type.some((value) => /article|newsarticle|blogposting/i.test(String(value)));
    }

    return /article|newsarticle|blogposting/i.test(String(type || ""));
  });

  const title =
    stripHtml(
      $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        articleNode?.headline ||
        $("h1").first().text()
    ) || fallback.title || null;

  const description =
    stripHtml(
      $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        $('meta[name="twitter:description"]').attr("content") ||
        articleNode?.description ||
        $("article p").first().text() ||
        $("main p").first().text()
    ) || fallback.description || null;

  const imageCandidate =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    articleNode?.image?.url ||
    articleNode?.image?.[0]?.url ||
    articleNode?.image?.[0] ||
    articleNode?.image ||
    null;

  const category =
    normalizeCategory(
      stripHtml(
        $('meta[property="article:section"]').attr("content") ||
          $('[rel="category tag"]').first().text() ||
          $('[class*="category"] a,[class*="section"] a,[class*="topic"] a').first().text() ||
          articleNode?.articleSection
      ),
      fallback.category || null
    ) || null;

  const publicationDate =
    toIsoString(
      $('meta[property="article:published_time"]').attr("content") ||
        $('meta[name="publish-date"]').attr("content") ||
        $('meta[itemprop="datePublished"]').attr("content") ||
        $("time[datetime]").first().attr("datetime") ||
        articleNode?.datePublished ||
        articleNode?.dateCreated ||
        articleNode?.dateModified ||
        fallback.publication_date
    ) || null;

  return {
    source: hostnameToSourceName(siteUrl),
    url,
    title: decodeHtmlEntities(title),
    description,
    image_url: resolveUrl(url, imageCandidate),
    publication_date: publicationDate,
    category
  };
}

async function enrichArticleCandidates(siteUrl, candidates, errors) {
  const articles = [];

  for (let index = 0; index < candidates.length; index += 6) {
    const batch = candidates.slice(index, index + 6);
    const results = await Promise.all(
      batch.map(async (candidate) => {
        try {
          const html = await fetchText(candidate.url);
          return extractArticleMetadata(siteUrl, candidate.url, html, candidate);
        } catch (error) {
          errors.push({
            source: hostnameToSourceName(siteUrl),
            url: candidate.url,
            message: error.message
          });

          return candidate.title ? candidate : null;
        }
      })
    );

    articles.push(...results.filter(Boolean));
  }

  return articles;
}

function normalizeGenericArticle(article) {
  if (!article?.title || !article?.url) {
    return null;
  }

  const normalized = {
    source: article.source || "GENERIC",
    url: article.url,
    title: article.title.trim(),
    description: article.description ?? null,
    image_url: article.image_url ?? null,
    publication_date: article.publication_date ?? null,
    category: article.category ?? null
  };

  normalized.dedupe_key = createArticleKey(normalized);

  return normalized;
}

function pickWindowOrFallback(articles, hours, now = new Date()) {
  const normalized = articles.map(normalizeGenericArticle).filter(Boolean);
  const withDates = normalized.filter((article) => article.publication_date);
  const recent = withDates.filter((article) => withinHours(article.publication_date, hours, now));

  if (recent.length > 0) {
    return recent;
  }

  if (withDates.length > 0) {
    return withDates
      .sort((left, right) => right.publication_date.localeCompare(left.publication_date))
      .slice(0, 10);
  }

  return normalized.slice(0, 10);
}

export async function scrapeGenericSite({ siteUrl, hours = 24 }) {
  if (!siteUrl) {
    throw new Error("`siteUrl` is required for the generic scraper.");
  }

  const homepageUrl = new URL(siteUrl).toString();
  const source = hostnameToSourceName(homepageUrl);
  const errors = [];
  const notes = [];

  const homepageHtml = await fetchText(homepageUrl);

  const feedDiscovery = await discoverFeedArticles(homepageUrl, homepageHtml, errors);
  let candidates = feedDiscovery.articles;

  if (candidates.length > 0) {
    notes.push(`Generic scraper discovered articles from feed: ${feedDiscovery.feedUrl}`);
  }

  if (candidates.length === 0) {
    const sitemapUrls = await discoverFromSitemap(homepageUrl, errors);
    candidates = sitemapUrls.map((url) => ({ url }));

    if (sitemapUrls.length > 0) {
      notes.push("Generic scraper discovered article URLs from sitemap.");
    }
  }

  if (candidates.length === 0) {
    const homepageUrls = discoverHomepageArticleUrls(homepageUrl, homepageHtml);
    candidates = homepageUrls.map((url) => ({ url }));

    if (homepageUrls.length > 0) {
      notes.push("Generic scraper discovered repeated article containers from homepage structure.");
    }
  }

  const uniqueCandidates = unique(candidates.map((candidate) => candidate.url))
    .slice(0, MAX_ARTICLE_CANDIDATES)
    .map((url) => candidates.find((candidate) => candidate.url === url));

  const articles = await enrichArticleCandidates(homepageUrl, uniqueCandidates, errors);

  if (articles.length === 0) {
    notes.push("Generic scraper could not confidently extract any articles from this site.");
  }

  return {
    source,
    articles: pickWindowOrFallback(articles, hours),
    errors,
    notes
  };
}
