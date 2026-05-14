/**
 * @module http
 *
 * Thin HTTP client used by all scrapers.
 *
 * Features:
 *  - Automatic 30-second timeout via AbortController
 *  - Retry with linear back-off (1 s, 3 s) on transient errors:
 *      429 Too Many Requests, 5xx server errors, AbortError (timeout)
 *  - Shared default headers (User-Agent, Accept, Accept-Language)
 *  - Per-request header overrides
 */

import { USER_AGENT } from "../config/sites.js";

/** Headers sent with every request unless overridden. */
const DEFAULT_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8,ar;q=0.7"
};

/** Abort timeout in milliseconds. */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Back-off delays between retry attempts.
 * First attempt has no delay (0 prefix added at call time).
 */
const RETRY_DELAYS_MS = [1_000, 3_000];

async function fetchOnce(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        ...(options.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }

    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches the text body of a URL with timeout and automatic retry.
 *
 * Retries up to twice (after 1 s and 3 s delays) on:
 *  - `AbortError` (timeout after 30 s)
 *  - HTTP 429, 500, 502, 503, 504
 *
 * Non-retryable errors (e.g. DNS failure, HTTP 404) throw immediately.
 *
 * @param {string} url - The URL to fetch.
 * @param {RequestInit & { headers?: Record<string,string> }} [options={}]
 *   Standard `fetch` options. `headers` are merged on top of the defaults.
 * @returns {Promise<string>} The response body as text.
 * @throws {Error} When all attempts fail.
 */
export async function fetchText(url, options = {}) {
  let lastError;

  for (const delay of [0, ...RETRY_DELAYS_MS]) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await fetchOnce(url, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
