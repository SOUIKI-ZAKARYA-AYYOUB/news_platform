import { APS_ARCHIVE_URL, APS_BASE_URL } from "../config/sites.js";
import { fetchText } from "../lib/http.js";
import {
  createArticleKey,
  normalizeCategory,
  resolveUrl,
  stripHtml,
  toIsoString,
  withinHours
} from "../lib/utils.js";

function extractJsonArrayAfterMarker(html, marker) {
  const markerIndex = html.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }

  const arrayStart = html.indexOf("[", markerIndex);

  if (arrayStart === -1) {
    throw new Error(`Array start not found after marker: ${marker}`);
  }

  let depth = 0;

  for (let index = arrayStart; index < html.length; index += 1) {
    const character = html[index];

    if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        return parseEmbeddedJsonArray(html.slice(arrayStart, index + 1));
      }
    }
  }

  throw new Error(`Array end not found after marker: ${marker}`);
}

function parseEmbeddedJsonArray(value) {
  return JSON.parse(value.replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
}

function extractArchiveCategories(html) {
  return extractJsonArrayAfterMarker(html, "Header Successfully fetched");
}

function extractArticlesPayload(html) {
  const countMatch = html.match(/\\?"count\\?":(\d+),\\?"pageSize\\?":(\d+),\\?"envConfig\\?":/);
  const countIndex = html.search(/\\?"count\\?":\d+,\\?"pageSize\\?":\d+,\\?"envConfig\\?":/);

  if (!countMatch || countIndex === -1) {
    throw new Error("Unable to extract APS category articles.");
  }

  const articlesMarkerIndex = Math.max(
    html.lastIndexOf('\\"articles\\":', countIndex),
    html.lastIndexOf('"articles":', countIndex)
  );

  if (articlesMarkerIndex === -1) {
    throw new Error("Unable to locate APS article array.");
  }

  const arrayStart = html.indexOf("[", articlesMarkerIndex);

  if (arrayStart === -1) {
    throw new Error("Unable to locate APS article array start.");
  }

  let depth = 0;
  let arrayEnd = -1;

  for (let index = arrayStart; index < html.length; index += 1) {
    const character = html[index];

    if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        arrayEnd = index;
        break;
      }
    }
  }

  if (arrayEnd === -1) {
    throw new Error("Unable to locate APS article array end.");
  }

  return {
    articles: parseEmbeddedJsonArray(html.slice(arrayStart, arrayEnd + 1)),
    count: Number.parseInt(countMatch[1], 10),
    pageSize: Number.parseInt(countMatch[2], 10)
  };
}

function mapArchiveRoute(categoryAlias, subCategoryAlias = null) {
  if (categoryAlias === "presidence-news") {
    return `${APS_BASE_URL}/fr/presidence-news`;
  }

  if (subCategoryAlias) {
    return `${APS_BASE_URL}/fr/${categoryAlias}/${subCategoryAlias}`;
  }

  return `${APS_BASE_URL}/fr/${categoryAlias}`;
}

function normalizeApsArticle(article, fallbackCategory, cutoffHours) {
  const publicationDate = toIsoString(article.publish_date);

  if (!publicationDate || !withinHours(publicationDate, cutoffHours)) {
    return null;
  }

  const url = resolveUrl(`${APS_BASE_URL}/fr/`, article.alias);
  const imageUrl = article.image?.url
    ? resolveUrl(`${APS_BASE_URL}/fr/assets/`, article.image.url)
    : null;

  const normalized = {
    source: "APS",
    url,
    title: article.title?.trim() || null,
    description: stripHtml(article.introtext),
    image_url: imageUrl,
    publication_date: publicationDate,
    category: normalizeCategory(fallbackCategory),
    raw_category: fallbackCategory,
    dedupe_key: createArticleKey({
      source: "APS",
      url,
      title: article.title?.trim() || null,
      publication_date: publicationDate
    })
  };

  return normalized.title ? normalized : null;
}

async function scrapeSection(routeUrl, categoryLabel, cutoffHours, errors) {
  try {
    const html = await fetchText(routeUrl);
    const { articles, count, pageSize } = extractArticlesPayload(html);

    return {
      articles: articles
        .map((article) => normalizeApsArticle(article, categoryLabel, cutoffHours))
        .filter(Boolean),
      meta: { routeUrl, count, pageSize }
    };
  } catch (error) {
    errors.push({
      source: "APS",
      url: routeUrl,
      message: error.message
    });

    return {
      articles: [],
      meta: { routeUrl, count: 0, pageSize: 0 }
    };
  }
}

export async function scrapeAps({ hours }) {
  const errors = [];
  const archiveHtml = await fetchText(APS_ARCHIVE_URL);
  const categories = extractArchiveCategories(archiveHtml);
  const seenRoutes = new Set();
  const results = [];

  for (const category of categories) {
    const topLevelCategory = category.name;

    if (category.alias === "presidence-news") {
      const topLevelUrl = mapArchiveRoute(category.alias);

      if (!seenRoutes.has(topLevelUrl)) {
        seenRoutes.add(topLevelUrl);
        results.push(scrapeSection(topLevelUrl, topLevelCategory, hours, errors));
      }
    }

    for (const subCategory of category.subCategorie ?? []) {
      const routeUrl = mapArchiveRoute(category.alias, subCategory.alias);

      if (seenRoutes.has(routeUrl)) {
        continue;
      }

      seenRoutes.add(routeUrl);
      results.push(scrapeSection(routeUrl, `${topLevelCategory} / ${subCategory.name}`, hours, errors));
    }
  }

  const settled = await Promise.all(results);
  const articles = settled.flatMap((entry) => entry.articles);

  return {
    source: "APS",
    articles,
    errors,
    notes: [
      "APS uses a private pagination action; this scraper crawls all discoverable public sections and subsections."
    ]
  };
}
