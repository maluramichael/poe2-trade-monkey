import { render } from 'preact';
import type { CurrentSearch } from '../../app/currentSearch';
import { setLocale } from '../../core/i18n';
import type { TradeQuery } from '../../site/tradeTypes';
import { createTestContext } from '../../test/context';
import filters from '../../test/fixtures/filters.json';
import { type HistoryEntry, historyFeature, MAX_ENTRIES, STORAGE_KEY } from './index';
import { relativeTime } from './Panel';

const search = (id: string, league = 'Standard', query: TradeQuery | null = { type: 'Gold Amulet' }, live = false): CurrentSearch => ({
  location: { type: 'search', realm: 'poe2', league, id, live },
  payload: query ? { query } : null,
  total: null,
});

const stored = (ctx: ReturnType<typeof createTestContext>): HistoryEntry[] =>
  JSON.parse(ctx.storage.data.get(STORAGE_KEY) ?? '{"data":[]}').data;

async function startWith(ctx = createTestContext()) {
  const instance = (await historyFeature.start(ctx))!;
  return { ctx, instance };
}

afterEach(() => {
  setLocale('en');
  document.body.innerHTML = '';
});

describe('history recording', () => {
  it('records searches newest first and skips the same search in the same league', async () => {
    const { ctx } = await startWith();
    ctx.currentSearch.set(search('a'));
    ctx.currentSearch.set(null);
    ctx.currentSearch.set(search('a'));
    ctx.currentSearch.set(search('b', 'Standard', { term: 'Rune' }, true));
    ctx.currentSearch.set(search('b', 'Hardcore', { term: 'Rune' }));
    await vi.waitFor(() => expect(stored(ctx)).toHaveLength(3));
    expect(stored(ctx).map((e) => [e.searchId, e.league, e.title, e.live])).toEqual([
      ['b', 'Hardcore', 'Rune', false],
      ['b', 'Standard', 'Rune', true],
      ['a', 'Standard', 'Gold Amulet', false],
    ]);
    expect(stored(ctx)[0]).toMatchObject({ type: 'search', realm: 'poe2', payload: { query: { term: 'Rune' } } });
    expect(Date.parse(stored(ctx)[0]!.createdAt)).not.toBeNaN();
  });

  it('records the search already on screen at start and fills in the decoded query later', async () => {
    const ctx = createTestContext();
    ctx.currentSearch.set(search('a', 'Standard', null));
    await startWith(ctx);
    await vi.waitFor(() => expect(stored(ctx)[0]?.title).toBe('Unnamed search'));
    ctx.currentSearch.set(search('a'));
    await vi.waitFor(() => expect(stored(ctx)[0]?.title).toBe('Gold Amulet'));
    expect(stored(ctx)).toHaveLength(1);
  });

  it('prefers the user-given name and uses localized filter labels', async () => {
    const ctx = createTestContext({ data: { filters } });
    ctx.searchNames.set({ a: 'My amulet' });
    await startWith(ctx);
    ctx.currentSearch.set(search('a'));
    ctx.currentSearch.set(search('b', 'Standard', { filters: { type_filters: { filters: { category: { option: 'accessory.amulet' }, rarity: { option: 'unique' } } } } }));
    await vi.waitFor(() => expect(stored(ctx)).toHaveLength(2));
    expect(stored(ctx).map((e) => e.title)).toEqual(['Amulet (Unique)', 'My amulet']);
  });

  it('keeps at most 50 entries and stops recording after dispose', async () => {
    const { ctx, instance } = await startWith();
    for (let i = 0; i < MAX_ENTRIES + 5; i++) ctx.currentSearch.set(search(`id${i}`));
    await vi.waitFor(() => expect(stored(ctx)[0]?.searchId).toBe(`id${MAX_ENTRIES + 4}`));
    expect(stored(ctx)).toHaveLength(MAX_ENTRIES);
    instance.dispose!();
    ctx.currentSearch.set(search('late'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stored(ctx)[0]?.searchId).toBe(`id${MAX_ENTRIES + 4}`);
  });
});

describe('history panel', () => {
  const entry = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
    id: overrides.searchId ?? 'x',
    title: 'Gold Amulet',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    type: 'search',
    realm: 'poe2',
    league: 'Standard',
    searchId: 'x',
    live: false,
    payload: null,
    ...overrides,
  });

  async function mount(entries: HistoryEntry[], currentLeague: string) {
    const ctx = createTestContext({ location: { type: 'search', realm: 'poe2', league: currentLeague, id: null, live: false } });
    await ctx.storage.set(STORAGE_KEY, { schema: 1, data: entries });
    const { instance } = await startWith(ctx);
    const root = document.createElement('div');
    document.body.append(root);
    const Panel = instance.Panel!;
    render(<Panel />, root);
    return { ctx, root };
  }

  it('shows an empty state', async () => {
    const { root } = await mount([], 'Standard');
    expect(root.textContent).toContain('No searches yet');
    expect(root.querySelector('button')).toBeNull();
  });

  it('links each entry to its league and offers the current league', async () => {
    setLocale('de');
    const { root, ctx } = await mount(
      [
        entry({ searchId: 'a', league: 'Runes of Aldur', live: true }),
        entry({ searchId: 'b', league: 'Standard', type: 'exchange', title: 'Divine' }),
      ],
      'Standard',
    );
    const items = root.querySelectorAll('.ptm-history__item');
    expect(items).toHaveLength(2);
    const [first, second] = [...items];
    expect(first!.querySelector('.ptm-history__title')!.getAttribute('href')).toBe('/trade2/search/poe2/Runes%20of%20Aldur/a/live');
    expect(first!.querySelector('.ptm-history__title')!.textContent).toBe('⚡ Gold Amulet');
    expect(first!.querySelector('.ptm-meta')!.textContent).toBe('Suche · Runes of Aldur · vor 5 Minuten');
    const other = first!.querySelector('.ptm-history__other')!;
    expect(other.textContent).toBe('in Standard öffnen');
    expect(other.getAttribute('href')).toBe('/trade2/search/poe2/Standard/a/live');
    expect(second!.querySelector('.ptm-meta')!.textContent).toContain('Tausch · Standard');
    expect(second!.querySelector('.ptm-history__other')).toBeNull();

    ctx.searchNames.set({ b: 'Meine Divines' });
    await vi.waitFor(() => expect(second!.querySelector('.ptm-history__title')!.textContent).toBe('Meine Divines'));
  });

  it('clears the history after confirming', async () => {
    const { root, ctx } = await mount([entry({ searchId: 'a' })], 'Standard');
    const clear = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Clear history')!;
    clear.click();
    await vi.waitFor(() => expect(root.querySelector('[role="dialog"]')).not.toBeNull());
    expect(root.textContent).toContain('Delete all 1 entries');
    [...root.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent === 'Clear')!.click();
    await vi.waitFor(() => expect(root.textContent).toContain('No searches yet'));
    expect(stored(ctx)).toEqual([]);
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');
  it('picks the largest fitting unit in the current locale', () => {
    expect(relativeTime('2026-10-05T11:59:40Z', now)).toBe('now');
    expect(relativeTime('2026-10-05T10:30:00Z', now)).toBe('1 hour ago');
    expect(relativeTime('2026-10-04T12:00:00Z', now)).toBe('yesterday');
    setLocale('de');
    expect(relativeTime('2026-10-05T11:57:00Z', now)).toBe('vor 3 Minuten');
  });
});
