/// <reference types="node" />
import { readFileSync } from 'node:fs';
import type { StatGroup } from '../../site/tradeTypes';
import { createTestContext } from '../../test/context';
import { t as ui } from '../../ui/messages';
import { applyModAction, modActionsFeature, parseModValue } from './index';

const rowsHtml = readFileSync('src/test/fixtures/result-rows.html', 'utf8');
const LIFE = 'explicit.stat_3299347043';
const siteChanged = ui('siteChanged');
const actionFailed = ui('actionFailed');

const contextWith = (stats: StatGroup[]) => createTestContext({ pageState: { stats } });
const lastToast = (ctx: ReturnType<typeof createTestContext>) => ctx.toast.toasts.get().at(-1);

describe('parseModValue', () => {
  it.each([
    ['+89 to maximum Life', 89],
    ['21% increased Armour', 21],
    ['7.9% increased Attack Speed', 7.9],
    ['-15% to Fire Resistance', -15],
    ['−15% to Fire Resistance', -15],
    ['Adds 5 to 10 Physical Damage to Attacks', 7],
    ['Adds 1.5 to 4 Fire Damage', 2],
    ['+1 to Level of all Spell Skills', 1],
    ['Cannot be Frozen', undefined],
  ])('%s -> %s', (text, expected) => {
    expect(parseModValue(text)).toBe(expected);
  });
});

describe('applyModAction', () => {
  it('adds to the first enabled AND group with the parsed min value', async () => {
    const ctx = contextWith([{ type: 'and', filters: [{ id: 'explicit.stat_1' }] }]);
    expect(await applyModAction(ctx, { id: LIFE, text: '+89 to maximum Life', kind: 'add', withValue: true })).toBe(true);
    expect(ctx.commits).toEqual([{ mutation: 'setStatFilter', payload: { group: 0, value: { id: LIFE, value: { min: 89 } } } }]);
    expect(lastToast(ctx)).toMatchObject({ kind: 'success', message: 'Filter added: +89 to maximum Life' });
  });

  it('adds without a value on Shift-click', async () => {
    const ctx = contextWith([{ type: 'and', filters: [] }]);
    await applyModAction(ctx, { id: LIFE, text: '+89 to maximum Life', kind: 'add', withValue: false });
    expect(ctx.commits).toEqual([{ mutation: 'setStatFilter', payload: { group: 0, value: { id: LIFE } } }]);
  });

  it('creates an AND group when none is usable', async () => {
    const ctx = contextWith([
      { type: 'and', disabled: true, filters: [] },
      { type: 'not', filters: [] },
    ]);
    await applyModAction(ctx, { id: LIFE, text: '+89 to maximum Life', kind: 'add', withValue: true });
    expect(ctx.commits).toEqual([
      { mutation: 'pushStatGroup', payload: { type: 'and', filters: [] } },
      { mutation: 'setStatFilter', payload: { group: 2, value: { id: LIFE, value: { min: 89 } } } },
    ]);
  });

  it('does nothing when the stat is already in the target group', async () => {
    const ctx = contextWith([{ type: 'and', filters: [{ id: LIFE, value: { min: 50 } }] }]);
    expect(await applyModAction(ctx, { id: LIFE, text: '+89 to maximum Life', kind: 'add', withValue: true })).toBe(true);
    expect(ctx.commits).toEqual([]);
    expect(lastToast(ctx)).toMatchObject({ kind: 'warning', message: 'Already in filter: +89 to maximum Life' });
  });

  it('excludes into an existing NOT group', async () => {
    const ctx = contextWith([{ type: 'and', filters: [] }, { type: 'not', filters: [] }]);
    await applyModAction(ctx, { id: LIFE, text: '+89 to maximum Life', kind: 'exclude', withValue: true });
    expect(ctx.commits).toEqual([{ mutation: 'setStatFilter', payload: { group: 1, value: { id: LIFE } } }]);
  });

  it('creates a NOT group to exclude into', async () => {
    const ctx = contextWith([{ type: 'and', filters: [] }]);
    await applyModAction(ctx, { id: LIFE, text: '+89 to maximum Life', kind: 'exclude', withValue: true });
    expect(ctx.commits).toEqual([
      { mutation: 'pushStatGroup', payload: { type: 'not', filters: [] } },
      { mutation: 'setStatFilter', payload: { group: 1, value: { id: LIFE } } },
    ]);
    expect(lastToast(ctx)).toMatchObject({ kind: 'success', message: 'Excluded: +89 to maximum Life' });
  });

  it('reports bridge errors', async () => {
    const ctx = contextWith([]);
    ctx.bridge.send = (async () => {
      throw new Error('page bridge: "getState" timed out');
    }) as typeof ctx.bridge.send;
    expect(await applyModAction(ctx, { id: LIFE, text: 'x', kind: 'add', withValue: true })).toBe(false);
    expect(lastToast(ctx)?.kind).toBe('error');
    expect(lastToast(ctx)?.message).toBe(actionFailed);
  });

  it('explains a changed trade site instead of the raw error', async () => {
    const ctx = contextWith([{ type: 'and', filters: [] }]);
    vi.spyOn(ctx.bridge, 'commit').mockRejectedValue(new Error('unknown-mutation: setStatFilter'));
    expect(await applyModAction(ctx, { id: LIFE, text: '+89 to maximum Life', kind: 'add', withValue: true })).toBe(false);
    expect(lastToast(ctx)).toMatchObject({ kind: 'error', message: siteChanged });
    expect(lastToast(ctx)?.message).not.toContain('unknown-mutation');
  });
});

describe('mod-actions decorator', () => {
  beforeEach(() => {
    document.body.innerHTML = rowsHtml;
  });

  it('adds +/- to every stat line, clicks commit, dispose cleans up', async () => {
    const ctx = contextWith([{ type: 'and', filters: [] }]);
    const instance = modActionsFeature.start(ctx) as { dispose(): void };
    ctx.results.flush();

    const statLines = document.querySelectorAll('.item-mod > [data-field^="stat."]').length;
    expect(statLines).toBeGreaterThan(0);
    expect(document.querySelectorAll('.ptm-mod-action')).toHaveLength(statLines * 2);

    const line = document.querySelector(`[data-field="stat.${LIFE}"]`)!.closest('.item-mod')!;
    const plus = line.querySelector<HTMLButtonElement>('.ptm-mod-action--add')!;
    expect(plus.title).toBe('Add as filter (Shift: without minimum)');
    const modText = line.querySelector(`[data-field="stat.${LIFE}"]`)!.textContent!.trim();
    expect(plus.getAttribute('aria-label')).toBe(`Add as filter: ${modText}`);
    expect(line.querySelector('.ptm-mod-action--exclude')!.getAttribute('aria-label')).toBe(`Exclude: ${modText}`);
    plus.click();
    await vi.waitFor(() => expect(ctx.commits).toHaveLength(1));
    expect(ctx.commits[0]).toEqual({ mutation: 'setStatFilter', payload: { group: 0, value: { id: LIFE, value: { min: expect.any(Number) } } } });
    await vi.waitFor(() => expect(line.classList.contains('ptm-mod-flash-ok')).toBe(true));

    instance.dispose();
    expect(document.querySelectorAll('.ptm-mod-action')).toHaveLength(0);
    expect(line.classList.contains('ptm-mod-flash-ok')).toBe(false);
  });
});
