import type { TradeType } from '../../site/tradeLocation';
import type { SearchPayload } from '../../site/tradeTypes';

export interface BookmarkTrade {
  id: string;
  title: string;
  type: TradeType;
  realm: string;
  /** trade2 search id. League-independent, so the trade opens in whatever league is selected. */
  searchId: string;
  /** League at save time, '' when unknown (imported from Better Trading). */
  savedLeague: string;
  /** Query and sort for the `?q=` fallback, `null` when unknown. */
  payload: SearchPayload | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkFolder {
  id: string;
  title: string;
  /** Id from icons.ts. */
  icon: string | null;
  /** ISO timestamp, `null` when active. */
  archivedAt: string | null;
  trades: BookmarkTrade[];
}

export interface BookmarksData {
  folders: BookmarkFolder[];
}

/** A folder from an import, ids are assigned when it is added. */
export type NewTrade = Omit<BookmarkTrade, 'id'>;
export interface NewFolder extends Omit<BookmarkFolder, 'id' | 'trades'> {
  trades: NewTrade[];
}

export const newId = (): string => crypto.randomUUID();
