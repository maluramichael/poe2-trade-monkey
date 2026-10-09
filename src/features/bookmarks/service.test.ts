import type { CurrentSearch } from '../../app/currentSearch';
import { createTestContext } from '../../test/context';
import { createBookmarksService, type BookmarksService } from './service';

const search = (id: string, league = 'Standard', extra: Partial<CurrentSearch['location']> = {}): CurrentSearch => ({
  location: { type: 'search', realm: 'poe2', league, id, live: false, ...extra },
  payload: { query: { type: 'Gold Amulet' }, sort: { price: 'asc' } },
  total: 12,
});

let ctx: ReturnType<typeof createTestContext>;
let service: BookmarksService;

beforeEach(async () => {
  ctx = createTestContext();
  service = await createBookmarksService(ctx);
});

const folders = () => service.data.get().folders;
const trades = (folderId: string) => folders().find((f) => f.id === folderId)!.trades;

describe('BookmarksService folders', () => {
  it('starts empty and persists every change under bookmarks:data', async () => {
    expect(folders()).toEqual([]);
    const id = service.addFolder('Rares', 'chaos');
    expect(folders()).toEqual([{ id, title: 'Rares', icon: 'chaos', archivedAt: null, trades: [] }]);
    expect(JSON.parse(ctx.storage.data.get('bookmarks:data')!)).toEqual({ schema: 1, data: service.data.get() });

    const reloaded = await createBookmarksService(ctx);
    expect(reloaded.data.get()).toEqual(service.data.get());
  });

  it('updates title and icon immutably', () => {
    const id = service.addFolder('A', null);
    const before = service.data.get();
    service.updateFolder(id, { title: 'B', icon: 'lich' });
    expect(folders()[0]).toMatchObject({ title: 'B', icon: 'lich' });
    expect(before.folders[0]!.title).toBe('A');
  });

  it('archives and restores, restore moves the folder to the end', () => {
    const a = service.addFolder('A', null);
    const b = service.addFolder('B', null);
    service.archiveFolder(a);
    expect(folders()[0]!.archivedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    service.restoreFolder(a);
    expect(folders().map((f) => [f.id, f.archivedAt])).toEqual([[b, null], [a, null]]);
  });

  it('deletes folders', () => {
    const a = service.addFolder('A', null);
    service.deleteFolder(a);
    expect(folders()).toEqual([]);
  });

  it('reorders all folders or only a subset in their own slots', () => {
    const [a, b, c] = ['A', 'B', 'C'].map((t) => service.addFolder(t, null)) as [string, string, string];
    service.reorderFolders([c, a, b]);
    expect(folders().map((f) => f.id)).toEqual([c, a, b]);
    service.reorderFolders([b, c]);
    expect(folders().map((f) => f.id)).toEqual([b, a, c]);
  });
});

describe('BookmarksService trades', () => {
  let folder: string;
  beforeEach(() => {
    folder = service.addFolder('F', null);
  });

  it('adds a trade from the current search', () => {
    const id = service.addTrade(folder, 'Amulet', search('H4sIone', 'Runes of Aldur'));
    expect(trades(folder)).toEqual([
      expect.objectContaining({
        id, title: 'Amulet', type: 'search', realm: 'poe2', searchId: 'H4sIone', savedLeague: 'Runes of Aldur',
        payload: { query: { type: 'Gold Amulet' }, sort: { price: 'asc' } }, completedAt: null,
      }),
    ]);
  });

  it('renames, overwrites with the active search and toggles completion', () => {
    const id = service.addTrade(folder, 'Old', search('H4sIone'));
    service.updateTradeTitle(id, 'New');
    service.overwriteTrade(id, search('H4sItwo', 'Runes of Aldur', { type: 'exchange' }));
    expect(trades(folder)[0]).toMatchObject({ id, title: 'New', type: 'exchange', searchId: 'H4sItwo', savedLeague: 'Runes of Aldur' });
    service.toggleCompleted(id);
    expect(trades(folder)[0]!.completedAt).not.toBeNull();
    service.toggleCompleted(id);
    expect(trades(folder)[0]!.completedAt).toBeNull();
  });

  it('deletes, reorders and moves trades between folders', () => {
    const other = service.addFolder('Other', null);
    const [a, b, c] = ['a', 'b', 'c'].map((t) => service.addTrade(folder, t, search(`H4sI${t}`))) as [string, string, string];
    service.reorderTrades(folder, [c, b, a]);
    expect(trades(folder).map((t) => t.id)).toEqual([c, b, a]);
    service.moveTrade(b, other, 0);
    service.moveTrade(c, other, 5);
    expect(trades(folder).map((t) => t.id)).toEqual([a]);
    expect(trades(other).map((t) => t.id)).toEqual([b, c]);
    service.moveTrade(c, other, 0);
    expect(trades(other).map((t) => t.id)).toEqual([c, b]);
    service.deleteTrade(c);
    expect(trades(other).map((t) => t.id)).toEqual([b]);
  });

  it('finds trades by search id, preferring active folders', () => {
    const archived = service.addFolder('Archive', null);
    service.addTrade(archived, 'archived', search('H4sIx'));
    service.archiveFolder(archived);
    expect(service.findTradeBySearchId('H4sIx')?.trade.title).toBe('archived');
    service.addTrade(folder, 'active', search('H4sIx'));
    expect(service.findTradeBySearchId('H4sIx')?.trade.title).toBe('active');
    expect(service.findTradeBySearchId('nope')).toBeNull();
  });

  it('keeps ctx.searchNames in sync with non-archived trades', () => {
    const id = service.addTrade(folder, 'My helmet', search('H4sIhelm'));
    expect(ctx.searchNames.get()).toEqual({ H4sIhelm: 'My helmet' });
    service.updateTradeTitle(id, 'Helm');
    expect(ctx.searchNames.get()).toEqual({ H4sIhelm: 'Helm' });
    service.archiveFolder(folder);
    expect(ctx.searchNames.get()).toEqual({});
    service.dispose();
    service.restoreFolder(folder);
    expect(ctx.searchNames.get()).toEqual({});
  });

  it('imports folders with fresh ids, optionally archived', () => {
    const existing = service.addTrade(folder, 'x', search('H4sIx'));
    const copy = structuredClone(folders()[0]!);
    expect(service.importFolders([copy], { archived: true })).toBe(1);
    const imported = folders()[1]!;
    expect(imported.id).not.toBe(folder);
    expect(imported.trades[0]!.id).not.toBe(existing);
    expect(imported.archivedAt).not.toBeNull();
    service.importFolders([copy]);
    expect(folders()[2]!.archivedAt).toBeNull();
  });

  describe('mergeFolders', () => {
    const imported = (title: string, ids: string[], archivedAt: string | null = null) => ({
      title, icon: null, archivedAt,
      trades: ids.map((searchId) => ({
        title: searchId, type: 'search' as const, realm: 'poe2', searchId, savedLeague: '', payload: null,
        completedAt: null, createdAt: '', updatedAt: '',
      })),
    });

    it('appends unknown folders with fresh ids', () => {
      expect(service.mergeFolders([imported('New', ['H4sIa', 'H4sIb'])])).toEqual({ folders: 1, trades: 2 });
      expect(folders().map((f) => f.title)).toEqual(['F', 'New']);
      expect(trades(folders()[1]!.id).every((t) => typeof t.id === 'string' && t.id)).toBe(true);
    });

    it('merges into a folder with the same trimmed title, adding only new search ids', () => {
      service.addTrade(folder, 'a', search('H4sIa'));
      expect(service.mergeFolders([imported(' F ', ['H4sIa', 'H4sIc'])])).toEqual({ folders: 0, trades: 1 });
      expect(folders()).toHaveLength(1);
      expect(trades(folder).map((t) => t.searchId)).toEqual(['H4sIa', 'H4sIc']);
      expect(service.mergeFolders([imported('f', [])])).toEqual({ folders: 1, trades: 0 });
    });

    it('is idempotent and writes once', () => {
      const backup = [imported('X', ['H4sIa']), imported('Y', ['H4sIb'], '2026-01-01T00:00:00.000Z')];
      const writes = vi.fn();
      service.data.subscribe(writes);
      expect(service.mergeFolders(backup)).toEqual({ folders: 2, trades: 2 });
      expect(writes).toHaveBeenCalledTimes(1);
      expect(service.mergeFolders(backup)).toEqual({ folders: 0, trades: 0 });
      expect(folders()).toHaveLength(3);
    });

    it('creates a new folder when the archive state differs', () => {
      expect(service.mergeFolders([imported('F', ['H4sIa'], '2026-01-01T00:00:00.000Z')])).toEqual({ folders: 1, trades: 1 });
      expect(folders()[1]!.archivedAt).not.toBeNull();
    });
  });
});
