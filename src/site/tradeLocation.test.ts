import { buildQueryPath, buildTradePath, parseTradeLocation, withLeague } from './tradeLocation';

const ID = 'H4sIAAAAAAAAE6tWKi5JLCktVrKqVsovKMnMz1OyUkrMq1Sq1QHLFCtZRVcrlVQWpILFU5R0lNIyc0pSi0ASsbWxtQADy6BQQQAAAA';

describe('parseTradeLocation', () => {
  it('parses a search with realm, encoded league and id', () => {
    expect(parseTradeLocation(`https://www.pathofexile.com/trade2/search/poe2/Runes%20of%20Aldur/${ID}`)).toEqual({
      type: 'search', realm: 'poe2', league: 'Runes of Aldur', id: ID, live: false,
    });
  });

  it('detects live searches and exchange', () => {
    expect(parseTradeLocation(`/trade2/search/poe2/Standard/${ID}/live`)?.live).toBe(true);
    expect(parseTradeLocation(`/trade2/exchange/poe2/Standard/${ID}`)?.type).toBe('exchange');
  });

  it('accepts links without realm and empty search forms', () => {
    expect(parseTradeLocation('/trade2/search/Standard')).toEqual({
      type: 'search', realm: 'poe2', league: 'Standard', id: null, live: false,
    });
  });

  it('ignores ids with url-safe base64 characters', () => {
    expect(parseTradeLocation('/trade2/search/poe2/Standard/H4sI_a-b')?.id).toBe('H4sI_a-b');
  });

  it('returns null for non-search pages', () => {
    expect(parseTradeLocation('/trade2/history')).toBeNull();
    expect(parseTradeLocation('/trade2/settings')).toBeNull();
    expect(parseTradeLocation('/trade/search/Standard/abc')).toBeNull();
    expect(parseTradeLocation('/trade2/search')).toBeNull();
  });
});

describe('buildTradePath', () => {
  it('round-trips and re-encodes the league', () => {
    const path = `/trade2/search/poe2/HC%20Runes%20of%20Aldur/${ID}/live`;
    expect(buildTradePath(parseTradeLocation(path)!)).toBe(path);
  });

  it('switches league without touching the id', () => {
    const location = parseTradeLocation(`/trade2/search/poe2/Standard/${ID}`)!;
    expect(buildTradePath(withLeague(location, 'Forbidden Rites'))).toBe(`/trade2/search/poe2/Forbidden%20Rites/${ID}`);
  });

  it('never adds /live to exchange urls', () => {
    expect(buildTradePath({ type: 'exchange', realm: 'poe2', league: 'Standard', id: 'x', live: true })).toBe(
      '/trade2/exchange/poe2/Standard/x',
    );
  });
});

describe('buildQueryPath', () => {
  it('encodes the payload as q parameter', () => {
    const path = buildQueryPath('search', 'poe2', 'Standard', { query: { type: 'Gold Amulet' } });
    expect(path).toBe('/trade2/search/poe2/Standard?q=%7B%22query%22%3A%7B%22type%22%3A%22Gold%20Amulet%22%7D%7D');
  });
});
