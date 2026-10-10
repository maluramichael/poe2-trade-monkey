/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { act } from 'preact/test-utils';
import { sel } from '../../site/selectors';
import type { StatEntry } from '../../site/tradeData';
import type { StatGroup } from '../../site/tradeTypes';
import { createTestContext } from '../../test/context';
import { applyPreset, statPresetsFeature } from './index';
import { PRESETS, presetGroup, presetText } from './presets';

const stats = JSON.parse(readFileSync('src/test/fixtures/stats.json', 'utf8'));
const panelHtml = readFileSync('src/test/fixtures/search-panel.html', 'utf8');
const RARITY = PRESETS[0]!;
const SOURCES = ['explicit', 'implicit', 'fractured', 'crafted', 'enchant', 'rune', 'desecrated'];

const contextWith = (groups: StatGroup[]) => createTestContext({ pageState: { stats: groups }, data: { stats } });
const lastToast = (ctx: ReturnType<typeof createTestContext>) => ctx.toast.toasts.get().at(-1);
const map = (...entries: StatEntry[]) => new Map(entries.map((e) => [e.id, e]));

describe('presetGroup', () => {
  it('sums every source the site knows, weight 1, group min 1', () => {
    const group = presetGroup(RARITY, map(
      { id: 'implicit.stat_3917489142', text: 'r', type: 'implicit' },
      { id: 'explicit.stat_3917489142', text: 'r', type: 'explicit' },
    ));
    expect(group).toEqual({
      type: 'weight',
      value: { min: 1 },
      filters: [
        { id: 'explicit.stat_3917489142', value: { weight: 1 } },
        { id: 'implicit.stat_3917489142', value: { weight: 1 } },
      ],
    });
  });

  it('is null when no source exists', () => {
    expect(presetGroup(RARITY, map())).toBeNull();
  });
});

describe('presetText', () => {
  it('prefers the site text and falls back to English', () => {
    expect(presetText(RARITY, map({ id: 'implicit.stat_3917489142', text: '#% erhöhte Seltenheit', type: 'implicit' }))).toBe('#% erhöhte Seltenheit');
    expect(presetText(RARITY, null)).toBe('#% increased Rarity of Items found');
  });
});

describe('applyPreset', () => {
  it('appends a Weighted Sum group and sets its minimum', async () => {
    const ctx = contextWith([{ type: 'and', filters: [] }]);
    expect(await applyPreset(ctx, RARITY)).toBe(true);
    expect(ctx.commits).toEqual([
      {
        mutation: 'pushStatGroup',
        payload: { type: 'weight', filters: SOURCES.map((s) => ({ id: `${s}.stat_3917489142`, value: { weight: 1 } })) },
      },
      { mutation: 'setStatGroupValue', payload: { group: 1, value: { min: 1 } } },
    ]);
    expect(lastToast(ctx)).toMatchObject({ kind: 'success', message: 'Group added: #% increased Rarity of Items found (7 sources)' });
  });

  it('warns and commits nothing for a stat the site dropped', async () => {
    const ctx = contextWith([]);
    expect(await applyPreset(ctx, { stat: 'stat_1', text: 'Gone' })).toBe(false);
    expect(ctx.commits).toEqual([]);
    expect(lastToast(ctx)).toMatchObject({ kind: 'warning', message: 'The trade site no longer knows this stat: Gone' });
  });

  it('reports a failing stats request', async () => {
    const ctx = createTestContext({ pageState: { stats: [] } });
    expect(await applyPreset(ctx, RARITY)).toBe(false);
    expect(ctx.commits).toEqual([]);
    expect(lastToast(ctx)?.kind).toBe('error');
  });
});

describe('statPresetsFeature', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('puts the dropdown next to "Add Stat Group", lists presets and removes itself', async () => {
    document.body.innerHTML = panelHtml;
    const ctx = contextWith([{ type: 'and', filters: [] }]);
    const instance = await statPresetsFeature.start(ctx);
    const host = document.querySelector(sel.statGroupSelect)!.parentElement!.querySelector('.ptm-stat-presets')!;
    expect(host).not.toBeNull();

    const trigger = host.querySelector<HTMLButtonElement>('.ptm-menu__trigger')!;
    expect(trigger.textContent).toBe('+ Stat Group Preset');
    act(() => trigger.click());
    const items = [...host.querySelectorAll<HTMLButtonElement>('.ptm-menu__item')];
    expect(items).toHaveLength(PRESETS.length);

    await act(async () => {
      items[0]!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await vi.waitFor(() => expect(ctx.commits.map((c) => c.mutation)).toEqual(['pushStatGroup', 'setStatGroupValue']));

    instance?.dispose?.();
    expect(document.querySelector('.ptm-stat-presets')).toBeNull();
  });
});
