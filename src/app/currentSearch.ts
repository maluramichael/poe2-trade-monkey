import { Store } from '../core/store';
import type { PageBridge } from '../site/bridge/client';
import { decodeSearchId } from '../site/searchId';
import type { TradeLocation } from '../site/tradeLocation';
import type { SearchPayload } from '../site/tradeTypes';

export interface CurrentSearch {
  location: TradeLocation & { id: string };
  /** Query and sort. From the captured request when available, else decoded from the id. */
  payload: SearchPayload | null;
  /** Number of matches reported by the API, if the search was captured. */
  total: number | null;
}

/**
 * The search the user is looking at right now. Combines the URL (always there) with the request
 * the site sent (has the sort order) and falls back to decoding the gzip search id.
 */
export function trackCurrentSearch(location: Store<TradeLocation | null>, bridge: PageBridge): Store<CurrentSearch | null> {
  const current = new Store<CurrentSearch | null>(null);
  let lastCaptured: { id: string; payload: SearchPayload; total: number } | null = null;
  let generation = 0;

  const refresh = async (next: TradeLocation | null) => {
    const run = ++generation;
    if (!next?.id) return current.set(null);
    const id = next.id;
    if (lastCaptured?.id === id) {
      return current.set({ location: { ...next, id }, payload: lastCaptured.payload, total: lastCaptured.total });
    }
    current.set({ location: { ...next, id }, payload: null, total: null });
    const decoded = (await decodeSearchId(id)) as SearchPayload['query'] | null;
    if (run !== generation || !decoded) return;
    current.set({ location: { ...next, id }, payload: { query: decoded }, total: null });
  };

  bridge.events.on('search', (captured) => {
    lastCaptured = { id: captured.response.id, payload: captured.request, total: captured.response.total };
    void refresh(location.get());
  });
  location.subscribe((next) => void refresh(next));
  void refresh(location.get());
  return current;
}
