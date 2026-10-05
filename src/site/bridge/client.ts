import { EventBus } from '../../core/events';
import type { FetchResult, PersistentState } from '../tradeTypes';
import {
  CONTENT_TO_PAGE,
  PAGE_TO_CONTENT,
  type CapturedSearch,
  type Command,
  type CommandResult,
  type PageMessage,
} from './protocol';

export interface BridgeEvents extends Record<string, unknown> {
  ready: undefined;
  search: CapturedSearch;
  listings: FetchResult[];
  /** A Vuex mutation happened on the site, e.g. "persistent/setStatFilter". */
  mutation: string;
}

/** Userscript side of the page bridge. */
export class PageBridge {
  readonly events = new EventBus<BridgeEvents>();
  #nextRequestId = 1;
  #ready = false;
  readonly #pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();

  constructor(private readonly win: Window = window) {
    win.addEventListener(PAGE_TO_CONTENT, (event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') this.#receive(JSON.parse(detail) as PageMessage);
    });
  }

  get isReady(): boolean {
    return this.#ready;
  }

  /** Resolves when the site's Vue app is available. */
  whenReady(): Promise<void> {
    if (this.#ready) return Promise.resolve();
    return new Promise((resolve) => {
      const off = this.events.on('ready', () => {
        off();
        resolve();
      });
    });
  }

  getState(): Promise<PersistentState> {
    return this.send({ kind: 'getState' });
  }

  /** Commits a Vuex mutation, e.g. `commit('persistent/setStatFilter', { group: 0, value })`. */
  commit(mutation: string, payload: unknown): Promise<null> {
    return this.send({ kind: 'commit', mutation, payload });
  }

  send<C extends Command>(command: C, timeoutMs = 5000): Promise<CommandResult<C>> {
    const requestId = this.#nextRequestId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new Error(`page bridge: "${command.kind}" timed out`));
      }, timeoutMs);
      this.#pending.set(requestId, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as CommandResult<C>);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.win.dispatchEvent(
        new CustomEvent(CONTENT_TO_PAGE, { detail: JSON.stringify({ ...command, requestId }) }),
      );
    });
  }

  #receive(message: PageMessage): void {
    switch (message.kind) {
      case 'ready':
        this.#ready = true;
        this.events.emit('ready', undefined);
        break;
      case 'search':
        this.events.emit('search', message.captured);
        break;
      case 'listings':
        this.events.emit('listings', message.results);
        break;
      case 'mutation':
        this.events.emit('mutation', message.type);
        break;
      case 'reply': {
        const pending = this.#pending.get(message.requestId);
        if (!pending) return;
        this.#pending.delete(message.requestId);
        if (message.ok) pending.resolve(message.value);
        else pending.reject(new Error(message.error));
        break;
      }
    }
  }
}

/**
 * Injects the page-context script. Must run before the site's own scripts (document-start).
 * Some environments run us before `<html>` exists; then we inject as soon as it appears, which
 * is still before any parser-inserted script runs.
 */
export function injectPageScript(code: string, doc: Document = document): void {
  const inject = (parent: Element) => {
    const script = doc.createElement('script');
    script.textContent = code;
    parent.append(script);
    script.remove();
  };
  const parent = doc.head ?? doc.documentElement;
  if (parent) return inject(parent);
  const observer = new MutationObserver(() => {
    if (!doc.documentElement) return;
    observer.disconnect();
    inject(doc.documentElement);
  });
  observer.observe(doc, { childList: true });
}
