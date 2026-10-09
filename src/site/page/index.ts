/**
 * Runs in the page context (injected as a <script> by the userscript). It must stay small and
 * free of userscript APIs: it only observes the site's traffic, exposes the Vuex store through
 * commands and reports back via CustomEvents.
 */
import { CONTENT_TO_PAGE, PAGE_TO_CONTENT, type CommandEnvelope, type PageMessage } from '../bridge/protocol';
import { handleCommand } from './commands';
import { installNetworkHooks } from './network';
import { waitForTradeApp } from './vue';

declare global {
  interface Window {
    __ptmPageBridge?: boolean;
  }
}

function post(message: PageMessage): void {
  window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify(message) }));
}

if (!window.__ptmPageBridge) {
  window.__ptmPageBridge = true;

  installNetworkHooks(window, {
    onSearch: (captured) => post({ kind: 'search', captured }),
    onListings: (results) => post({ kind: 'listings', results }),
    onRateLimited: (retryAfterMs) => post({ kind: 'rateLimited', retryAfterMs }),
  });

  waitForTradeApp(window).then(
    (app) => {
      window.addEventListener(CONTENT_TO_PAGE, (event) => {
        const detail = (event as CustomEvent<string>).detail;
        if (typeof detail !== 'string') return;
        let command: CommandEnvelope;
        try {
          command = JSON.parse(detail) as CommandEnvelope;
        } catch {
          return; // Broken message: ignore silently, nothing on the page may throw because of us.
        }
        post(handleCommand(app, command));
      });
      app.$store.subscribe((mutation) => post({ kind: 'mutation', type: mutation.type }));
      post({ kind: 'ready' });
    },
    () => {
      // Not a trade page with the Vue app (login, maintenance): features stay inactive.
    },
  );
}
