import { USER_AGENT } from "../config/sites.js";

const DEFAULT_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8"
};

const FETCH_TIMEOUT_MS = 30_000;

export async function fetchText(url, options = {}) {
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
