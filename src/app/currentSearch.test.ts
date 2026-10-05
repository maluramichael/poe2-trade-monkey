import { Store } from '../core/store';
import { PageBridge } from '../site/bridge/client';
import { PAGE_TO_CONTENT } from '../site/bridge/protocol';
import type { TradeLocation } from '../site/tradeLocation';
import { trackCurrentSearch } from './currentSearch';

const ID = 'H4sIAAAAAAAAE6tWKi5JLCktVrKqVsovKMnMz1OyUkrMq1Sq1QHLFCtZRVcrlVQWpILFU5R0lNIyc0pSi0ASsbWxtQADy6BQQQAAAA';
const at = (id: string | null): TradeLocation => ({ type: 'search', realm: 'poe2', league: 'Standard', id, live: false });

describe('trackCurrentSearch', () => {
  it('decodes the id from the url when no request was captured', async () => {
    const location = new Store<TradeLocation | null>(at(ID));
    const current = trackCurrentSearch(location, new PageBridge(window));
    await vi.waitFor(() => expect(current.get()?.payload?.query).toEqual({ status: { option: 'any' }, stats: [{ type: 'and', filters: [] }] }));
    location.set(at(null));
    await vi.waitFor(() => expect(current.get()).toBeNull());
  });

  it('prefers the captured request including sort and total', async () => {
    const location = new Store<TradeLocation | null>(null);
    const current = trackCurrentSearch(location, new PageBridge(window));
    const captured = { type: 'search', realm: 'poe2', league: 'Standard', request: { query: { type: 'Gold Amulet' }, sort: { price: 'asc' } }, response: { id: 'abc', total: 141 } };
    window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify({ kind: 'search', captured }) }));
    location.set(at('abc'));
    await vi.waitFor(() => expect(current.get()).toMatchObject({ payload: captured.request, total: 141 }));
  });
});
