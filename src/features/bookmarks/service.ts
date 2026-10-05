import type { AppContext } from '../../app/context';
import type { CurrentSearch } from '../../app/currentSearch';
import { persistedStore } from '../../core/storage';
import type { Store } from '../../core/store';
import { newId, type BookmarkFolder, type BookmarkTrade, type BookmarksData, type NewFolder } from './model';

export const STORAGE_KEY = 'bookmarks:data';

export async function createBookmarksService(ctx: Pick<AppContext, 'storage' | 'searchNames'>): Promise<BookmarksService> {
  const data = await persistedStore<BookmarksData>(ctx.storage, STORAGE_KEY, { defaultValue: { folders: [] }, schema: 1 });
  return new BookmarksService(data, ctx.searchNames);
}

/** Folders and their trades. Every operation replaces the data immutably; persistence is automatic. */
export class BookmarksService {
  readonly #unsubscribe: () => void;

  constructor(
    readonly data: Store<BookmarksData>,
    searchNames: Store<Record<string, string>>,
    private readonly now = () => new Date().toISOString(),
  ) {
    const sync = () => searchNames.set(namesOf(this.data.get()));
    this.#unsubscribe = this.data.subscribe(sync);
    sync();
  }

  dispose(): void {
    this.#unsubscribe();
  }

  addFolder(title: string, icon: string | null): string {
    const id = newId();
    this.#setFolders((folders) => [...folders, { id, title, icon, archivedAt: null, trades: [] }]);
    return id;
  }

  updateFolder(id: string, changes: { title: string; icon: string | null }): void {
    this.#mapFolder(id, (folder) => ({ ...folder, ...changes }));
  }

  archiveFolder(id: string): void {
    this.#mapFolder(id, (folder) => ({ ...folder, archivedAt: this.now() }));
  }

  /** Like Better Trading, a restored folder goes to the end of the list. */
  restoreFolder(id: string): void {
    this.#setFolders((folders) => {
      const folder = folders.find((f) => f.id === id);
      return folder ? [...folders.filter((f) => f !== folder), { ...folder, archivedAt: null }] : folders;
    });
  }

  deleteFolder(id: string): void {
    this.#setFolders((folders) => folders.filter((f) => f.id !== id));
  }

  /** `orderedIds` may be a subset (e.g. only active folders); the others keep their slots. */
  reorderFolders(orderedIds: string[]): void {
    this.#setFolders((folders) => reorder(folders, orderedIds));
  }

  addTrade(folderId: string, title: string, current: CurrentSearch): string {
    const id = newId();
    const now = this.now();
    const trade: BookmarkTrade = { id, title, ...fromSearch(current), completedAt: null, createdAt: now, updatedAt: now };
    this.#mapFolder(folderId, (folder) => ({ ...folder, trades: [...folder.trades, trade] }));
    return id;
  }

  updateTradeTitle(tradeId: string, title: string): void {
    this.#mapTrade(tradeId, (trade) => ({ ...trade, title, updatedAt: this.now() }));
  }

  /** "Save active search": keeps title and state, replaces the search. */
  overwriteTrade(tradeId: string, current: CurrentSearch): void {
    this.#mapTrade(tradeId, (trade) => ({ ...trade, ...fromSearch(current), updatedAt: this.now() }));
  }

  toggleCompleted(tradeId: string): void {
    this.#mapTrade(tradeId, (trade) => ({ ...trade, completedAt: trade.completedAt ? null : this.now() }));
  }

  deleteTrade(tradeId: string): void {
    this.#setFolders((folders) =>
      folders.map((f) => (f.trades.some((t) => t.id === tradeId) ? { ...f, trades: f.trades.filter((t) => t.id !== tradeId) } : f)),
    );
  }

  /** `toIndex` counts in the target list after the trade was taken out. */
  moveTrade(tradeId: string, toFolderId: string, toIndex: number): void {
    const trade = this.#findTrade(tradeId)?.trade;
    if (!trade || !this.data.get().folders.some((f) => f.id === toFolderId)) return;
    this.deleteTrade(tradeId);
    this.#mapFolder(toFolderId, (folder) => {
      const trades = [...folder.trades];
      trades.splice(Math.max(0, toIndex), 0, trade);
      return { ...folder, trades };
    });
  }

  reorderTrades(folderId: string, orderedIds: string[]): void {
    this.#mapFolder(folderId, (folder) => ({ ...folder, trades: reorder(folder.trades, orderedIds) }));
  }

  /**
   * Appends imported folders with fresh ids. `archived` overrides the archive state of every
   * folder; without it the folders keep their own `archivedAt`. Returns the number added.
   */
  importFolders(folders: NewFolder[], { archived }: { archived?: boolean } = {}): number {
    const now = this.now();
    const added: BookmarkFolder[] = folders.map((folder) => ({
      ...folder,
      id: newId(),
      archivedAt: archived === undefined ? folder.archivedAt : archived ? now : null,
      trades: folder.trades.map((trade) => ({ ...trade, id: newId() })),
    }));
    this.#setFolders((existing) => [...existing, ...added]);
    return added.length;
  }

  /** The bookmark for a search id, preferring active folders over archived ones. */
  findTradeBySearchId(searchId: string): { folder: BookmarkFolder; trade: BookmarkTrade } | null {
    const matches = this.data.get().folders.flatMap((folder) =>
      folder.trades.filter((t) => t.searchId === searchId).map((trade) => ({ folder, trade })),
    );
    return matches.find((m) => !m.folder.archivedAt) ?? matches[0] ?? null;
  }

  #findTrade(tradeId: string) {
    for (const folder of this.data.get().folders) {
      const trade = folder.trades.find((t) => t.id === tradeId);
      if (trade) return { folder, trade };
    }
    return null;
  }

  #setFolders(fn: (folders: BookmarkFolder[]) => BookmarkFolder[]): void {
    this.data.update((data) => ({ ...data, folders: fn(data.folders) }));
  }

  #mapFolder(id: string, fn: (folder: BookmarkFolder) => BookmarkFolder): void {
    this.#setFolders((folders) => folders.map((f) => (f.id === id ? fn(f) : f)));
  }

  #mapTrade(tradeId: string, fn: (trade: BookmarkTrade) => BookmarkTrade): void {
    const folderId = this.#findTrade(tradeId)?.folder.id;
    if (!folderId) return;
    this.#mapFolder(folderId, (folder) => ({ ...folder, trades: folder.trades.map((t) => (t.id === tradeId ? fn(t) : t)) }));
  }
}

function fromSearch({ location, payload }: CurrentSearch) {
  return { type: location.type, realm: location.realm, searchId: location.id, savedLeague: location.league, payload };
}

/** Puts the items named in `orderedIds` into that order, within the slots they already occupy. */
function reorder<T extends { id: string }>(items: T[], orderedIds: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = [...new Set(orderedIds)].flatMap((id) => byId.get(id) ?? []);
  const moving = new Set(ordered);
  let next = 0;
  return items.map((item) => (moving.has(item) ? ordered[next++]! : item));
}

function namesOf(data: BookmarksData): Record<string, string> {
  const names: Record<string, string> = {};
  for (const folder of data.folders) {
    if (folder.archivedAt) continue;
    for (const trade of folder.trades) names[trade.searchId] ??= trade.title;
  }
  return names;
}
