/**
 * Unit tests for scraping_system/src/lib/scraper.js
 *
 * Run with:  node --test src/test/scraper.test.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chunk,
  createScrapeError,
  pickRecentOrFallback
} from "../src/lib/scraper.js";

// ---------------------------------------------------------------------------
// createScrapeError
// ---------------------------------------------------------------------------

describe("createScrapeError", () => {
  it("creates an error object with source, url, and message", () => {
    const err = createScrapeError("TSA", "https://tsa.dz", new Error("timeout"));
    assert.equal(err.source, "TSA");
    assert.equal(err.url, "https://tsa.dz");
    assert.equal(err.message, "timeout");
  });

  it("extracts message from Error instance", () => {
    const err = createScrapeError("APS", null, new Error("404 Not Found"));
    assert.equal(err.message, "404 Not Found");
  });

  it("converts non-Error to string message", () => {
    const err = createScrapeError("ENNAHAR", null, "Connection refused");
    assert.equal(err.message, "Connection refused");
  });

  it("converts object to string message", () => {
    const err = createScrapeError("WINWIN", null, { code: "ECONNRESET" });
    assert.equal(typeof err.message, "string");
  });

  it("accepts null url", () => {
    const err = createScrapeError("TSA", null, new Error("oops"));
    assert.equal(err.url, null);
  });
});

// ---------------------------------------------------------------------------
// chunk
// ---------------------------------------------------------------------------

describe("chunk", () => {
  it("splits an array into chunks of the given size", () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5, 6], 2), [[1, 2], [3, 4], [5, 6]]);
  });

  it("handles a remainder chunk at the end", () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it("returns the whole array as one chunk when size > length", () => {
    assert.deepEqual(chunk([1, 2, 3], 10), [[1, 2, 3]]);
  });

  it("returns an empty array for empty input", () => {
    assert.deepEqual(chunk([], 3), []);
  });

  it("returns single-element chunks when size is 1", () => {
    assert.deepEqual(chunk([1, 2, 3], 1), [[1], [2], [3]]);
  });

  it("returns one chunk equal to the array when size equals length", () => {
    assert.deepEqual(chunk([1, 2, 3], 3), [[1, 2, 3]]);
  });

  it("throws RangeError for size of 0", () => {
    assert.throws(() => chunk([1, 2], 0), RangeError);
  });

  it("throws RangeError for negative size", () => {
    assert.throws(() => chunk([1, 2], -1), RangeError);
  });

  it("handles arrays of objects", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = chunk(items, 2);
    assert.equal(result.length, 2);
    assert.equal(result[0].length, 2);
    assert.equal(result[1].length, 1);
  });
});

// ---------------------------------------------------------------------------
// pickRecentOrFallback
// ---------------------------------------------------------------------------

describe("pickRecentOrFallback — recent articles", () => {
  const now = new Date("2026-05-14T12:00:00.000Z");

  function makeArticle(hoursAgo, title = "Headline") {
    const date = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    return { title, publication_date: date.toISOString(), url: `https://x.com/${hoursAgo}` };
  }

  it("returns articles within the time window", () => {
    const articles = [
      makeArticle(1, "Recent A"),
      makeArticle(12, "Recent B"),
      makeArticle(30, "Old C")
    ];
    const result = pickRecentOrFallback(articles, 24, { now });
    assert.equal(result.length, 2);
    assert.ok(result.some((a) => a.title === "Recent A"));
    assert.ok(result.some((a) => a.title === "Recent B"));
  });

  it("excludes articles older than the window", () => {
    const articles = [makeArticle(25, "Old")];
    const result = pickRecentOrFallback(articles, 24, { now });
    assert.equal(result.length, 0); // falls through to fallback
  });
});

describe("pickRecentOrFallback — fallback behaviour", () => {
  const farPast = new Date("2020-01-01T00:00:00.000Z");

  function makeOldArticle(daysAgo, title) {
    const date = new Date(farPast.getTime() - daysAgo * 86400_000);
    return { title, publication_date: date.toISOString() };
  }

  it("returns up to fallbackLimit articles when none are recent", () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const articles = Array.from({ length: 15 }, (_, i) =>
      makeOldArticle(i, `Article ${i}`)
    );
    const result = pickRecentOrFallback(articles, 24, { now, fallbackLimit: 10 });
    assert.equal(result.length, 10);
  });

  it("returns articles sorted newest-first in fallback", () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const articles = [
      makeOldArticle(10, "Oldest"),
      makeOldArticle(1, "Newest"),
      makeOldArticle(5, "Middle")
    ];
    const result = pickRecentOrFallback(articles, 24, { now, fallbackLimit: 10 });
    assert.equal(result[0].title, "Newest");
    assert.equal(result[result.length - 1].title, "Oldest");
  });

  it("respects a custom fallbackLimit", () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const articles = Array.from({ length: 20 }, (_, i) => makeOldArticle(i + 30, `A${i}`));
    const result = pickRecentOrFallback(articles, 24, { now, fallbackLimit: 5 });
    assert.equal(result.length, 5);
  });
});

describe("pickRecentOrFallback — null and invalid inputs", () => {
  const now = new Date("2026-05-14T12:00:00.000Z");

  it("filters out null entries", () => {
    const articles = [null, null, { title: "Real", publication_date: now.toISOString() }];
    const result = pickRecentOrFallback(articles, 24, { now });
    assert.ok(result.every((a) => a !== null));
  });

  it("filters out articles with no publication_date", () => {
    const articles = [
      { title: "No date" },
      { title: "Has date", publication_date: now.toISOString() }
    ];
    const result = pickRecentOrFallback(articles, 24, { now });
    assert.ok(result.every((a) => a.publication_date));
  });

  it("returns an empty array for empty input", () => {
    const result = pickRecentOrFallback([], 24, { now });
    assert.deepEqual(result, []);
  });

  it("handles articles with invalid date strings in fallback without crashing", () => {
    const articles = [
      { title: "Bad date", publication_date: "not-a-date" },
      { title: "Good date", publication_date: "2020-01-01T00:00:00.000Z" }
    ];
    // Should not throw
    const result = pickRecentOrFallback(articles, 24, { now });
    assert.ok(Array.isArray(result));
  });
});
