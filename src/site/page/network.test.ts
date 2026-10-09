import { installNetworkHooks, isFetchUrl, parseSearchUrl, retryAfterMs, type NetworkCallbacks } from './network';

describe('parseSearchUrl', () => {
  it('recognises search and exchange posts with realm and encoded league', () => {
    expect(parseSearchUrl('https://www.pathofexile.com/api/trade2/search/poe2/Runes%20of%20Aldur')).toEqual({
      type: 'search', realm: 'poe2', league: 'Runes of Aldur',
    });
    expect(parseSearchUrl('/api/trade2/exchange/poe2/Standard')).toEqual({
      type: 'exchange', realm: 'poe2', league: 'Standard',
    });
  });

  it('ignores lookups of an existing search and unrelated endpoints', () => {
    expect(parseSearchUrl('/api/trade2/search/poe2/Standard/H4sIAAAA')).toBeNull();
    expect(parseSearchUrl('/api/trade2/data/stats')).toBeNull();
  });
});

describe('isFetchUrl', () => {
  it('matches listing fetches only', () => {
    expect(isFetchUrl('/api/trade2/fetch/abc,def?query=H4sI&realm=poe2')).toBe(true);
    expect(isFetchUrl('/api/trade2/search/poe2/Standard')).toBe(false);
  });
});

describe('retryAfterMs', () => {
  it('converts seconds and clamps to 1s..10min', () => {
    expect(retryAfterMs('7')).toBe(7000);
    expect(retryAfterMs('0')).toBe(1000);
    expect(retryAfterMs('9999')).toBe(600000);
  });

  it('falls back to 60s for missing or unreadable headers', () => {
    expect(retryAfterMs(null)).toBe(60000);
    expect(retryAfterMs('soon')).toBe(60000);
  });
});

const SEARCH = 'https://www.pathofexile.com/api/trade2/search/poe2/Standard';
const FETCH = 'https://www.pathofexile.com/api/trade2/fetch/a,b?query=X';

class StubXhr {
  status = 0;
  responseText = '';
  headers: Record<string, string> = {};
  listeners: (() => void)[] = [];
  open(_method: string, _url: string): void {}
  send(_body?: unknown): void {}
  addEventListener(_type: 'load', fn: () => void): void { this.listeners.push(fn); }
  getResponseHeader(name: string): string | null { return this.headers[name] ?? null; }
  respond(status: number, text: string, headers: Record<string, string> = {}): void {
    this.status = status;
    this.responseText = text;
    this.headers = headers;
    this.listeners.forEach((fn) => fn());
  }
}

function setup(response?: { body: string; status: number; headers?: Record<string, string> }) {
  const callbacks = { onSearch: vi.fn(), onListings: vi.fn(), onRateLimited: vi.fn() } satisfies NetworkCallbacks;
  const fetch = vi.fn(async (..._args: unknown[]) =>
    new Response(response?.body ?? '', { status: response?.status ?? 200, headers: response?.headers }));
  class Xhr extends StubXhr {}
  const win = { fetch, XMLHttpRequest: Xhr };
  installNetworkHooks(win as never, callbacks);
  return { win, fetch, callbacks, Xhr };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('installNetworkHooks', () => {
  it('captures an XHR search', () => {
    const { Xhr, callbacks } = setup();
    const xhr = new Xhr();
    xhr.open('POST', SEARCH);
    xhr.send('{"query":{}}');
    xhr.respond(200, '{"id":"abc","result":[]}');
    expect(callbacks.onSearch).toHaveBeenCalledWith({
      type: 'search', realm: 'poe2', league: 'Standard',
      request: { query: {} }, response: { id: 'abc', result: [] },
    });
  });

  it('reports listings from fetch', async () => {
    const { win, callbacks } = setup({ body: '{"result":[{"id":"x"},null]}', status: 200 });
    await win.fetch(FETCH);
    await flush();
    expect(callbacks.onListings).toHaveBeenCalledWith([{ id: 'x' }]);
  });

  it('reads the body of a Request object without changing the call', async () => {
    const { win, fetch, callbacks } = setup({ body: '{"id":"abc"}', status: 200 });
    const request = new Request(SEARCH, { method: 'POST', body: '{"query":{"q":1}}' });
    await win.fetch(request);
    await flush();
    expect(fetch).toHaveBeenCalledWith(request, undefined);
    expect(callbacks.onSearch).toHaveBeenCalledWith(expect.objectContaining({ request: { query: { q: 1 } } }));
  });

  it('reports a fetch 429 with Retry-After', async () => {
    const { win, callbacks } = setup({ body: '', status: 429, headers: { 'Retry-After': '7' } });
    await win.fetch(FETCH);
    expect(callbacks.onRateLimited).toHaveBeenCalledWith(7000);
  });

  it('reports an XHR 429 without header as 60s', () => {
    const { Xhr, callbacks } = setup();
    const xhr = new Xhr();
    xhr.open('POST', SEARCH);
    xhr.send('{}');
    xhr.respond(429, '');
    expect(callbacks.onRateLimited).toHaveBeenCalledWith(60000);
  });

  it('stays silent on broken JSON and server errors', async () => {
    const { win, Xhr, callbacks } = setup({ body: '<html>', status: 200 });
    await expect(win.fetch(FETCH)).resolves.toBeInstanceOf(Response);
    const xhr = new Xhr();
    xhr.open('POST', SEARCH);
    xhr.send('{}');
    xhr.respond(200, 'not json');
    const failed = new Xhr();
    failed.open('POST', SEARCH);
    failed.send('{}');
    failed.respond(500, '{"id":"abc"}');
    await flush();
    expect(callbacks.onSearch).not.toHaveBeenCalled();
    expect(callbacks.onListings).not.toHaveBeenCalled();
    expect(callbacks.onRateLimited).not.toHaveBeenCalled();
  });
});
