import { XMLParser } from "fast-xml-parser";

import { fetchText } from "./http.js";

const RSS_ACCEPT_HEADER = "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseAttributeValue: false
});

function normalizeAtomEntry(entry) {
  return {
    title: entry.title?.["#text"] ?? entry.title ?? null,
    link: entry.link?.["@_href"] ?? entry.link ?? null,
    pubDate: entry.updated ?? entry.published ?? null,
    description: entry.summary?.["#text"] ?? entry.summary ?? entry.content?.["#text"] ?? null,
    category: entry.category?.["@_term"] ?? entry.category ?? null
  };
}

export function parseRssItems(xml) {
  const parsed = xmlParser.parse(xml);

  // Standard RSS 2.0
  const rssItems = parsed?.rss?.channel?.item;
  if (rssItems) {
    return Array.isArray(rssItems) ? rssItems : [rssItems];
  }

  // Atom feed
  const atomEntries = parsed?.feed?.entry;
  if (atomEntries) {
    const entries = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
    return entries.map(normalizeAtomEntry);
  }

  return [];
}

export async function fetchRssPage(feedUrl, pageNumber = 1) {
  const url = pageNumber === 1 ? feedUrl : `${feedUrl}?paged=${pageNumber}`;
  const xml = await fetchText(url, {
    headers: {
      accept: RSS_ACCEPT_HEADER
    }
  });

  return {
    url,
    items: parseRssItems(xml)
  };
}