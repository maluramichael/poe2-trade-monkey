import type { KeyValueStorage } from '../core/storage';
import { Store } from '../core/store';
import type { TradeLocation } from '../site/tradeLocation';

export interface League {
  id: string;
  realm: string;
  text: string;
}

const CACHE_KEY = 'cache:leagues';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Knows the current league and the list of active leagues. The list comes from the public data
 * endpoint (Cloudflare-cached, no rate limit) and is cached for six hours.
 */
export class LeagueService {
  readonly list = new Store<League[]>([]);
  /** League of the trade page the user is on. Remembered when visiting history or settings. */
  readonly current: Store<string | null>;

  constructor(
    private readonly storage: KeyValueStorage,
    location: Store<TradeLocation | null>,
    private readonly fetchJson: (url: string) => Promise<unknown> = defaultFetchJson,
  ) {
    this.current = new Store(location.get()?.league ?? null);
    location.subscribe((next) => {
      if (next) this.current.set(next.league);
    });
  }

  async load(): Promise<void> {
    const cached = await this.storage.get<{ at: number; leagues: League[] }>(CACHE_KEY);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      this.list.set(cached.leagues);
      return;
    }
    try {
      const json = (await this.fetchJson('/api/trade2/data/leagues')) as { result?: League[] };
      const leagues = (json.result ?? []).filter((league) => league.realm === 'poe2');
      this.list.set(leagues);
      await this.storage.set(CACHE_KEY, { at: Date.now(), leagues });
    } catch {
      if (cached) this.list.set(cached.leagues);
    }
  }

  /** True if the league is still listed (ended challenge leagues disappear from the list). */
  isActive(league: string): boolean {
    const list = this.list.get();
    return list.length === 0 || list.some((entry) => entry.id === league);
  }
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}
