import type { PageBridge } from './bridge/client';
import { sel } from './selectors';
import type { FetchResult } from './tradeTypes';

export interface ResultRow {
  element: HTMLElement;
  /** Listing hash from `data-id`. */
  id: string;
  /** API data for the row, captured from the site's own fetch. Missing only if capture failed. */
  data: FetchResult | undefined;
}

export type RowDecorator = (row: ResultRow) => void;

const MAX_CACHED_LISTINGS = 2000;

/**
 * Watches the result list and hands every row to the registered decorators exactly once per
 * decorator. Rows are re-offered when Vue re-renders them (the marker attribute is gone then).
 */
export class ResultsObserver {
  readonly #listings = new Map<string, FetchResult>();
  readonly #decorators = new Map<string, RowDecorator>();
  readonly #clearHandlers = new Set<() => void>();
  #observer: MutationObserver | null = null;
  #scheduled = false;
  #hadRows = false;

  constructor(
    bridge: PageBridge,
    private readonly doc: Document = document,
  ) {
    bridge.events.on('listings', (results) => {
      for (const result of results) this.#listings.set(result.id, result);
      this.#trimCache();
      this.#schedule();
    });
  }

  start(): void {
    if (this.#observer) return;
    this.#observer = new MutationObserver(() => this.#schedule());
    this.#observer.observe(this.doc.body, { childList: true, subtree: true });
    this.#schedule();
  }

  stop(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  /** Registers a decorator. Returns a function that unregisters it. */
  decorate(key: string, decorator: RowDecorator): () => void {
    this.#decorators.set(key, decorator);
    this.#schedule();
    return () => {
      this.#decorators.delete(key);
      for (const element of this.doc.querySelectorAll<HTMLElement>(sel.resultRow)) {
        element.removeAttribute(markerFor(key));
      }
    };
  }

  /** Called when the result list is emptied (new search, clear). */
  onClear(handler: () => void): () => void {
    this.#clearHandlers.add(handler);
    return () => this.#clearHandlers.delete(handler);
  }

  getListing(id: string): FetchResult | undefined {
    return this.#listings.get(id);
  }

  rows(): ResultRow[] {
    return [...this.doc.querySelectorAll<HTMLElement>(sel.resultRow)].map((element) => this.#toRow(element));
  }

  /** Runs all decorators now. Exposed for tests; normally batched per animation frame. */
  flush(): void {
    this.#scheduled = false;
    const elements = [...this.doc.querySelectorAll<HTMLElement>(sel.resultRow)];
    if (elements.length === 0) {
      if (this.#hadRows) for (const handler of this.#clearHandlers) handler();
      this.#hadRows = false;
      return;
    }
    this.#hadRows = true;
    for (const element of elements) {
      for (const [key, decorator] of this.#decorators) {
        const marker = markerFor(key);
        if (element.hasAttribute(marker)) continue;
        element.setAttribute(marker, '');
        try {
          decorator(this.#toRow(element));
        } catch (error) {
          console.error(`[ptm] decorator "${key}" failed`, error);
        }
      }
    }
  }

  #toRow(element: HTMLElement): ResultRow {
    const id = element.dataset.id ?? '';
    return { element, id, data: this.#listings.get(id) };
  }

  #schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    requestAnimationFrame(() => this.flush());
  }

  #trimCache(): void {
    const overflow = this.#listings.size - MAX_CACHED_LISTINGS;
    if (overflow <= 0) return;
    const keys = this.#listings.keys();
    for (let i = 0; i < overflow; i++) this.#listings.delete(keys.next().value!);
  }
}

function markerFor(key: string): string {
  return `data-ptm-${key}`;
}
