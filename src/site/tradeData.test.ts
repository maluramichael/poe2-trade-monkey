import { describe, expect, it, vi } from 'vitest';
import { TradeData } from './tradeData';

const stats = { result: [{ entries: [{ id: 'explicit.stat_1', text: '# to maximum Life', type: 'explicit' }] }] };

describe('TradeData', () => {
  it('does not cache a failed request', async () => {
    const fetchJson = vi.fn<(path: string) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(stats);
    const data = new TradeData(fetchJson);
    await expect(data.stats()).rejects.toThrow('offline');
    expect((await data.stats()).get('explicit.stat_1')?.text).toBe('# to maximum Life');
    await data.stats();
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('retries currencies and filter options after a failure', async () => {
    const fetchJson = vi.fn<(path: string) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValue({ result: [] });
    const data = new TradeData(fetchJson);
    await expect(data.currencies()).rejects.toThrow();
    await expect(data.filterOptions()).rejects.toThrow();
    expect((await data.currencies()).size).toBe(0);
    expect((await data.filterOptions()).size).toBe(0);
  });
});
