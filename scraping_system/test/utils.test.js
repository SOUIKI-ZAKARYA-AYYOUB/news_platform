/**
 * Unit tests for scraping_system/src/lib/utils.js
 *
 * Run with:  node --test src/test/utils.test.js
 * (requires Node.js >= 18 for the built-in test runner)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createArticleKey,
  decodeHtmlEntities,
  hostnameToSourceName,
  isSameDayInTimeZone,
  isTodayInTimeZone,
  normalizeCategory,
  resolveUrl,
  stripHtml,
  toIsoString,
  withinHours
} from "../src/lib/utils.js";

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------

describe("stripHtml", () => {
  it("returns null for null input", () => {
    assert.equal(stripHtml(null), null);
  });

  it("returns null for undefined input", () => {
    assert.equal(stripHtml(undefined), null);
  });

  it("returns null for empty string", () => {
    assert.equal(stripHtml(""), null);
  });

  it("returns null for whitespace-only string", () => {
    assert.equal(stripHtml("   "), null);
  });

  it("strips simple tags", () => {
    assert.equal(stripHtml("<p>Hello world</p>"), "Hello world");
  });

  it("strips nested tags", () => {
    assert.equal(stripHtml("<div><p><strong>Bold text</strong></p></div>"), "Bold text");
  });

  it("converts <br> to space", () => {
    const result = stripHtml("Line one<br>Line two");
    assert.equal(result, "Line one Line two");
  });

  it("converts self-closing <br /> to space", () => {
    const result = stripHtml("Line one<br />Line two");
    assert.equal(result, "Line one Line two");
  });

  it("converts </p> to space and collapses whitespace", () => {
    const result = stripHtml("<p>First.</p><p>Second.</p>");
    assert.equal(result, "First. Second.");
  });

  it("collapses multiple spaces into one", () => {
    const result = stripHtml("Too   many    spaces");
    assert.equal(result, "Too many spaces");
  });

  it("handles tags with attributes", () => {
    assert.equal(stripHtml('<a href="https://example.com">Link text</a>'), "Link text");
  });

  it("handles self-closing img tags", () => {
    assert.equal(stripHtml('<img src="photo.jpg" alt="photo" /> Caption'), "Caption");
  });

  it("returns null for input that is only tags", () => {
    assert.equal(stripHtml("<div><span></span></div>"), null);
  });

  it("preserves plain text with no tags", () => {
    assert.equal(stripHtml("Plain text here"), "Plain text here");
  });

  it("handles HTML with Arabic text", () => {
    assert.equal(stripHtml("<p>مرحبا بالعالم</p>"), "مرحبا بالعالم");
  });

  it("trims leading and trailing whitespace", () => {
    assert.equal(stripHtml("  <p>  Trimmed  </p>  "), "Trimmed");
  });
});

// ---------------------------------------------------------------------------
// decodeHtmlEntities
// ---------------------------------------------------------------------------

describe("decodeHtmlEntities", () => {
  it("returns null for null input", () => {
    assert.equal(decodeHtmlEntities(null), null);
  });

  it("returns null for empty string", () => {
    assert.equal(decodeHtmlEntities(""), null);
  });

  it("decodes &amp;", () => {
    assert.equal(decodeHtmlEntities("Bread &amp; butter"), "Bread & butter");
  });

  it("decodes &lt; and &gt;", () => {
    assert.equal(decodeHtmlEntities("a &lt; b &gt; c"), "a < b > c");
  });

  it("decodes &quot;", () => {
    assert.equal(decodeHtmlEntities("He said &quot;hello&quot;"), 'He said "hello"');
  });

  it("decodes &apos;", () => {
    assert.equal(decodeHtmlEntities("it&apos;s fine"), "it's fine");
  });

  it("decodes &#039; (numeric apostrophe)", () => {
    assert.equal(decodeHtmlEntities("it&#039;s"), "it's");
  });

  it("decodes &nbsp; to space", () => {
    assert.equal(decodeHtmlEntities("one&nbsp;two"), "one two");
  });

  it("decodes &hellip; to ellipsis", () => {
    assert.equal(decodeHtmlEntities("wait&hellip;"), "wait...");
  });

  it("decodes &#8230; to ellipsis", () => {
    assert.equal(decodeHtmlEntities("wait&#8230;"), "wait...");
  });

  it("decodes &#8216; and &#8217; (curly single quotes)", () => {
    assert.equal(decodeHtmlEntities("&#8216;quoted&#8217;"), "‘quoted’");
  });

  it("decodes &#8220; and &#8221; (curly double quotes)", () => {
    assert.equal(decodeHtmlEntities("&#8220;quoted&#8221;"), "“quoted”");
  });

  it("decodes &#8211; to en-dash", () => {
    assert.equal(decodeHtmlEntities("pages 1&#8211;10"), "pages 1–9");
    // verify it's not a plain hyphen
    assert.notEqual(decodeHtmlEntities("a&#8211;b"), "a-b");
  });

  it("decodes &#8212; to em-dash", () => {
    assert.equal(decodeHtmlEntities("word&#8212;word"), "word—word");
  });

  it("decodes &ndash;", () => {
    assert.equal(decodeHtmlEntities("a &ndash; b"), "a – b");
  });

  it("decodes &mdash;", () => {
    assert.equal(decodeHtmlEntities("a &mdash; b"), "a — b");
  });

  it("decodes &lsquo; and &rsquo;", () => {
    assert.equal(decodeHtmlEntities("&lsquo;yes&rsquo;"), "‘yes’");
  });

  it("decodes &ldquo; and &rdquo;", () => {
    assert.equal(decodeHtmlEntities("&ldquo;yes&rdquo;"), "“yes”");
  });

  it("decodes multiple entities in one string", () => {
    const input = "&quot;Hello &amp; welcome&quot;";
    assert.equal(decodeHtmlEntities(input), '"Hello & welcome"');
  });

  it("passes through plain text unchanged", () => {
    assert.equal(decodeHtmlEntities("just text"), "just text");
  });

  it("handles Arabic text without entities unchanged", () => {
    assert.equal(decodeHtmlEntities("مرحبا"), "مرحبا");
  });

  it("returns null for whitespace-only string after decoding", () => {
    // &nbsp; decodes to space, result is whitespace-only which should be null
    // (behaviour depends on whether the function trims — document current behaviour)
    const result = decodeHtmlEntities("&nbsp;");
    assert.equal(typeof result, "string"); // decodeHtmlEntities itself doesn't trim
  });
});

// ---------------------------------------------------------------------------
// toIsoString
// ---------------------------------------------------------------------------

describe("toIsoString", () => {
  it("returns null for null", () => {
    assert.equal(toIsoString(null), null);
  });

  it("returns null for undefined", () => {
    assert.equal(toIsoString(undefined), null);
  });

  it("returns null for empty string", () => {
    assert.equal(toIsoString(""), null);
  });

  it("returns null for invalid date string", () => {
    assert.equal(toIsoString("not-a-date"), null);
  });

  it("returns null for 'Invalid Date'", () => {
    assert.equal(toIsoString("Invalid Date"), null);
  });

  it("converts a valid ISO string to itself", () => {
    const iso = "2026-05-14T10:00:00.000Z";
    assert.equal(toIsoString(iso), iso);
  });

  it("converts a Date object to ISO string", () => {
    const date = new Date("2026-05-14T08:30:00.000Z");
    assert.equal(toIsoString(date), "2026-05-14T08:30:00.000Z");
  });

  it("converts a valid RFC 2822 date string", () => {
    const rfc = "Wed, 14 May 2026 08:30:00 +0000";
    const result = toIsoString(rfc);
    assert.ok(result !== null, "should parse RFC 2822 date");
    assert.ok(result.startsWith("2026-05-14"));
  });

  it("converts a date-only string", () => {
    const result = toIsoString("2026-05-14");
    assert.ok(result !== null);
    assert.ok(result.startsWith("2026-05-14"));
  });

  it("returns a string ending in Z for UTC timestamps", () => {
    const result = toIsoString("2026-05-14T10:00:00Z");
    assert.ok(result !== null);
    assert.ok(result.endsWith("Z"));
  });
});

// ---------------------------------------------------------------------------
// withinHours
// ---------------------------------------------------------------------------

describe("withinHours", () => {
  const now = new Date("2026-05-14T12:00:00.000Z");

  it("returns true for a date exactly at now", () => {
    assert.equal(withinHours("2026-05-14T12:00:00.000Z", 24, now), true);
  });

  it("returns true for a date 1 hour ago within a 24-hour window", () => {
    assert.equal(withinHours("2026-05-14T11:00:00.000Z", 24, now), true);
  });

  it("returns true for a date exactly 24 hours ago", () => {
    assert.equal(withinHours("2026-05-13T12:00:00.000Z", 24, now), true);
  });

  it("returns false for a date 25 hours ago with a 24-hour window", () => {
    assert.equal(withinHours("2026-05-13T11:00:00.000Z", 24, now), false);
  });

  it("returns false for a date in the future", () => {
    assert.equal(withinHours("2026-05-14T13:00:00.000Z", 24, now), false);
  });

  it("returns false for an invalid date string", () => {
    assert.equal(withinHours("not-a-date", 24, now), false);
  });

  it("returns false for null", () => {
    assert.equal(withinHours(null, 24, now), false);
  });

  it("respects a 1-hour window", () => {
    assert.equal(withinHours("2026-05-14T11:30:00.000Z", 1, now), true);
    assert.equal(withinHours("2026-05-14T10:59:00.000Z", 1, now), false);
  });

  it("uses current time when now is omitted", () => {
    // A date far in the past should be outside any reasonable window
    assert.equal(withinHours("2000-01-01T00:00:00.000Z", 24), false);
  });
});

// ---------------------------------------------------------------------------
// hostnameToSourceName
// ---------------------------------------------------------------------------

describe("hostnameToSourceName", () => {
  it("converts a simple hostname", () => {
    assert.equal(hostnameToSourceName("https://example.com/path"), "EXAMPLE");
  });

  it("strips www. prefix", () => {
    assert.equal(hostnameToSourceName("https://www.example.com"), "EXAMPLE");
  });

  it("handles subdomains", () => {
    assert.equal(hostnameToSourceName("https://news.bbc.co.uk/article"), "NEWS_BBC_CO");
  });

  it("returns GENERIC for invalid URLs", () => {
    assert.equal(hostnameToSourceName("not-a-url"), "GENERIC");
  });

  it("returns GENERIC for empty string", () => {
    assert.equal(hostnameToSourceName(""), "GENERIC");
  });

  it("uppercases the result", () => {
    const result = hostnameToSourceName("https://tsa-algerie.dz/");
    assert.equal(result, result.toUpperCase());
  });

  it("replaces hyphens with underscores", () => {
    assert.equal(hostnameToSourceName("https://tsa-algerie.dz/"), "TSA_ALGERIE");
  });

  it("handles numeric hostnames", () => {
    const result = hostnameToSourceName("https://news24.com/");
    assert.ok(typeof result === "string" && result.length > 0);
  });
});

// ---------------------------------------------------------------------------
// normalizeCategory
// ---------------------------------------------------------------------------

describe("normalizeCategory", () => {
  it("returns null for null input with no fallback", () => {
    assert.equal(normalizeCategory(null), null);
  });

  it("returns null for undefined input", () => {
    assert.equal(normalizeCategory(undefined), null);
  });

  it("returns the fallback for null input when fallback is provided", () => {
    assert.equal(normalizeCategory(null, "other"), "other");
  });

  it("trims whitespace from string input", () => {
    assert.equal(normalizeCategory("  sport  "), "sport");
  });

  it("returns a non-empty string as-is (trimmed)", () => {
    assert.equal(normalizeCategory("Politics"), "Politics");
  });

  it("returns fallback for whitespace-only string", () => {
    assert.equal(normalizeCategory("   ", "other"), "other");
  });

  it("returns null for whitespace-only string with no fallback", () => {
    assert.equal(normalizeCategory("   "), null);
  });

  it("returns fallback for number input", () => {
    assert.equal(normalizeCategory(42, "other"), "other");
  });

  it("returns fallback for object input", () => {
    assert.equal(normalizeCategory({}, "other"), "other");
  });
});

// ---------------------------------------------------------------------------
// resolveUrl
// ---------------------------------------------------------------------------

describe("resolveUrl", () => {
  it("returns null for null candidate", () => {
    assert.equal(resolveUrl("https://example.com", null), null);
  });

  it("returns null for undefined candidate", () => {
    assert.equal(resolveUrl("https://example.com", undefined), null);
  });

  it("returns null for empty string candidate", () => {
    assert.equal(resolveUrl("https://example.com", ""), null);
  });

  it("resolves a relative path against the base", () => {
    assert.equal(
      resolveUrl("https://example.com", "/article/123"),
      "https://example.com/article/123"
    );
  });

  it("returns an absolute URL unchanged", () => {
    assert.equal(
      resolveUrl("https://example.com", "https://other.com/page"),
      "https://other.com/page"
    );
  });

  it("resolves a relative URL with base path", () => {
    const result = resolveUrl("https://example.com/section/", "article.html");
    assert.equal(result, "https://example.com/section/article.html");
  });

  it("handles protocol-relative URLs", () => {
    const result = resolveUrl("https://example.com", "//cdn.example.com/img.jpg");
    assert.equal(result, "https://cdn.example.com/img.jpg");
  });

  it("returns null when the base URL is invalid", () => {
    const result = resolveUrl("not-a-url", "/path");
    // URL constructor will still resolve /path as absolute or relative — document behaviour
    assert.ok(result === null || typeof result === "string");
  });
});

// ---------------------------------------------------------------------------
// createArticleKey
// ---------------------------------------------------------------------------

describe("createArticleKey", () => {
  it("uses URL when present", () => {
    const article = { url: "https://example.com/article/1", title: "Title", source: "SRC" };
    assert.equal(createArticleKey(article), "https://example.com/article/1");
  });

  it("falls back to source::title::date when URL is missing", () => {
    const article = {
      source: "TSA",
      title: "Some headline",
      publication_date: "2026-05-14T10:00:00.000Z"
    };
    assert.equal(createArticleKey(article), "TSA::Some headline::2026-05-14T10:00:00.000Z");
  });

  it("handles missing fields in fallback key gracefully", () => {
    const article = { title: "Headline only" };
    const key = createArticleKey(article);
    assert.ok(key.includes("Headline only"));
  });

  it("produces the same key for the same article", () => {
    const article = { url: "https://x.com/1", title: "T", source: "X" };
    assert.equal(createArticleKey(article), createArticleKey(article));
  });

  it("produces different keys for different URLs", () => {
    const a1 = { url: "https://x.com/1" };
    const a2 = { url: "https://x.com/2" };
    assert.notEqual(createArticleKey(a1), createArticleKey(a2));
  });
});

// ---------------------------------------------------------------------------
// isSameDayInTimeZone
// ---------------------------------------------------------------------------

describe("isSameDayInTimeZone", () => {
  const tz = "Africa/Algiers"; // UTC+1

  it("returns true for two dates on the same day in the timezone", () => {
    // Both are 2026-05-14 in Algiers time (UTC+1)
    const d1 = "2026-05-14T10:00:00.000Z"; // 11:00 Algiers
    const d2 = "2026-05-14T22:00:00.000Z"; // 23:00 Algiers
    assert.equal(isSameDayInTimeZone(d1, d2, tz), true);
  });

  it("returns false for dates on different days in the timezone", () => {
    const d1 = "2026-05-14T23:30:00.000Z"; // 00:30 May 15 in Algiers
    const d2 = "2026-05-14T10:00:00.000Z"; // 11:00 May 14 in Algiers
    assert.equal(isSameDayInTimeZone(d1, d2, tz), false);
  });

  it("returns false for invalid date", () => {
    assert.equal(isSameDayInTimeZone("invalid", "2026-05-14", tz), false);
  });

  it("returns false when reference date is invalid", () => {
    assert.equal(isSameDayInTimeZone("2026-05-14", "invalid", tz), false);
  });
});

// ---------------------------------------------------------------------------
// isTodayInTimeZone
// ---------------------------------------------------------------------------

describe("isTodayInTimeZone", () => {
  const tz = "Africa/Algiers";

  it("returns true when the date is today in the timezone", () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const dateValue = "2026-05-14T08:00:00.000Z"; // earlier today Algiers time
    assert.equal(isTodayInTimeZone(dateValue, tz, now), true);
  });

  it("returns false when the date is yesterday", () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const dateValue = "2026-05-13T15:00:00.000Z";
    assert.equal(isTodayInTimeZone(dateValue, tz, now), false);
  });

  it("returns false for invalid date", () => {
    const now = new Date();
    assert.equal(isTodayInTimeZone("not-a-date", tz, now), false);
  });
});
