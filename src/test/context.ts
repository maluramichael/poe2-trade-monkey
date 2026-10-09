import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import type { AppContext } from '../app/context';
import type { CurrentSearch } from '../app/currentSearch';
import { LeagueService } from '../app/leagues';
import { DEFAULT_SETTINGS, type Settings } from '../app/settings';
import { createToaster } from '../app/toaster';
import { MemoryStorage } from '../core/storage';
import { Store } from '../core/store';
import { PageBridge } from '../site/bridge/client';
import { PAGE_TO_CONTENT, type CapturedSearch, type PageMessage } from '../site/bridge/protocol';
import { ResultsObserver } from '../site/results';
import { TradeData } from '../site/tradeData';
import type { TradeLocation } from '../site/tradeLocation';
import type { FetchResult } from '../site/tradeTypes';

/** Mutation names the real site knows, e.g. "setItem" from "## persistent/setItem". */
const KNOWN_MUTATIONS = new Set(
  // node:url's URL, the global one is happy-dom's and drops the file: base.
  [...readFileSync(fileURLToPath(new NodeURL('../../docs/dom/vuex-mutations.txt', import.meta.url)), 'utf8').matchAll(/^## (\S+)/gm)].map(
    (match) => match[1]!.split('/').pop()!,
  ),
);

export interface TestContext extends AppContext {
  storage: MemoryStorage;
  /** Commits sent to the page, in order. */
  commits: { mutation: string; payload: unknown }[];
  /** Simulates a message from the page script. */
  fromPage(message: PageMessage): void;
  emitSearch(captured: CapturedSearch): void;
  emitListings(results: FetchResult[]): void;
}

/**
 * AppContext for unit tests: memory storage, stores you can set directly, a bridge whose
 * commands are answered locally (getState returns `pageState`, commits are recorded).
 */
export function createTestContext(options: {
  location?: TradeLocation | null;
  settings?: Partial<Settings>;
  pageState?: unknown;
  data?: Partial<{ stats: unknown; static: unknown; filters: unknown; leagues: unknown }>;
} = {}): TestContext {
  const storage = new MemoryStorage();
  const location = new Store<TradeLocation | null>(options.location ?? null);
  const bridge = new PageBridge(window);
  const commits: TestContext['commits'] = [];

  bridge.send = (async (command: { kind: string; mutation?: string; payload?: unknown }) => {
    if (command.kind === 'commit') {
      // Like the page bridge: unknown names are rejected and never reach the store.
      if (!KNOWN_MUTATIONS.has(command.mutation!)) throw new Error('unknown-mutation: ' + command.mutation);
      commits.push({ mutation: command.mutation!, payload: command.payload });
      return null;
    }
    return structuredClone(options.pageState ?? null);
  }) as PageBridge['send'];

  const fetchJson = async (path: string) => {
    const key = path.includes('/stats') ? 'stats' : path.includes('/static') ? 'static' : path.includes('/filters') ? 'filters' : 'leagues';
    const value = options.data?.[key];
    if (value === undefined) throw new Error(`no test data for ${path}`);
    return value;
  };

  const fromPage = (message: PageMessage) =>
    window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify(message) }));

  return {
    win: window,
    doc: document,
    bridge,
    storage,
    settings: new Store<Settings>({ ...DEFAULT_SETTINGS, ...options.settings }),
    location,
    currentSearch: new Store<CurrentSearch | null>(null),
    leagues: new LeagueService(location),
    searchNames: new Store<Record<string, string>>({}),
    results: new ResultsObserver(bridge, document, 0),
    data: new TradeData(fetchJson),
    toast: createToaster(),
    commits,
    fromPage,
    emitSearch: (captured) => fromPage({ kind: 'search', captured }),
    emitListings: (results) => fromPage({ kind: 'listings', results }),
  };
}
