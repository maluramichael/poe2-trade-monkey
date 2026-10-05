import { buildQueryPath, buildTradePath } from '../../site/tradeLocation';
import type { BookmarkTrade } from './model';

/** Path of the trade in `league` (the current one), not the league it was saved in. */
export function tradePath(trade: BookmarkTrade, league: string, { live = false } = {}): string {
  return buildTradePath({ type: trade.type, realm: trade.realm, league, id: trade.searchId, live });
}

/** `?q=` path that lets the site rerun the stored query, `null` without a payload. */
export function queryFallbackPath(trade: BookmarkTrade, league: string): string | null {
  return trade.payload ? buildQueryPath(trade.type, trade.realm, league, trade.payload) : null;
}

export function isFromOtherLeague(trade: BookmarkTrade, league: string): boolean {
  return trade.savedLeague !== '' && trade.savedLeague !== league;
}
