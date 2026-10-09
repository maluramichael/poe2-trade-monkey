import { log } from '../../core/log';
import type { KeyValueStorage } from '../../core/storage';

/** Value of one unit in divine, by trade currency id. poe.ninja uses the same ids as the trade site. */
export type Rates = Map<string, number>;
export type HttpGetJson = (url: string) => Promise<unknown>;

export const NINJA_URL = 'https://poe.ninja/poe2/api/economy/exchange/current/overview';
const TTL_MS = 60 * 60 * 1000;

/**
 * Reads the poe.ninja currency overview (verified 2026-10-05): `lines[].primaryValue` is the price
 * in the primary currency (divine). Unknown leagues answer 200 with empty `lines`.
 */
export function parseRates(json: unknown): Rates {
  const lines = (json as { lines?: unknown } | null)?.lines;
  const rates: Rates = new Map();
  if (!Array.isArray(lines)) return rates;
  const valid = lines.filter(
    (line): line is { id: string; primaryValue: number } =>
      typeof line?.id === 'string' && typeof line.primaryValue === 'number' && line.primaryValue > 0,
  );
  const divine = valid.find((line) => line.id === 'divine')?.primaryValue;
  if (!divine) return rates;
  for (const line of valid) rates.set(line.id, line.primaryValue / divine);
  return rates;
}

/** poe.ninja rates per league, cached in storage for an hour. Failures fall back to expired rates, else empty rates. */
export class RateSource {
  readonly #inFlight = new Map<string, Promise<Rates>>();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly http: HttpGetJson = gmGetJson,
  ) {}

  get(league: string): Promise<Rates> {
    let pending = this.#inFlight.get(league);
    if (!pending) {
      pending = this.#load(league).finally(() => this.#inFlight.delete(league));
      this.#inFlight.set(league, pending);
    }
    return pending;
  }

  async #load(league: string): Promise<Rates> {
    const key = `price-equivalent:rates:${league}`;
    const cached = await this.storage.get<{ at: number; values: Record<string, number> }>(key);
    if (cached && Date.now() - cached.at < TTL_MS) return new Map(Object.entries(cached.values));
    try {
      const rates = parseRates(await this.http(`${NINJA_URL}?league=${encodeURIComponent(league)}&type=Currency`));
      if (rates.size === 0) log.info(`poe.ninja has no currency rates for "${league}"`);
      else await this.storage.set(key, { at: Date.now(), values: Object.fromEntries(rates) });
      return rates;
    } catch (error) {
      log.warn(`loading poe.ninja rates for "${league}" failed${cached ? ', using expired rates' : ''}`, error);
      return cached ? new Map(Object.entries(cached.values)) : new Map();
    }
  }
}

/** GET via the userscript manager (poe.ninja sends no CORS headers). Callback API works everywhere. */
export function gmGetJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const result = GM.xmlHttpRequest({
      method: 'GET',
      url,
      timeout: 8000,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) return reject(new Error(`${url}: ${response.status}`));
        try {
          resolve(JSON.parse(response.responseText ?? ''));
        } catch (error) {
          reject(error);
        }
      },
      onerror: () => reject(new Error(`${url}: network error`)),
      ontimeout: () => reject(new Error(`${url}: timeout`)),
    });
    // Violentmonkey also returns a promise that rejects on errors, keep it from going unhandled.
    Promise.resolve(result).catch(reject);
  });
}
