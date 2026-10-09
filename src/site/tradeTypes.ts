/**
 * Shapes of the trade2 API as observed on 2026-10-05 (see e2e/fixtures). Only the fields we use
 * are typed; everything else stays `unknown`.
 */
export interface SearchPayload {
  query: TradeQuery;
  sort?: Record<string, 'asc' | 'desc'>;
}

export interface TradeQuery {
  status?: { option: string };
  name?: string | { option: string; discriminator?: string };
  type?: string | { option: string; discriminator?: string };
  term?: string;
  stats?: StatGroup[];
  filters?: Record<string, { disabled?: boolean; filters?: Record<string, unknown> }>;
  [key: string]: unknown;
}

export interface StatGroup {
  type: string;
  filters: StatFilter[];
  value?: { min?: number; max?: number };
  disabled?: boolean;
}

export interface StatFilter {
  id: string;
  value?: { min?: number; max?: number; weight?: number; option?: unknown };
  disabled?: boolean;
}

export interface SearchResponse {
  id: string;
  total: number;
  complexity?: number;
  inexact?: boolean;
  result?: string[] | Record<string, unknown>;
}

export interface Price {
  type: string;
  amount: number;
  currency: string;
}

export interface Listing {
  method?: string;
  indexed: string;
  price?: Price;
  account: {
    name: string;
    lastCharacterName?: string;
    online?: { league?: string; status?: string } | null;
    language?: string;
  };
  whisper?: string;
}

/** Older responses send plain strings, current ones (seen live 2026-10-09) send objects with `description` and `hash`. */
export type ItemMod = string | { description: string; hash?: string; [key: string]: unknown };

export interface Item {
  name: string;
  typeLine: string;
  baseType: string;
  rarity?: string;
  ilvl?: number;
  icon?: string;
  corrupted?: boolean;
  implicitMods?: ItemMod[];
  explicitMods?: ItemMod[];
  runeMods?: ItemMod[];
  [key: string]: unknown;
}

export interface FetchResult {
  id: string;
  listing: Listing;
  item: Item;
}

/** Search form state kept by the site in `app.$store.state.persistent` (Vue 2 + Vuex). */
export interface PersistentState {
  tab: 'search' | 'exchange';
  realm: string;
  league: string;
  status: string;
  name: string | null;
  type: string | null;
  disc: string | null;
  term: string | null;
  filters: Record<string, { disabled?: boolean; filters?: Record<string, unknown> }>;
  stats: StatGroup[];
}
