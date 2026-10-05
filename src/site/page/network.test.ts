import { isFetchUrl, parseSearchUrl } from './network';

describe('parseSearchUrl', () => {
  it('recognises search and exchange posts with realm and encoded league', () => {
    expect(parseSearchUrl('https://www.pathofexile.com/api/trade2/search/poe2/Runes%20of%20Aldur')).toEqual({
      type: 'search', realm: 'poe2', league: 'Runes of Aldur',
    });
    expect(parseSearchUrl('/api/trade2/exchange/poe2/Standard')).toEqual({
      type: 'exchange', realm: 'poe2', league: 'Standard',
    });
  });

  it('ignores lookups of an existing search and unrelated endpoints', () => {
    expect(parseSearchUrl('/api/trade2/search/poe2/Standard/H4sIAAAA')).toBeNull();
    expect(parseSearchUrl('/api/trade2/data/stats')).toBeNull();
  });
});

describe('isFetchUrl', () => {
  it('matches listing fetches only', () => {
    expect(isFetchUrl('/api/trade2/fetch/abc,def?query=H4sI&realm=poe2')).toBe(true);
    expect(isFetchUrl('/api/trade2/search/poe2/Standard')).toBe(false);
  });
});
