import type { StatEntry } from '../../site/tradeData';
import { findUnknownStats } from './validate';

const stats = new Map<string, StatEntry>([
  ['explicit.stat_3299347043', { id: 'explicit.stat_3299347043', text: '# to maximum Life', type: 'explicit' }],
]);

describe('findUnknownStats', () => {
  it('returns stat ids missing from the catalog, once each', () => {
    const payload = {
      query: {
        stats: [
          { type: 'and', filters: [{ id: 'explicit.stat_3299347043' }, { id: 'explicit.stat_gone' }] },
          { type: 'not', filters: [{ id: 'explicit.stat_gone' }, { id: 'implicit.stat_old' }] },
        ],
      },
    };
    expect(findUnknownStats(payload, stats)).toEqual(['explicit.stat_gone', 'implicit.stat_old']);
  });

  it('handles searches without stats or payload', () => {
    expect(findUnknownStats({ query: {} }, stats)).toEqual([]);
    expect(findUnknownStats(null, stats)).toEqual([]);
  });
});
