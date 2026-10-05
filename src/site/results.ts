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
/** How long a row without captured API data waits for it before decorators run without data. */
const DATA_WAIT_MS = 1500;

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
  readonly #firstSeen = new WeakMap<Element, number>();
  #retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    bridge: PageBridge,
    private readonly doc: Document = document,
    /** Wait for late API data per row; tests pass 0 to decorate immediately. */
    private readonly dataWaitMs = DATA_WAIT_MS,
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
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#retryTimer = null;
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
    const now = Date.now();
    for (const element of elements) {
      // The listing fetch is captured asynchronously and may land a frame after the row renders.
      // Wait briefly for the data so features like price equivalents see it.
      if (!this.#listings.has(element.dataset.id ?? '')) {
        const seen = this.#firstSeen.get(element) ?? now;
        this.#firstSeen.set(element, seen);
        if (now - seen < this.dataWaitMs) {
          this.#retryLater(this.dataWaitMs - (now - seen));
          continue;
        }
      }
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

  #retryLater(ms: number): void {
    if (this.#retryTimer) return;
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null;
      this.#schedule();
    }, ms);
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
