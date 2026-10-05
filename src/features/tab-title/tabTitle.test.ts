import type { CurrentSearch } from '../../app/currentSearch';
import { createTestContext } from '../../test/context';
import type { TradeQuery } from '../../site/tradeTypes';
import { tabTitleFeature } from './index';

const BASE = 'Trade - Path of Exile';
const search = (id: string, query: TradeQuery = { type: 'Gold Amulet' }, live = false): CurrentSearch => ({
  location: { type: 'search', realm: 'poe2', league: 'Standard', id, live },
  payload: { query },
  total: null,
});

async function start(title = BASE) {
  document.title = title;
  const ctx = createTestContext();
  const instance = (await tabTitleFeature.start(ctx))!;
  return { ctx, dispose: () => instance.dispose!() };
}

describe('tab-title', () => {
  it('shows the suggested title, the user-given name and a bolt for live searches', async () => {
    const { ctx, dispose } = await start();
    ctx.currentSearch.set(search('a'));
    await vi.waitFor(() => expect(document.title).toBe(`Gold Amulet - ${BASE}`));
    ctx.searchNames.set({ a: 'My amulet' });
    await vi.waitFor(() => expect(document.title).toBe(`My amulet - ${BASE}`));
    ctx.currentSearch.set(search('b', { term: 'Rune' }, true));
    await vi.waitFor(() => expect(document.title).toBe(`⚡ Rune - ${BASE}`));
    ctx.currentSearch.set(null);
    await vi.waitFor(() => expect(document.title).toBe(BASE));
    dispose();
  });

  it('keeps the unread prefix and re-applies after the site rewrites the title', async () => {
    const { ctx, dispose } = await start(`(1) ${BASE}`);
    ctx.currentSearch.set(search('a'));
    await vi.waitFor(() => expect(document.title).toBe(`(1) Gold Amulet - ${BASE}`));
    document.title = `(3) ${BASE}`;
    await vi.waitFor(() => expect(document.title).toBe(`(3) Gold Amulet - ${BASE}`));
    document.title = BASE;
    await vi.waitFor(() => expect(document.title).toBe(`Gold Amulet - ${BASE}`));
    dispose();
  });

  it('restores the original title on dispose and stops observing', async () => {
    const { ctx, dispose } = await start();
    ctx.currentSearch.set(search('a'));
    await vi.waitFor(() => expect(document.title).toBe(`Gold Amulet - ${BASE}`));
    dispose();
    expect(document.title).toBe(BASE);
    document.title = 'Something else';
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(document.title).toBe('Something else');
  });
});
