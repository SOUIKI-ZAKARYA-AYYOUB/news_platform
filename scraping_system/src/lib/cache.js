/**
 * In-memory LRU cache for HTTP text responses.
 *
 * Prevents redundant fetches when multiple scrapers or enrichment batches
 * request the same URL within a single run.
 */

const DEFAULT_MAX_ENTRIES = 256;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class LruCache {
  #maxEntries;
  #ttlMs;
  #store; // Map preserves insertion order — oldest entries first

  constructor({ maxEntries = DEFAULT_MAX_ENTRIES, ttlMs = DEFAULT_TTL_MS } = {}) {
    this.#maxEntries = maxEntries;
    this.#ttlMs = ttlMs;
    this.#store = new Map();
  }

  get size() {
    return this.#store.size;
  }

  get(key) {
    const entry = this.#store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() - entry.timestamp > this.#ttlMs) {
      this.#store.delete(key);
      return undefined;
    }

    // Refresh position (move to end = most recently used)
    this.#store.delete(key);
    this.#store.set(key, entry);

    return entry.value;
  }

  set(key, value) {
    if (this.#store.has(key)) {
      this.#store.delete(key);
    } else if (this.#store.size >= this.#maxEntries) {
      // Evict the oldest (first) entry
      const firstKey = this.#store.keys().next().value;
      this.#store.delete(firstKey);
    }

    this.#store.set(key, { value, timestamp: Date.now() });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    return this.#store.delete(key);
  }

  clear() {
    this.#store.clear();
  }

  /** Remove all entries whose TTL has expired. */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.#store.entries()) {
      if (now - entry.timestamp > this.#ttlMs) {
        this.#store.delete(key);
      }
    }
  }

  stats() {
    return {
      size: this.#store.size,
      maxEntries: this.#maxEntries,
      ttlMs: this.#ttlMs
    };
  }
}

// Shared run-scoped cache — one instance reused across all scrapers in a process.
const runCache = new LruCache();

/**
 * Wrap `fetchText` with caching. Returns the cached response if available,
 * otherwise fetches and stores the result.
 *
 * @param {(url: string, options?: object) => Promise<string>} fetchFn
 * @param {string} url
 * @param {object} [options]
 * @param {LruCache} [cache]
 */
export async function cachedFetch(fetchFn, url, options = {}, cache = runCache) {
  const cacheKey = buildCacheKey(url, options);
  const cached = cache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const result = await fetchFn(url, options);
  cache.set(cacheKey, result);
  return result;
}

function buildCacheKey(url, options) {
  const method = (options.method ?? "GET").toUpperCase();
  const body = options.body ? `:${String(options.body)}` : "";
  return `${method}:${url}${body}`;
}

/**
 * Returns the shared run-scoped cache instance.
 * Useful for inspecting hit/miss stats or clearing between test runs.
 */
export function getRunCache() {
  return runCache;
}
