/**
 * Runs in the page context (injected as a <script> by the userscript). It must stay small and
 * free of userscript APIs: it only observes the site's traffic, exposes the Vuex store through
 * commands and reports back via CustomEvents.
 */
import { CONTENT_TO_PAGE, PAGE_TO_CONTENT, type CommandEnvelope, type PageMessage } from '../bridge/protocol';
import { installNetworkHooks } from './network';
import { waitForTradeApp, type TradeApp } from './vue';

declare global {
  interface Window {
    __ptmPageBridge?: boolean;
  }
}

function post(message: PageMessage): void {
  window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify(message) }));
}

function handleCommand(app: TradeApp, command: CommandEnvelope): PageMessage {
  const { requestId } = command;
  try {
    switch (command.kind) {
      case 'getState':
        return { kind: 'reply', requestId, ok: true, value: JSON.parse(JSON.stringify(app.$store.state.persistent)) };
      case 'commit':
        app.$store.commit(command.mutation, command.payload);
        return { kind: 'reply', requestId, ok: true, value: null };
    }
  } catch (error) {
    return { kind: 'reply', requestId, ok: false, error: String(error) };
  }
}

if (!window.__ptmPageBridge) {
  window.__ptmPageBridge = true;

  installNetworkHooks(window, {
    onSearch: (captured) => post({ kind: 'search', captured }),
    onListings: (results) => post({ kind: 'listings', results }),
  });

  waitForTradeApp(window).then(
    (app) => {
      window.addEventListener(CONTENT_TO_PAGE, (event) => {
        const detail = (event as CustomEvent<string>).detail;
        if (typeof detail !== 'string') return;
        post(handleCommand(app, JSON.parse(detail) as CommandEnvelope));
      });
      app.$store.subscribe((mutation) => post({ kind: 'mutation', type: mutation.type }));
      post({ kind: 'ready' });
    },
    () => {
      // Not a trade page with the Vue app (login, maintenance): features stay inactive.
    },
  );
}
