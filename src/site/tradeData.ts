/**
 * Static trade data from the public `/api/trade2/data/*` endpoints: stat texts, currencies and
 * filter labels. The site loads the same URLs on start, so these requests are usually served
 * from the browser cache. Each endpoint is fetched at most once per page load, a failed request
 * is retried on the next call.
 * Texts are in the site's language because we request from `location.origin`.
 */
export interface StatEntry {
  id: string;
  text: string;
  type: string;
}

export interface CurrencyEntry {
  id: string;
  text: string;
  /** Absolute image URL. */
  image: string | null;
}

export interface FilterOption {
  id: string | null;
  text: string;
}

type FetchJson = (path: string) => Promise<unknown>;

export class TradeData {
  #stats?: Promise<Map<string, StatEntry>>;
  #currencies?: Promise<Map<string, CurrencyEntry>>;
  #filterOptions?: Promise<Map<string, FilterOption[]>>;

  constructor(
    private readonly fetchJson: FetchJson = defaultFetchJson,
    private readonly imageOrigin = 'https://web.poecdn.com',
  ) {}

  /** All searchable stats by id, e.g. "explicit.stat_3299347043" → "# to maximum Life". */
  stats(): Promise<Map<string, StatEntry>> {
    this.#stats ??= this.fetchJson('/api/trade2/data/stats').then((json) => {
      const map = new Map<string, StatEntry>();
      for (const group of (json as { result: { entries: StatEntry[] }[] }).result) {
        for (const entry of group.entries) map.set(entry.id, entry);
      }
      return map;
    }).catch((error: unknown) => {
      this.#stats = undefined;
      throw error;
    });
    return this.#stats;
  }

  /** Currencies and other static items by trade id, e.g. "divine", "exalted". */
  currencies(): Promise<Map<string, CurrencyEntry>> {
    this.#currencies ??= this.fetchJson('/api/trade2/data/static').then((json) => {
      const map = new Map<string, CurrencyEntry>();
      for (const group of (json as { result: { entries: { id: string; text: string; image?: string }[] }[] }).result) {
        for (const entry of group.entries) {
          map.set(entry.id, {
            id: entry.id,
            text: entry.text,
            image: entry.image ? new URL(entry.image, this.imageOrigin).href : null,
          });
        }
      }
      return map;
    }).catch((error: unknown) => {
      this.#currencies = undefined;
      throw error;
    });
    return this.#currencies;
  }

  /** Options of select filters keyed by "<group>.<filter>", e.g. "type_filters.category". */
  filterOptions(): Promise<Map<string, FilterOption[]>> {
    this.#filterOptions ??= this.fetchJson('/api/trade2/data/filters').then((json) => {
      const map = new Map<string, FilterOption[]>();
      type Group = { id: string; filters: { id: string; option?: { options: FilterOption[] } }[] };
      for (const group of (json as { result: Group[] }).result) {
        for (const filter of group.filters) {
          if (filter.option) map.set(`${group.id}.${filter.id}`, filter.option.options);
        }
      }
      return map;
    }).catch((error: unknown) => {
      this.#filterOptions = undefined;
      throw error;
    });
    return this.#filterOptions;
  }
}

async function defaultFetchJson(path: string): Promise<unknown> {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
