/// <reference types="node" />
import { readFileSync } from 'node:fs';
import type { CurrentSearch } from '../../app/currentSearch';
import type { StatGroup } from '../../site/tradeTypes';
import { createTestContext } from '../../test/context';
import { highlightModsFeature } from './index';

const rowsHtml = readFileSync('src/test/fixtures/result-rows.html', 'utf8');

function search(stats: StatGroup[]): CurrentSearch {
  return { location: { id: 'x' } as CurrentSearch['location'], payload: { query: { stats } }, total: null };
}

const highlighted = () =>
  [...document.querySelectorAll('.ptm-mod-highlight > [data-field]')].map((el) => el.getAttribute('data-field'));

describe('highlight-mods', () => {
  beforeEach(() => {
    document.body.innerHTML = rowsHtml;
  });

  it('marks mods whose exact stat id is an active filter and follows search changes', () => {
    const ctx = createTestContext();
    ctx.currentSearch.set(
      search([
        { type: 'and', filters: [{ id: 'implicit.stat_3917489142' }, { id: 'explicit.stat_2866361420', disabled: true }, { id: 'pseudo.pseudo_total_life' }] },
        { type: 'not', filters: [{ id: 'explicit.stat_3299347043' }] },
        { type: 'count', disabled: true, filters: [{ id: 'explicit.stat_1050105434' }] },
      ]),
    );
    const instance = highlightModsFeature.start(ctx) as { dispose(): void };
    ctx.results.flush();
    expect(new Set(highlighted())).toEqual(new Set(['stat.implicit.stat_3917489142']));

    ctx.currentSearch.set(search([{ type: 'and', filters: [{ id: 'explicit.stat_3299347043' }] }]));
    ctx.results.flush();
    expect(new Set(highlighted())).toEqual(new Set(['stat.explicit.stat_3299347043']));

    instance.dispose();
    expect(highlighted()).toEqual([]);
  });

  it('does not re-decorate when the active stat ids did not change', () => {
    const ctx = createTestContext();
    const decorate = vi.spyOn(ctx.results, 'decorate');
    const same = () => search([{ type: 'and', filters: [{ id: 'explicit.stat_3299347043' }] }]);
    ctx.currentSearch.set(same());
    const instance = highlightModsFeature.start(ctx) as { dispose(): void };
    ctx.currentSearch.set(same());
    expect(decorate).toHaveBeenCalledTimes(1);
    instance.dispose();
  });
});
