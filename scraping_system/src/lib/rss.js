import { XMLParser } from "fast-xml-parser";

import { fetchText } from "./http.js";

const RSS_ACCEPT_HEADER = "application/rss+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

export function parseRssItems(xml) {
  const parsed = xmlParser.parse(xml);
  const items = parsed?.rss?.channel?.item;

  if (!items) {
    return [];
  }

  return Array.isArray(items) ? items : [items];
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