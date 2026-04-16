import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

import { WINWIN_FEED_URL, WINWIN_GOOGLE_NEWS_URL } from "../config/sites.js";
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

const CATEGORY_MAP = {
  "كرة القدم": "Football",
  "كرة قدم": "Football",
  "الأخبار": "Football",
  "أخبار": "Football",
  "التنس": "Tennis",
  "تنس": "Tennis",
  "كرة السلة": "Basketball",
  "سلة": "Basketball",
  "رياضات ميكانيكية": "Motorsport",
  "رياضات أخرى": "Other Sports"
};

function normalizeWinwinCategory(rawCategory) {
  const category = normalizeCategory(rawCategory, "Football") || "Football";

  if (CATEGORY_MAP[category]) {
    return CATEGORY_MAP[category];
  }

  for (const [arabic, english] of Object.entries(CATEGORY_MAP)) {
    if (category.includes(arabic) || arabic.includes(category)) {
      return english;
    }
  }

  if (["دوري", "كأس", "منتخب", "مباراة", "لاعب", "هدف"].some((keyword) => category.includes(keyword))) {
    return "Football";
  }

  if (["تنس", "راكيت"].some((keyword) => category.includes(keyword))) {
    return "Tennis";
  }

  if (category.includes("سلة")) {
    return "Basketball";
  }

  if (["فورمولا", "سيارات", "رالي"].some((keyword) => category.includes(keyword))) {
    return "Motorsport";
  }

  return "Football";
}

function categoryFromUrl(articleUrl) {
  try {
    const pathname = new URL(articleUrl).pathname;
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length <= 1) {
      return "Football";
    }

    return decodeURIComponent(segments[0]);
  } catch {
    return "Football";
  }
}

function parseGoogleNews(xml) {
  const parsed = xmlParser.parse(xml);
  const urls = parsed?.urlset?.url ?? [];
  const list = Array.isArray(urls) ? urls : [urls];

  return list
    .map((item) => {
      const articleUrl = item?.loc ?? null;
      const news = item?.["news:news"] ?? null;
      const publicationDate = toIsoString(news?.["news:publication_date"] ?? null);
      const title = decodeHtmlEntities(news?.["news:title"] ?? null);

      if (!articleUrl || !title || !publicationDate) {
        return null;
      }

      return {
        url: articleUrl,
        title,
        publicationDate,
        category: normalizeWinwinCategory(categoryFromUrl(articleUrl))
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.publicationDate.localeCompare(left.publicationDate));
}

function parseFeed(xml) {
  const parsed = xmlParser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? [];
  const list = Array.isArray(items) ? items : [items];

  return list
    .map((item) => {
      const publicationDate = toIsoString(item?.pubDate ?? null);
      const category = Array.isArray(item?.category) ? item.category[0] : item?.category;
      const mediaContent = item?.["media:content"];
      const imageFromMedia = Array.isArray(mediaContent)
        ? mediaContent[0]?.["@_url"]
        : mediaContent?.["@_url"];

      return {
        url: item?.link ?? null,
        title: decodeHtmlEntities(item?.title ?? null),
        publicationDate,
        category: normalizeWinwinCategory(category ?? categoryFromUrl(item?.link ?? "")),
        description:
          stripHtml(item?.["content:encoded"] ?? item?.description ?? null) ||
          stripHtml(item?.["media:content"]?.["media:description"] ?? null),
        imageUrl: resolveUrl("https://www.winwin.com", imageFromMedia ?? item?.enclosure?.["@_url"] ?? null)
      };
    })
    .filter((entry) => entry.url && entry.title && entry.publicationDate)
    .sort((left, right) => right.publicationDate.localeCompare(left.publicationDate));
}

function pickEntriesForWindowOrFallback(entries, hours, now = new Date()) {
  const recent = entries.filter((entry) => withinHours(entry.publicationDate, hours, now));

  if (recent.length > 0) {
    return recent.slice(0, 40);
  }

  return entries.slice(0, 15);
}

async function enrichEntry(entry, errors) {
  try {
    const html = await fetchText(entry.url);
    const $ = cheerio.load(html);

    const description =
      stripHtml(
        $('meta[property="og:description"]').attr("content") ||
          $('meta[name="description"]').attr("content") ||
          $('article p').first().text()
      ) || entry.description || null;

    const imageUrl =
      resolveUrl(
        "https://www.winwin.com",
        $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content")
      ) || entry.imageUrl || null;

    const pageCategory =
      $(
        '[class*="tag"] a, [class*="category"] a, [class*="breadcrumb"] a, meta[property="article:section"]'
      )
        .first()
        .text()
        .trim() || $('meta[property="article:section"]').attr("content") || entry.category;

    return {
      ...entry,
      description,
      imageUrl,
      category: normalizeWinwinCategory(pageCategory)
    };
  } catch (error) {
    errors.push({
      source: "WINWIN",
      url: entry.url,
      message: error.message
    });

    return {
      ...entry,
      description: entry.description ?? null,
      imageUrl: entry.imageUrl ?? null
    };
  }
}

function normalizeWinwinArticle(entry) {
  if (!entry?.title || !entry?.url || !entry?.publicationDate) {
    return null;
  }

  const normalized = {
    source: "WINWIN",
    url: entry.url,
    title: entry.title?.trim() || null,
    description: entry.description ?? null,
    image_url: entry.imageUrl ?? null,
    publication_date: entry.publicationDate,
    category: entry.category ?? "Football"
  };

  normalized.dedupe_key = createArticleKey(normalized);
  return normalized.title ? normalized : null;
}

export async function scrapeWinwin({ hours = 24 } = {}) {
  const errors = [];
  const now = new Date();
  let entries = [];

  try {
    const googleNewsXml = await fetchText(WINWIN_GOOGLE_NEWS_URL, {
      headers: {
        accept: "application/xml,text/xml;q=0.9,*/*;q=0.8"
      }
    });
    entries = parseGoogleNews(googleNewsXml);
  } catch (error) {
    errors.push({
      source: "WINWIN",
      url: WINWIN_GOOGLE_NEWS_URL,
      message: error.message
    });
  }

  if (entries.length === 0) {
    try {
      const feedXml = await fetchText(WINWIN_FEED_URL, {
        headers: {
          accept: "application/rss+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7"
        }
      });
      entries = parseFeed(feedXml);
    } catch (error) {
      errors.push({
        source: "WINWIN",
        url: WINWIN_FEED_URL,
        message: error.message
      });
    }
  }

  const selected = pickEntriesForWindowOrFallback(entries, hours, now);
  const enriched = [];

  for (let index = 0; index < selected.length; index += 8) {
    const batch = selected.slice(index, index + 8);
    const batchResults = await Promise.all(batch.map((entry) => enrichEntry(entry, errors)));
    enriched.push(...batchResults);
  }

  return {
    source: "WINWIN",
    articles: enriched.map((entry) => normalizeWinwinArticle(entry)).filter(Boolean),
    errors,
    notes: [
      "WinWin articles are discovered from Google News sitemap (RSS fallback) and filtered by requested hours with latest-item fallback."
    ]
  };
}