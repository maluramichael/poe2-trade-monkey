import { decodeSearchId, isEncodedSearchId } from './searchId';

describe('decodeSearchId', () => {
  it('decodes a real trade2 id captured on 2026-10-05', async () => {
    const id = 'H4sIAAAAAAAAE6tWKi5JLCktVrKqVsovKMnMz1OyUkrMq1Sq1QHLFCtZRVcrlVQWpILFU5R0lNIyc0pSi0ASsbWxtQADy6BQQQAAAA';
    expect(await decodeSearchId(id)).toEqual({ status: { option: 'any' }, stats: [{ type: 'and', filters: [] }] });
  });

  it('returns null for legacy short ids and garbage', async () => {
    expect(isEncodedSearchId('zyZy300s4')).toBe(false);
    expect(await decodeSearchId('zyZy300s4')).toBeNull();
    expect(await decodeSearchId('H4sI!!!')).toBeNull();
  });
});
