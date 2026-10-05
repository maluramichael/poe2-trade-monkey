import { options, render } from 'preact';
import type { CurrentSearch } from '../../app/currentSearch';
import { setLocale } from '../../core/i18n';
import { createTestContext } from '../../test/context';
import { encodeBackup, encodeFolderCode } from './codec';
import { bookmarksFeature, EXPANDED_KEY } from './index';
import type { BookmarkFolder, BookmarkTrade, BookmarksData } from './model';
import { backupFileName } from './Panel';
import { STORAGE_KEY } from './service';

const ID = 'H4sIAAAAAAAAE6tWKi5JLCktVrKqVsovKMnMz1OyUkrMq1Sq1QHLFCtZRVcrlVQWpILFU5R0lNIyc0pSi0ASsbWxtQADy6BQQQAAAA';
const AT = '2026-10-01T00:00:00.000Z';

const trade = (id: string, overrides: Partial<BookmarkTrade> = {}): BookmarkTrade => ({
  id, title: `Trade ${id}`, type: 'search', realm: 'poe2', searchId: `${ID}${id}`, savedLeague: 'Runes of Aldur',
  payload: { query: { type: 'Gold Amulet', stats: [{ type: 'and', filters: [{ id: 'explicit.stat_1' }] }] } },
  completedAt: null, createdAt: AT, updatedAt: AT, ...overrides,
});

const folder = (id: string, trades: BookmarkTrade[] = [], overrides: Partial<BookmarkFolder> = {}): BookmarkFolder => ({
  id, title: `Folder ${id}`, icon: null, archivedAt: null, trades, ...overrides,
});

const search = (id: string, league = 'Runes of Aldur'): CurrentSearch => ({
  location: { type: 'search', realm: 'poe2', league, id, live: false },
  payload: { query: { type: 'Gold Amulet' } },
  total: 3,
});

const stats = { result: [{ entries: [{ id: 'explicit.stat_1', text: '# to Life', type: 'explicit' }] }] };

let container: HTMLElement;

async function setup({ folders = [] as BookmarkFolder[], expanded = [] as string[], league = 'Runes of Aldur' as string | null } = {}) {
  const ctx = createTestContext({
    location: league ? { type: 'search', realm: 'poe2', league, id: null, live: false } : null,
    data: { stats },
  });
  await ctx.storage.set(STORAGE_KEY, { schema: 1, data: { folders } });
  await ctx.storage.set(EXPANDED_KEY, { schema: 1, data: expanded });
  const instance = (await bookmarksFeature.start(ctx))!;
  const Panel = instance.Panel!;
  container = document.createElement('div');
  document.body.append(container);
  render(<Panel />, container);
  await flush();
  return { ctx, instance };
}

// Run hook effects (store subscriptions, menu listeners) on the next task instead of the next frame.
options.requestAnimationFrame = (callback) => setTimeout(callback);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const flush = async () => {
  await tick();
  await tick();
};
const stored = (ctx: ReturnType<typeof createTestContext>): BookmarksData => JSON.parse(ctx.storage.data.get(STORAGE_KEY)!).data;
const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T & HTMLElement>(selector)!;
const $$ = (selector: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(selector)];
const byText = (selector: string, text: string, root: ParentNode = document) => {
  const found = $$(selector, root).find((el) => el.textContent?.trim() === text);
  if (!found) throw new Error(`no ${selector} with text "${text}"`);
  return found;
};

async function menu(root: Element, item: string) {
  $('.ptm-menu > button', root).click();
  await flush();
  byText('[role="menuitem"]', item, root).click();
  await flush();
}

async function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

async function submit() {
  $<HTMLFormElement>('.ptm-modal form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
}

const folderEl = (id: string) => $(`[data-sort-kind="folders"][data-sort-item="${id}"]`);
const tradeEl = (id: string) => $(`[data-sort-kind="trades"][data-sort-item="${id}"]`);

afterEach(() => {
  if (container) render(null, container);
  document.body.innerHTML = '';
  setLocale('en');
});

describe('bookmarks feature', () => {
  it('declares the sidebar tab', () => {
    expect(bookmarksFeature.sidebarTab).toMatchObject({ order: 1 });
    setLocale('de');
    expect(bookmarksFeature.sidebarTab!.label()).toBe('Lesezeichen');
  });

  it('shows the empty state without folders', async () => {
    await setup();
    expect($('.ptm-empty').textContent).toContain('They work in every new league');
    expect(byText('button', 'New folder')).toBeTruthy();
  });
});

describe('folders and trades', () => {
  it('renders folders, expands persistently and builds links for the current league', async () => {
    const { ctx } = await setup({
      folders: [folder('a', [trade('1'), trade('2', { savedLeague: 'Standard', completedAt: AT })], { icon: 'chaos' }), folder('b')],
      expanded: ['a'],
    });
    expect($$('.ptm-bm-folder__title').map((el) => el.textContent)).toEqual(['Folder a', 'Folder b']);
    expect($<HTMLImageElement>('.ptm-bm-folder__icon', folderEl('a')).src).toContain('/folder-icons/chaos.png');

    const link = $<HTMLAnchorElement>('a', tradeEl('1'));
    expect(link.getAttribute('href')).toBe(`/trade2/search/poe2/Runes%20of%20Aldur/${ID}1`);
    expect($('.ptm-bm-badge', tradeEl('1'))).toBeNull();
    expect($('.ptm-bm-badge', tradeEl('2')).getAttribute('title')).toBe('Saved in Standard');
    expect(tradeEl('2').classList.contains('ptm-bm-trade--completed')).toBe(true);

    $('.ptm-bm-folder__toggle', folderEl('b')).click();
    await flush();
    expect(JSON.parse(ctx.storage.data.get(EXPANDED_KEY)!).data).toEqual(['a', 'b']);
    expect(byText('.ptm-bm-folder__empty', 'No searches in this folder yet.')).toBeTruthy();

    byText('button', 'Collapse folders').click();
    await flush();
    expect($$('.ptm-bm-trade')).toHaveLength(0);
  });

  it('opens in the league of the page, falling back to the saved league', async () => {
    const { ctx } = await setup({ folders: [folder('a', [trade('1', { savedLeague: 'Dawn' })])], expanded: ['a'], league: null });
    expect($('a', tradeEl('1')).getAttribute('href')).toBe(`/trade2/search/poe2/Dawn/${ID}1`);
    expect($('.ptm-bm-badge', tradeEl('1'))).toBeNull();
    ctx.location.set({ type: 'search', realm: 'poe2', league: 'Runes of Aldur', id: null, live: false });
    await flush();
    expect($('a', tradeEl('1')).getAttribute('href')).toBe(`/trade2/search/poe2/Runes%20of%20Aldur/${ID}1`);
    expect($('.ptm-bm-badge', tradeEl('1')).textContent).toBe('other league');
  });

  it('creates a folder with an icon from the picker', async () => {
    const { ctx } = await setup();
    byText('button', 'New folder').click();
    await flush();
    const submitButton = $<HTMLButtonElement>('.ptm-modal__footer button');
    expect(submitButton.disabled).toBe(true);
    await type($('.ptm-modal input'), '  Rares ');
    $('[aria-label="Lich"]').click();
    await flush();
    $('[aria-label="Chaos"]').click();
    await flush();
    $('[aria-label="Chaos"]').click();
    await flush();
    expect($$('.ptm-bm-icons__cell[aria-pressed="true"]')).toHaveLength(0);
    $('[aria-label="Divine"]').click();
    await flush();
    expect($('[aria-label="Divine"]').getAttribute('aria-pressed')).toBe('true');
    await submit();
    expect(stored(ctx).folders).toMatchObject([{ title: 'Rares', icon: 'divine', trades: [] }]);
    expect($('.ptm-modal')).toBeNull();
  });

  it('saves the current search with a suggested title', async () => {
    const { ctx } = await setup({ folders: [folder('a')], expanded: ['a'] });
    const save = byText('button', 'Save current search') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.parentElement!.title).toBe('Open a search first.');

    ctx.currentSearch.set(search('H4sInew'));
    await flush();
    expect(save.disabled).toBe(false);
    save.click();
    await vi.waitFor(() => expect($<HTMLInputElement>('.ptm-modal input').value).toBe('Gold Amulet'));
    await type($('.ptm-modal input'), 'My amulet');
    await submit();
    expect(stored(ctx).folders[0]!.trades).toMatchObject([{ title: 'My amulet', searchId: 'H4sInew', savedLeague: 'Runes of Aldur' }]);
    expect(ctx.toast.toasts.get().map((x) => x.message)).toContain('Search saved.');
    expect(ctx.searchNames.get()).toEqual({ H4sInew: 'My amulet' });
  });

  it('renames, completes, overwrites and deletes a trade', async () => {
    const { ctx } = await setup({ folders: [folder('a', [trade('1'), trade('2')])], expanded: ['a'] });

    await menu(tradeEl('1'), 'Rename');
    expect($<HTMLInputElement>('.ptm-modal input').value).toBe('Trade 1');
    await type($('.ptm-modal input'), 'Helmet');
    await submit();
    expect($('a', tradeEl('1')).textContent).toBe('Helmet');

    await menu(tradeEl('1'), 'Mark as completed');
    expect(stored(ctx).folders[0]!.trades[0]!.completedAt).not.toBeNull();

    // Overwrite only shows with a search on screen.
    $('.ptm-menu > button', tradeEl('1')).click();
    await flush();
    expect($$('[role="menuitem"]').map((el) => el.textContent)).not.toContain('Overwrite with current search');
    document.dispatchEvent(new MouseEvent('mousedown'));
    await flush();
    ctx.currentSearch.set(search('H4sIother', 'Standard'));
    await flush();
    await menu(tradeEl('1'), 'Overwrite with current search');
    expect(stored(ctx).folders[0]!.trades[0]).toMatchObject({ title: 'Helmet', searchId: 'H4sIother', savedLeague: 'Standard' });

    await menu(tradeEl('2'), 'Delete');
    byText('.ptm-modal button', 'Cancel').click();
    await flush();
    expect(stored(ctx).folders[0]!.trades).toHaveLength(2);
    await menu(tradeEl('2'), 'Delete');
    byText('.ptm-modal__footer button', 'Delete').click();
    await flush();
    expect(stored(ctx).folders[0]!.trades.map((x) => x.id)).toEqual(['1']);
  });

  it('checks the stats against the current league', async () => {
    const { ctx } = await setup({
      folders: [folder('a', [trade('1'), trade('2', { payload: { query: { stats: [{ type: 'and', filters: [{ id: 'explicit.stat_9' }] }] } } })])],
      expanded: ['a'],
    });
    await menu(tradeEl('1'), 'Check in current league');
    await vi.waitFor(() => expect(ctx.toast.toasts.get().at(-1)?.message).toBe('All stats exist in Runes of Aldur.'));
    await menu(tradeEl('2'), 'Check in current league');
    await vi.waitFor(() => expect(ctx.toast.toasts.get().at(-1)).toMatchObject({ kind: 'warning', message: '1 stats no longer exist: explicit.stat_9' }));
  });

  it('archives, restores and deletes archived folders', async () => {
    const { ctx } = await setup({ folders: [folder('a', [trade('1')]), folder('b')], expanded: ['a'] });
    expect($$('button').map((b) => b.textContent)).not.toContain('Show archive');
    expect($$('[role="menuitem"]')).toHaveLength(0);

    await menu(folderEl('a'), 'Archive');
    expect($$('.ptm-bm-folder__title').map((el) => el.textContent)).toEqual(['Folder b']);
    byText('button', 'Show archive').click();
    await flush();
    expect($$('.ptm-bm-folder__title').map((el) => el.textContent)).toEqual(['Folder a']);
    $('.ptm-bm-folder__toggle', folderEl('a')).click();
    await flush();
    expect($$('.ptm-bm-trade')).toHaveLength(0);

    await menu(folderEl('a'), 'Restore');
    expect(stored(ctx).folders.map((f) => [f.id, f.archivedAt])).toEqual([['b', null], ['a', null]]);
    expect($$('button').map((b) => b.textContent)).not.toContain('Back to active folders');

    await menu(folderEl('b'), 'Archive');
    byText('button', 'Show archive').click();
    await flush();
    $('.ptm-menu > button', folderEl('b')).click();
    await flush();
    byText('[role="menuitem"]', 'Delete').click();
    await flush();
    expect($('.ptm-modal').textContent).toContain('Delete folder "Folder b" with 0 searches for good?');
    byText('.ptm-modal__footer button', 'Delete').click();
    await flush();
    expect(stored(ctx).folders.map((f) => f.id)).toEqual(['a']);
  });

  it('edits a folder and exports its share code', async () => {
    await setup({ folders: [folder('a', [trade('1')], { icon: 'chaos' })] });
    await menu(folderEl('a'), 'Edit');
    expect($<HTMLInputElement>('.ptm-modal input').value).toBe('Folder a');
    expect($('[aria-label="Chaos"]').getAttribute('aria-pressed')).toBe('true');
    await type($('.ptm-modal input'), 'Renamed');
    await submit();
    expect($('.ptm-bm-folder__title').textContent).toBe('Renamed');

    await menu(folderEl('a'), 'Export');
    const code = $<HTMLTextAreaElement>('.ptm-modal textarea').value;
    expect(code).toBe(encodeFolderCode({ title: 'Renamed', icon: 'chaos', trades: [trade('1')] }));
  });

  it('imports a folder code with a live preview', async () => {
    const { ctx } = await setup();
    byText('button', 'Import folder').click();
    await flush();
    const textarea = $<HTMLTextAreaElement>('.ptm-modal textarea');
    await type(textarea, 'nonsense');
    expect($('.ptm-modal .ptm-alert--error').textContent).toBe('The folder code is invalid.');
    expect($<HTMLButtonElement>('.ptm-modal__footer button').disabled).toBe(true);

    await type(textarea, encodeFolderCode({ title: 'Shared', icon: 'lich', trades: [trade('1'), trade('2')] }));
    expect($('.ptm-bm-preview').textContent).toBe('Shared (2 searches)');
    await submit();
    expect(stored(ctx).folders).toMatchObject([{ title: 'Shared', icon: 'lich', archivedAt: null }]);
    expect(stored(ctx).folders[0]!.trades).toHaveLength(2);
  });

  it('loads a backup file and reports counts', async () => {
    const { ctx } = await setup({ folders: [folder('a')] });
    const backup = encodeBackup({ folders: [folder('x', [trade('1')]), folder('y', [], { archivedAt: AT })] });
    const input = $<HTMLInputElement>('input[type="file"]');
    expect(input.accept).toBe('.json,.txt');
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([backup], 'backup.json')] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(stored(ctx).folders).toHaveLength(3));
    expect(stored(ctx).folders.map((f) => [f.title, f.archivedAt])).toEqual([['Folder a', null], ['Folder x', null], ['Folder y', AT]]);
    expect(ctx.toast.toasts.get().at(-1)).toMatchObject({ kind: 'success', message: 'Imported 2 folders, skipped 0.' });

    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['{"nope":1}'], 'bad.json')] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(ctx.toast.toasts.get().at(-1)).toMatchObject({ kind: 'error', message: 'The backup file has an unknown format.' }));
  });

  it('names the backup file by date', () => {
    expect(backupFileName(new Date(2026, 9, 5))).toBe('poe2-trade-monkey-backup-2026-10-05.json');
  });

  it('reorders folders and trades with the arrow keys on the handle', async () => {
    const { ctx } = await setup({ folders: [folder('a', [trade('1'), trade('2')]), folder('b')], expanded: ['a'] });
    $('[data-sort-handle="a"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await flush();
    expect(stored(ctx).folders.map((f) => f.id)).toEqual(['b', 'a']);
    $('[data-sort-handle="2"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await flush();
    expect(stored(ctx).folders[1]!.trades.map((x) => x.id)).toEqual(['2', '1']);
  });

  it('moves a trade to another folder by dragging the handle', async () => {
    const { ctx } = await setup({ folders: [folder('a', [trade('1'), trade('2')]), folder('b', [trade('3')])], expanded: ['a', 'b'] });
    const box = (el: Element, top: number, bottom: number) =>
      (el.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 400, width: 400, height: bottom - top, x: 0, y: top, toJSON() {} }));
    box(folderEl('a'), 0, 100);
    box(tradeEl('1'), 30, 50);
    box(tradeEl('2'), 50, 70);
    box(folderEl('b'), 100, 200);
    box(tradeEl('3'), 130, 150);

    const handle = $('[data-sort-handle="1"]');
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 40, bubbles: true, cancelable: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 160 }));
    expect(tradeEl('1').classList.contains('ptm-bm-dragging')).toBe(true);
    expect($('.ptm-bm-drop-line')).not.toBeNull();
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 10, clientY: 160 }));
    await flush();
    expect(stored(ctx).folders.map((f) => f.trades.map((x) => x.id))).toEqual([['2'], ['3', '1']]);
    expect($('.ptm-bm-drop-line')).toBeNull();

    // Escape cancels.
    $('[data-sort-handle="2"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 40, bubbles: true, cancelable: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 160 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 10, clientY: 160 }));
    await flush();
    expect(stored(ctx).folders.map((f) => f.trades.map((x) => x.id))).toEqual([['2'], ['3', '1']]);
  });
});
