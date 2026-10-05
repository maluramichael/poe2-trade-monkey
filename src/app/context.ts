import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { KeyValueStorage } from '../core/storage';
import type { Store } from '../core/store';
import type { PageBridge } from '../site/bridge/client';
import type { ResultsObserver } from '../site/results';
import type { TradeLocation } from '../site/tradeLocation';
import type { LeagueService } from './leagues';
import type { Settings } from './settings';
import type { Toaster } from './toaster';

/** Everything a feature may use. Passed to `Feature.start` and available in UI via `useApp()`. */
export interface AppContext {
  win: Window;
  doc: Document;
  bridge: PageBridge;
  storage: KeyValueStorage;
  settings: Store<Settings>;
  /** Current trade URL, `null` on non-search pages (history, settings, about). */
  location: Store<TradeLocation | null>;
  leagues: LeagueService;
  results: ResultsObserver;
  toast: Toaster;
}

export const AppContextValue = createContext<AppContext | null>(null);

export function useApp(): AppContext {
  const ctx = useContext(AppContextValue);
  if (!ctx) throw new Error('useApp() used outside of <AppContextValue.Provider>');
  return ctx;
}
