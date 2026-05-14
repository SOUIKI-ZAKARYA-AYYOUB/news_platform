/**
 * Unit tests for scraping_system/src/lib/cache.js
 *
 * Run with:  node --test src/test/cache.test.js
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { LruCache, cachedFetch, getRunCache } from "../src/lib/cache.js";

// ---------------------------------------------------------------------------
// LruCache — basic get/set
// ---------------------------------------------------------------------------

describe("LruCache — get and set", () => {
  let cache;

  beforeEach(() => {
    cache = new LruCache({ maxEntries: 5, ttlMs: 60_000 });
  });

  it("returns undefined for a missing key", () => {
    assert.equal(cache.get("missing"), undefined);
  });

  it("stores and retrieves a value", () => {
    cache.set("key1", "value1");
    assert.equal(cache.get("key1"), "value1");
  });

  it("stores and retrieves an object value", () => {
    const obj = { a: 1, b: [2, 3] };
    cache.set("obj", obj);
    assert.deepEqual(cache.get("obj"), obj);
  });

  it("stores null as a value (null is a valid cached value)", () => {
    // Note: get() returns undefined for missing, so null is distinguishable
    cache.set("nullkey", null);
    // LruCache stores null; get returns null (not undefined)
    const result = cache.get("nullkey");
    assert.equal(result, null);
  });

  it("overwrites an existing key", () => {
    cache.set("k", "first");
    cache.set("k", "second");
    assert.equal(cache.get("k"), "second");
  });

  it("size increments on set", () => {
    assert.equal(cache.size, 0);
    cache.set("a", 1);
    assert.equal(cache.size, 1);
    cache.set("b", 2);
    assert.equal(cache.size, 2);
  });

  it("size does not increment when overwriting an existing key", () => {
    cache.set("a", 1);
    cache.set("a", 2);
    assert.equal(cache.size, 1);
  });
});

// ---------------------------------------------------------------------------
// LruCache — TTL expiry
// ---------------------------------------------------------------------------

describe("LruCache — TTL expiry", () => {
  it("returns undefined for an expired entry", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 50 }); // 50 ms TTL
    cache.set("key", "value");
    assert.equal(cache.get("key"), "value");

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(cache.get("key"), undefined);
  });

  it("does not expire a non-expired entry", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 500 });
    cache.set("key", "value");
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(cache.get("key"), "value");
  });

  it("purgeExpired removes only expired entries", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 50 });
    cache.set("expired", "v1");
    await new Promise((resolve) => setTimeout(resolve, 60));
    cache.set("fresh", "v2"); // added after expiry
    cache.purgeExpired();
    assert.equal(cache.size, 1);
    assert.equal(cache.get("fresh"), "v2");
  });
});

// ---------------------------------------------------------------------------
// LruCache — LRU eviction
// ---------------------------------------------------------------------------

describe("LruCache — LRU eviction", () => {
  it("evicts the least-recently-used entry when full", () => {
    const cache = new LruCache({ maxEntries: 3, ttlMs: 60_000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    // Access "a" to make it recently used
    cache.get("a");
    // Now add "d" — should evict "b" (oldest unaccessed)
    cache.set("d", 4);
    assert.equal(cache.get("b"), undefined); // evicted
    assert.equal(cache.get("a"), 1);         // still present
    assert.equal(cache.get("c"), 3);         // still present
    assert.equal(cache.get("d"), 4);         // present
  });

  it("never exceeds maxEntries", () => {
    const cache = new LruCache({ maxEntries: 4, ttlMs: 60_000 });
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, i);
    }
    assert.equal(cache.size, 4);
  });

  it("refreshes position on get (moves to MRU)", () => {
    const cache = new LruCache({ maxEntries: 2, ttlMs: 60_000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // refresh "a"
    cache.set("c", 3); // should evict "b", not "a"
    assert.equal(cache.get("a"), 1);
    assert.equal(cache.get("b"), undefined);
    assert.equal(cache.get("c"), 3);
  });
});

// ---------------------------------------------------------------------------
// LruCache — has / delete / clear
// ---------------------------------------------------------------------------

describe("LruCache — has, delete, clear", () => {
  let cache;

  beforeEach(() => {
    cache = new LruCache({ maxEntries: 10, ttlMs: 60_000 });
  });

  it("has() returns false for a missing key", () => {
    assert.equal(cache.has("missing"), false);
  });

  it("has() returns true for a present key", () => {
    cache.set("k", "v");
    assert.equal(cache.has("k"), true);
  });

  it("has() returns false after TTL expiry", async () => {
    const shortCache = new LruCache({ maxEntries: 5, ttlMs: 30 });
    shortCache.set("k", "v");
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(shortCache.has("k"), false);
  });

  it("delete() removes an entry", () => {
    cache.set("k", "v");
    cache.delete("k");
    assert.equal(cache.get("k"), undefined);
    assert.equal(cache.size, 0);
  });

  it("delete() returns true when entry existed", () => {
    cache.set("k", "v");
    assert.equal(cache.delete("k"), true);
  });

  it("delete() returns false when entry did not exist", () => {
    assert.equal(cache.delete("nonexistent"), false);
  });

  it("clear() removes all entries", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.clear();
    assert.equal(cache.size, 0);
    assert.equal(cache.get("a"), undefined);
  });
});

// ---------------------------------------------------------------------------
// LruCache — stats
// ---------------------------------------------------------------------------

describe("LruCache — stats", () => {
  it("returns correct size, maxEntries, and ttlMs", () => {
    const cache = new LruCache({ maxEntries: 20, ttlMs: 120_000 });
    cache.set("x", 1);
    const s = cache.stats();
    assert.equal(s.size, 1);
    assert.equal(s.maxEntries, 20);
    assert.equal(s.ttlMs, 120_000);
  });
});

// ---------------------------------------------------------------------------
// cachedFetch
// ---------------------------------------------------------------------------

describe("cachedFetch", () => {
  it("calls fetchFn on first access", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 60_000 });
    let callCount = 0;
    const fetchFn = async (url) => {
      callCount++;
      return `body of ${url}`;
    };

    const result = await cachedFetch(fetchFn, "https://example.com/page", {}, cache);
    assert.equal(result, "body of https://example.com/page");
    assert.equal(callCount, 1);
  });

  it("returns cached result on second access without calling fetchFn", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 60_000 });
    let callCount = 0;
    const fetchFn = async () => {
      callCount++;
      return "response";
    };

    await cachedFetch(fetchFn, "https://example.com/page", {}, cache);
    await cachedFetch(fetchFn, "https://example.com/page", {}, cache);
    assert.equal(callCount, 1);
  });

  it("calls fetchFn separately for different URLs", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 60_000 });
    const calls = [];
    const fetchFn = async (url) => {
      calls.push(url);
      return `response for ${url}`;
    };

    await cachedFetch(fetchFn, "https://example.com/a", {}, cache);
    await cachedFetch(fetchFn, "https://example.com/b", {}, cache);
    assert.equal(calls.length, 2);
  });

  it("propagates fetchFn errors without caching them", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 60_000 });
    let callCount = 0;
    const fetchFn = async () => {
      callCount++;
      throw new Error("Network failure");
    };

    await assert.rejects(() => cachedFetch(fetchFn, "https://example.com", {}, cache));
    // Second call should also call fetchFn (error was not cached)
    await assert.rejects(() => cachedFetch(fetchFn, "https://example.com", {}, cache));
    assert.equal(callCount, 2);
  });

  it("uses different cache keys for different request bodies", async () => {
    const cache = new LruCache({ maxEntries: 10, ttlMs: 60_000 });
    const calls = [];
    const fetchFn = async (url, opts) => {
      calls.push(opts?.body ?? "none");
      return "ok";
    };

    await cachedFetch(fetchFn, "https://x.com", { method: "POST", body: "a=1" }, cache);
    await cachedFetch(fetchFn, "https://x.com", { method: "POST", body: "a=2" }, cache);
    assert.equal(calls.length, 2);
  });
});

// ---------------------------------------------------------------------------
// getRunCache — shared singleton
// ---------------------------------------------------------------------------

describe("getRunCache", () => {
  it("returns the same instance on repeated calls", () => {
    const c1 = getRunCache();
    const c2 = getRunCache();
    assert.equal(c1, c2);
  });

  it("shared cache instance is an LruCache", () => {
    const c = getRunCache();
    assert.ok(c instanceof LruCache);
  });
});
