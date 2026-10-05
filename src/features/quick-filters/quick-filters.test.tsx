import { act } from 'preact/test-utils';
import { sel } from '../../site/selectors';
import { createTestContext, type TestContext } from '../../test/context';
import type { FeatureInstance } from '../types';
import { quickFiltersFeature } from './index';
import { NUMBERS, clearCommits, numberCommits, toView, toggleCommits, type Filters } from './model';

import panelHtml from '../../test/fixtures/search-panel.html?raw';
import filtersJson from '../../test/fixtures/filters.json';

const wait = (ms = 0) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

const ENABLE_MISC = { mutation: 'setFilterGroupDisabled', payload: { type: 'filters', group: 'misc_filters', disable: false } };
const ilvl = NUMBERS.find((c) => c.key === 'ilvl')!;
const lvl = NUMBERS.find((c) => c.key === 'lvl')!;

describe('quick filters model', () => {
  it('maps form state to the view', () => {
    const view = toView({
      misc_filters: { disabled: false, filters: { corrupted: { option: 'false' }, mirrored: { option: 'true' } } },
      type_filters: { filters: { ilvl: { min: 75 }, rarity: { option: 'rare' } } },
      req_filters: { filters: { lvl: { min: 10, max: 60 } } },
    });
    expect(view.toggles).toMatchObject({ corrupted: 'no', mirrored: 'yes', fractured_item: 'any', identified: 'any' });
    expect(view.numbers).toEqual({ ilvl: 75, quality: undefined, lvl: 60, rune_sockets: undefined });
    expect(view.rarity).toBe('rare');
    expect(toView({}).rarity).toBeNull();
  });

  it('enables the group before setting a value, not when it is already enabled or clearing', () => {
    expect(toggleCommits({}, 'corrupted', 'no')).toEqual([
      ENABLE_MISC,
      { mutation: 'setPropertyFilter', payload: { group: 'misc_filters', index: 'corrupted', value: { option: 'false' } } },
    ]);
    const enabled: Filters = { misc_filters: { disabled: false, filters: { corrupted: { option: 'false' } } } };
    expect(toggleCommits(enabled, 'corrupted', 'yes')).toHaveLength(1);
    expect(toggleCommits({ misc_filters: { disabled: true } }, 'corrupted', 'any')).toEqual([
      { mutation: 'setPropertyFilter', payload: { group: 'misc_filters', index: 'corrupted', value: {} } },
    ]);
  });

  it('keeps the other bound of a min/max filter', () => {
    const filters: Filters = { req_filters: { disabled: false, filters: { lvl: { min: 10, max: 60 } } } };
    expect(numberCommits(filters, lvl, 40)[0]!.payload).toEqual({ group: 'req_filters', index: 'lvl', value: { min: 10, max: 40 } });
    expect(numberCommits(filters, lvl, undefined)[0]!.payload).toEqual({ group: 'req_filters', index: 'lvl', value: { min: 10 } });
  });

  it('clears only the filters the strip shows', () => {
    const commits = clearCommits({
      misc_filters: { disabled: false, filters: { corrupted: { option: 'true' }, crafted: { option: 'true' } } },
      type_filters: { disabled: false, filters: { ilvl: { min: 75 }, category: { option: 'weapon' } } },
    });
    expect(commits.map((c) => c.payload)).toEqual([
      { group: 'misc_filters', index: 'corrupted', value: {} },
      { group: 'type_filters', index: 'ilvl', value: {} },
    ]);
  });
});

describe('quick filters strip', () => {
  let ctx: TestContext;
  let instance: FeatureInstance;
  let pageState: { tab: string; filters: Filters };

  const strip = () => document.querySelector<HTMLElement>('.ptm-qf')!;
  const button = (filter: string) => strip().querySelector<HTMLButtonElement>(`[data-filter="${filter}"]`)!;
  const click = (element: HTMLElement) => act(() => element.click());
  const lastCommits = (from: number) => ctx.commits.slice(from);

  beforeEach(async () => {
    document.body.innerHTML = panelHtml;
    pageState = { tab: 'search', filters: {} };
    ctx = createTestContext({ pageState, data: { filters: filtersJson } });
    instance = (await quickFiltersFeature.start(ctx)) as FeatureInstance;
    await wait();
  });

  afterEach(() => instance.dispose?.());

  it('sits right before the controls, once', () => {
    expect(document.querySelectorAll('.ptm-qf')).toHaveLength(1);
    expect(strip().nextElementSibling).toBe(document.querySelector(sel.controls));
  });

  it('re-inserts itself when Vue re-renders the controls', async () => {
    const controls = document.querySelector(sel.controls)!;
    const parent = controls.parentElement!;
    strip().remove();
    controls.remove();
    const fresh = controls.cloneNode(true) as HTMLElement;
    parent.append(fresh);
    await wait();
    expect(document.querySelectorAll('.ptm-qf')).toHaveLength(1);
    expect(strip().nextElementSibling).toBe(fresh);
  });

  it('cycles a tri-state button any, yes, no, any', async () => {
    await click(button('corrupted'));
    await wait();
    expect(ctx.commits).toEqual([
      ENABLE_MISC,
      { mutation: 'setPropertyFilter', payload: { group: 'misc_filters', index: 'corrupted', value: { option: 'true' } } },
    ]);

    pageState.filters = { misc_filters: { disabled: false, filters: { corrupted: { option: 'true' } } } };
    ctx.fromPage({ kind: 'mutation', type: 'setPropertyFilter' });
    await wait(150);
    expect(button('corrupted').dataset.state).toBe('yes');

    let from = ctx.commits.length;
    await click(button('corrupted'));
    expect(lastCommits(from)).toEqual([
      { mutation: 'setPropertyFilter', payload: { group: 'misc_filters', index: 'corrupted', value: { option: 'false' } } },
    ]);

    pageState.filters = { misc_filters: { disabled: false, filters: { corrupted: { option: 'false' } } } };
    ctx.fromPage({ kind: 'mutation', type: 'setPropertyFilter' });
    await wait(150);
    expect(button('corrupted').dataset.state).toBe('no');
    expect(button('corrupted').classList.contains('ptm-qf__btn--no')).toBe(true);

    from = ctx.commits.length;
    await click(button('corrupted'));
    expect(lastCommits(from)).toEqual([
      { mutation: 'setPropertyFilter', payload: { group: 'misc_filters', index: 'corrupted', value: {} } },
    ]);
  });

  it('syncs changes from the native form, debounced', async () => {
    pageState.filters = {
      type_filters: { filters: { ilvl: { min: 75 } } },
      req_filters: { filters: { lvl: { max: 60 } } },
      misc_filters: { filters: { fractured_item: { option: 'true' } } },
    };
    ctx.fromPage({ kind: 'mutation', type: 'setPropertyFilter' });
    await wait(20);
    expect(button('ilvl').textContent).not.toContain('≥75');
    await wait(150);
    expect(button('ilvl').textContent).toContain('≥75');
    expect(button('lvl').textContent).toContain('≤60');
    expect(button('fractured_item').dataset.state).toBe('yes');
  });

  it('applies a number with Enter and a quick value, and resets it', async () => {
    await click(button('ilvl'));
    const input = strip().querySelector<HTMLInputElement>('.ptm-qf__input')!;
    input.value = '80';
    await act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(ctx.commits).toEqual([
      { mutation: 'setFilterGroupDisabled', payload: { type: 'filters', group: 'type_filters', disable: false } },
      { mutation: 'setPropertyFilter', payload: { group: 'type_filters', index: 'ilvl', value: { min: 80 } } },
    ]);
    expect(strip().querySelector('.ptm-qf__pop')).toBeNull();

    let from = ctx.commits.length;
    await click(button('rune_sockets'));
    const quick = [...strip().querySelectorAll<HTMLButtonElement>('.ptm-qf__quick')].find((b) => b.textContent === '2')!;
    await click(quick);
    expect(lastCommits(from).at(-1)).toEqual({
      mutation: 'setPropertyFilter',
      payload: { group: 'equipment_filters', index: 'rune_sockets', value: { min: 2 } },
    });

    from = ctx.commits.length;
    await click(button('quality'));
    await click(strip().querySelector<HTMLButtonElement>('.ptm-qf__quick[aria-label]')!);
    expect(lastCommits(from)).toEqual([
      { mutation: 'setPropertyFilter', payload: { group: 'type_filters', index: 'quality', value: {} } },
    ]);
    expect(numberCommits({}, ilvl, 1)).toHaveLength(2);
  });

  it('closes a popover with Escape', async () => {
    await click(button('lvl'));
    expect(strip().querySelector('.ptm-qf__pop')).not.toBeNull();
    await act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(strip().querySelector('.ptm-qf__pop')).toBeNull();
    expect(ctx.commits).toEqual([]);
  });

  it('picks a rarity from the site options', async () => {
    await click(button('rarity'));
    const options = [...strip().querySelectorAll<HTMLButtonElement>('.ptm-qf__option')];
    expect(options.map((o) => o.textContent)).toEqual(['Any', 'Normal', 'Magic', 'Rare', 'Unique', 'Unique (Foil)', 'Any Non-Unique']);
    await click(options.find((o) => o.dataset.rarity === 'nonunique')!);
    expect(ctx.commits.at(-1)).toEqual({
      mutation: 'setPropertyFilter',
      payload: { group: 'type_filters', index: 'rarity', value: { option: 'nonunique' } },
    });
  });

  it('clear-all is disabled when empty and clears the strip filters', async () => {
    expect(strip().querySelector<HTMLButtonElement>('.ptm-qf__clear')!.disabled).toBe(true);
    pageState.filters = { misc_filters: { disabled: false, filters: { mirrored: { option: 'false' } } } };
    ctx.fromPage({ kind: 'mutation', type: 'setPropertyFilter' });
    await wait(150);
    await click(strip().querySelector<HTMLButtonElement>('.ptm-qf__clear')!);
    expect(ctx.commits).toEqual([
      { mutation: 'setPropertyFilter', payload: { group: 'misc_filters', index: 'mirrored', value: {} } },
    ]);
  });

  it('dispose removes the strip and stops syncing', async () => {
    instance.dispose?.();
    expect(document.querySelector('.ptm-qf')).toBeNull();
    document.querySelector(sel.controls)!.before(document.createElement('div'));
    ctx.fromPage({ kind: 'mutation', type: 'setPropertyFilter' });
    await wait(150);
    expect(document.querySelector('.ptm-qf')).toBeNull();
  });
});
