import type { BookmarkTrade } from './model';
import { isFromOtherLeague, queryFallbackPath, tradePath } from './urls';

const trade: BookmarkTrade = {
  id: 't1', title: 'Amulet', type: 'search', realm: 'poe2', searchId: 'H4sIabc', savedLeague: 'Standard',
  payload: { query: { type: 'Gold Amulet' }, sort: { price: 'asc' } },
  completedAt: null, createdAt: '2026-10-05T00:00:00.000Z', updatedAt: '2026-10-05T00:00:00.000Z',
};

describe('bookmark urls', () => {
  it('opens in the current league, not the saved one', () => {
    expect(tradePath(trade, 'Runes of Aldur')).toBe('/trade2/search/poe2/Runes%20of%20Aldur/H4sIabc');
    expect(tradePath(trade, 'Runes of Aldur', { live: true })).toBe('/trade2/search/poe2/Runes%20of%20Aldur/H4sIabc/live');
  });

  it('builds exchange paths without live', () => {
    expect(tradePath({ ...trade, type: 'exchange' }, 'Standard', { live: true })).toBe('/trade2/exchange/poe2/Standard/H4sIabc');
  });

  it('builds a ?q= fallback only when the payload is known', () => {
    const path = queryFallbackPath(trade, 'Runes of Aldur')!;
    expect(path.startsWith('/trade2/search/poe2/Runes%20of%20Aldur?q=')).toBe(true);
    expect(JSON.parse(decodeURIComponent(path.split('?q=')[1]!))).toEqual(trade.payload);
    expect(queryFallbackPath({ ...trade, payload: null }, 'Standard')).toBeNull();
  });

  it('flags trades saved in another league', () => {
    expect(isFromOtherLeague(trade, 'Runes of Aldur')).toBe(true);
    expect(isFromOtherLeague(trade, 'Standard')).toBe(false);
    expect(isFromOtherLeague({ ...trade, savedLeague: '' }, 'Standard')).toBe(false);
  });
});
