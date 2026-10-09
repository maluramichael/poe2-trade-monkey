import { gzipSync } from 'node:zlib';
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

  // Valid JSON, so only the size limit can reject it.
  it('rejects ids that decompress to more than the limit', async () => {
    const bomb = gzipSync(JSON.stringify('0'.repeat(300 * 1024))).toString('base64url');
    expect(bomb.startsWith('H4sI')).toBe(true);
    expect(await decodeSearchId(bomb)).toBeNull();
    const query = { query: { status: { option: 'online' } } };
    expect(await decodeSearchId(gzipSync(JSON.stringify(query)).toString('base64url'))).toEqual(query);
  });
});
