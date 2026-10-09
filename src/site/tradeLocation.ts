/**
 * Parsing and building trade2 URLs.
 *
 *   /trade2/search/poe2/Standard                         empty search form
 *   /trade2/search/poe2/Runes%20of%20Aldur/H4sIAAAA...   a search (id = gzip-encoded query)
 *   /trade2/search/poe2/Standard/H4sIAAAA.../live        live search
 *   /trade2/exchange/poe2/Standard/H4sIAAAA...           bulk exchange
 *   /trade2/search/Standard                              navigation links omit the realm
 *
 * Search ids carry no league, so the same id opens the same search in any league.
 */
export type TradeType = 'search' | 'exchange';

export interface TradeLocation {
  type: TradeType;
  realm: string;
  /** Decoded league name, e.g. "Runes of Aldur". */
  league: string;
  /** Search id, `null` on an empty search form. */
  id: string | null;
  live: boolean;
}

export const DEFAULT_REALM = 'poe2';
export const REALMS = new Set(['poe2', 'xbox', 'sony']);

export function isRealm(value: string): boolean {
  return REALMS.has(value);
}
const TYPES = new Set<string>(['search', 'exchange']);

export function parseTradeLocation(url: string | URL): TradeLocation | null {
  const { pathname } = typeof url === 'string' ? new URL(url, 'https://www.pathofexile.com') : url;
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'trade2' || !parts[1] || !TYPES.has(parts[1])) return null;

  const type = parts[1] as TradeType;
  let rest = parts.slice(2);
  let realm = DEFAULT_REALM;
  if (rest[0] && REALMS.has(rest[0])) {
    realm = rest[0];
    rest = rest.slice(1);
  }

  const [rawLeague, id, suffix] = rest;
  if (!rawLeague) return null;
  return {
    type,
    realm,
    league: safeDecode(rawLeague),
    id: id ?? null,
    live: suffix === 'live',
  };
}

export function buildTradePath(location: TradeLocation): string {
  const segments = ['trade2', location.type, encodeURIComponent(location.realm), encodeURIComponent(location.league)];
  if (location.id) {
    segments.push(encodeURIComponent(location.id));
    if (location.live && location.type === 'search') segments.push('live');
  }
  return '/' + segments.join('/');
}

/**
 * URL that makes the site run the given query itself (it POSTs and then redirects to the id).
 * Used as a fallback when a stored search id cannot be used.
 */
export function buildQueryPath(type: TradeType, realm: string, league: string, payload: unknown): string {
  const base = buildTradePath({ type, realm, league, id: null, live: false });
  return `${base}?q=${encodeURIComponent(JSON.stringify(payload))}`;
}

/** Same location in another league. */
export function withLeague(location: TradeLocation, league: string): TradeLocation {
  return { ...location, league };
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
