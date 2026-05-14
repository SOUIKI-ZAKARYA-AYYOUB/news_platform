import { USER_AGENT } from "../config/sites.js";

const DEFAULT_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8"
};

const FETCH_TIMEOUT_MS = 30_000;
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
