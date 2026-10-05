import type { CurrentSearch } from '../../app/currentSearch';
import { createTranslator } from '../../core/i18n';
import { log } from '../../core/log';
import { persistedStore } from '../../core/storage';
import type { TradeType } from '../../site/tradeLocation';
import type { SearchPayload } from '../../site/tradeTypes';
import { IconHistory } from '../../ui/icons';
import type { Feature } from '../types';
import css from './feature.css';
import { historyPanel } from './Panel';
import { resolveSearchTitle } from '../../app/searchName';

const t = createTranslator({
  de: { label: 'Verlauf', description: 'Liste der letzten Suchen.', unnamed: 'Unbenannte Suche' },
  en: { label: 'History', description: 'List of your recent searches.', unnamed: 'Unnamed search' },
});

export interface HistoryEntry {
  id: string;
  title: string;
  /** ISO timestamp. */
  createdAt: string;
  type: TradeType;
  realm: string;
  league: string;
  searchId: string;
  live: boolean;
  payload: SearchPayload | null;
}

export const STORAGE_KEY = 'history:entries';
export const MAX_ENTRIES = 50;

export const historyFeature: Feature = {
  id: 'history',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  sidebarTab: { label: () => t('label'), icon: IconHistory, order: 2 },
  async start(ctx) {
    const entries = await persistedStore<HistoryEntry[]>(ctx.storage, STORAGE_KEY, { defaultValue: [], schema: 1 });

    const record = async (search: CurrentSearch) => {
      const { location, payload } = search;
      const title = (await resolveSearchTitle(ctx, search)) || t('unnamed');
      const [newest, ...rest] = entries.get();
      if (newest && newest.searchId === location.id && newest.league === location.league) {
        // The decoded query arrives after the first change: fill it into the entry just recorded.
        if (!newest.payload && payload) entries.set([{ ...newest, title, payload }, ...rest]);
        return;
      }
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        title,
        createdAt: new Date().toISOString(),
        type: location.type,
        realm: location.realm,
        league: location.league,
        searchId: location.id,
        live: location.live,
        payload,
      };
      entries.set([entry, ...entries.get()].slice(0, MAX_ENTRIES));
    };

    // Serialized so the duplicate check always sees the previous record.
    let queue = Promise.resolve();
    const onSearch = (search: CurrentSearch | null) => {
      if (!search) return;
      queue = queue.then(() => record(search)).catch((error) => log.error('recording history failed', error));
    };
    onSearch(ctx.currentSearch.get());
    const off = ctx.currentSearch.subscribe(onSearch);

    return { dispose: off, Panel: historyPanel(entries, ctx) };
  },
};
