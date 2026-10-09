/** The trade app is Vue 2.6 with Vuex, exposed by the site as `window.app` (verified 2026-10-05). */
export interface VuexStore {
  state: { persistent: unknown; transient: unknown };
  commit(type: string, payload?: unknown): void;
  subscribe(handler: (mutation: { type: string; payload: unknown }) => void): () => void;
  /** Vuex internals (mutation name -> handlers), only used to check that a mutation exists. */
  _mutations?: Record<string, unknown>;
}

export interface TradeApp {
  $store: VuexStore;
}

export function findTradeApp(win: Window): TradeApp | null {
  const candidate =
    (win as unknown as { app?: TradeApp }).app ??
    (win.document.querySelector('#trade') as (Element & { __vue__?: TradeApp }) | null)?.__vue__;
  return candidate?.$store ? candidate : null;
}

/** Resolves once the app is mounted. Polls because the site gives no event for it. */
export function waitForTradeApp(win: Window, timeoutMs = 30_000): Promise<TradeApp> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const app = findTradeApp(win);
      if (app) return resolve(app);
      if (Date.now() - started > timeoutMs) return reject(new Error('trade app not found'));
      win.setTimeout(tick, 100);
    };
    tick();
  });
}
