const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 10000;

type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export function getApiUrl(path: string): string {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(
  path: string,
  init: ApiFetchOptions = {}
): Promise<Response> {
  const url = getApiUrl(path);
  const headers = new Headers(init.headers);
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...requestInit } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    credentials: 'include',
    cache: requestInit.cache ?? 'no-store',
    ...requestInit,
    headers,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}
