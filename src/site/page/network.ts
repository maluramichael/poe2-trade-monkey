import type { CapturedSearch } from '../bridge/protocol';
import type { FetchResult } from '../tradeTypes';

/** Matches the site's own API calls. Realm segment is optional, league is URL-encoded. */
const SEARCH_URL = /\/api\/trade2\/(search|exchange)\/(?:(poe2|xbox|sony)\/)?([^/?#]+)\/?(?:[?#]|$)/;
const FETCH_URL = /\/api\/trade2\/fetch\//;

export function parseSearchUrl(url: string): Pick<CapturedSearch, 'type' | 'realm' | 'league'> | null {
  const match = SEARCH_URL.exec(url);
  if (!match) return null;
  return {
    type: match[1] as CapturedSearch['type'],
    realm: match[2] ?? 'poe2',
    league: decodeURIComponent(match[3]!),
  };
}

export function isFetchUrl(url: string): boolean {
  return FETCH_URL.test(url);
}

export interface NetworkCallbacks {
  onSearch(captured: CapturedSearch): void;
  onListings(results: FetchResult[]): void;
  onRateLimited(retryAfterMs: number): void;
}

/** Retry-After seconds as ms, 60s when missing or unreadable, clamped to 1s..10min. */
export function retryAfterMs(header: string | null): number {
  const seconds = header === null || header.trim() === '' ? NaN : Number(header);
  if (!Number.isFinite(seconds)) return 60000;
  return Math.min(600000, Math.max(1000, seconds * 1000));
}

/**
 * Observes the site's traffic without changing it. The site sends searches via XHR and loads
 * listings via fetch (verified 2026-10-05); both are hooked so a switch on their side is harmless.
 */
export function installNetworkHooks(win: Window & typeof globalThis, callbacks: NetworkCallbacks): void {
  hookXhr(win, callbacks);
  hookFetch(win, callbacks);
}

function handleSearch(url: string, body: unknown, responseText: string, callbacks: NetworkCallbacks): void {
  const target = parseSearchUrl(url);
  if (!target || typeof body !== 'string') return;
  try {
    const response = JSON.parse(responseText);
    if (!response || typeof response.id !== 'string') return;
    callbacks.onSearch({ ...target, request: JSON.parse(body), response });
  } catch {
    // Not JSON (error page, rate limit): nothing to capture.
  }
}

function handleListings(json: unknown, callbacks: NetworkCallbacks): void {
  const results = (json as { result?: unknown })?.result;
  if (Array.isArray(results)) callbacks.onListings(results.filter(Boolean) as FetchResult[]);
}

function hookXhr(win: Window & typeof globalThis, callbacks: NetworkCallbacks): void {
  const proto = win.XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  const urls = new WeakMap<XMLHttpRequest, string>();

  proto.open = function (this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest['open']>) {
    urls.set(this, String(args[1]));
    return originalOpen.apply(this, args as never);
  } as XMLHttpRequest['open'];

  proto.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const url = urls.get(this) ?? '';
    if (parseSearchUrl(url) || isFetchUrl(url)) {
      this.addEventListener('load', () => {
        if (this.status === 429) callbacks.onRateLimited(retryAfterMs(this.getResponseHeader('Retry-After')));
      });
    }
    if (parseSearchUrl(url)) {
      this.addEventListener('load', () => {
        if (this.status === 200) handleSearch(url, body, this.responseText, callbacks);
      });
    } else if (isFetchUrl(url)) {
      this.addEventListener('load', () => {
        if (this.status !== 200) return;
        try {
          handleListings(JSON.parse(this.responseText), callbacks);
        } catch {
          // ignore
        }
      });
    }
    return originalSend.call(this, body);
  };
}

function hookFetch(win: Window & typeof globalThis, callbacks: NetworkCallbacks): void {
  const originalFetch = win.fetch;
  win.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // Clone before sending, the original Request body is consumed by the call. A body that is
    // already used makes clone() throw; then we only lose the capture, never the site's request.
    let requestBody: Promise<unknown> = Promise.resolve(init?.body);
    if (init?.body === undefined && typeof input === 'object' && 'clone' in input && parseSearchUrl(url)) {
      try {
        requestBody = input.clone().text().catch(() => undefined);
      } catch {
        requestBody = Promise.resolve(undefined);
      }
    }
    const response = await originalFetch.call(win, input, init);
    if (response.status === 429 && (isFetchUrl(url) || parseSearchUrl(url))) {
      callbacks.onRateLimited(retryAfterMs(response.headers.get('Retry-After')));
    }
    if (response.ok && (isFetchUrl(url) || parseSearchUrl(url))) {
      Promise.all([response.clone().text(), requestBody])
        .then(([text, body]) => {
          if (isFetchUrl(url)) handleListings(JSON.parse(text), callbacks);
          else handleSearch(url, body, text, callbacks);
        })
        .catch(() => {});
    }
    return response;
  };
}
