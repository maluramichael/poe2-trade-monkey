import type { StatEntry } from '../../site/tradeData';
import type { SearchPayload } from '../../site/tradeTypes';

/** Stat filter ids of the search that the current league's stat catalog does not know. */
export function findUnknownStats(payload: SearchPayload | null, stats: Map<string, StatEntry>): string[] {
  const ids = (payload?.query.stats ?? []).flatMap((group) => group.filters.map((filter) => filter.id));
  return [...new Set(ids.filter((id) => id && !stats.has(id)))];
}
