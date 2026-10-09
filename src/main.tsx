import { render } from 'preact';
import type { AppContext } from './app/context';
import { trackCurrentSearch } from './app/currentSearch';
import { FeatureHost } from './app/featureHost';
import { LeagueService } from './app/leagues';
import { loadSettings, type Settings } from './app/settings';
import { createToaster } from './app/toaster';
import { Store } from './core/store';
import { detectLocale, getLocale, setLocale } from './core/i18n';
import { log } from './core/log';
import { GmStorage } from './core/storage';
import { features } from './features';
import { injectPageScript, PageBridge } from './site/bridge/client';
import { trackLocation } from './site/location';
import { ResultsObserver } from './site/results';
import { sel } from './site/selectors';
import { TradeData } from './site/tradeData';
import { App } from './ui/App';
import coreCss from './ui/core.css';

declare global {
  interface Window {
    __ptmLoaded?: boolean;
  }
}

// The bridge listens before the page script exists, and the page script is injected at
// document-start so it hooks the site's XHR/fetch before the site's own code runs.
const bridge = new PageBridge(window);
const firstCopy = claimPage();
if (firstCopy) injectPageScript(`(${__ptmPageScript.toString()})();`);

async function boot(): Promise<void> {
  await domReady();
  // No trade form (e.g. a Cloudflare check page): apply nothing until the app shows up.
  if (!document.querySelector(sel.tradeRoot) && !(await waitForApp())) return inactive();

  // Apply settings, sidebar padding and early features before the first paint after
  // DOMContentLoaded, so the page does not jump once the Vue app is ready.
  const storage = new GmStorage();
  const settings = await loadSettings(storage);
  const { location } = trackLocation(window);

  applyLanguage(settings.get());
  applySidebarState(settings.get());
  const coreStyle = addStyle(coreCss, 'core');

  const ctx: AppContext = {
    win: window,
    doc: document,
    bridge,
    storage,
    settings,
    location,
    currentSearch: trackCurrentSearch(location, bridge),
    leagues: new LeagueService(location),
    searchNames: new Store<Record<string, string>>({}),
    results: new ResultsObserver(bridge, document),
    data: new TradeData(),
    toast: createToaster(),
  };
  const host = new FeatureHost(features, ctx);
  host.startEarly();

  if (!(await waitForApp())) {
    host.stop();
    document.documentElement.classList.remove('ptm-sidebar-open');
    coreStyle.remove();
    return inactive();
  }

  const root = document.createElement('div');
  root.id = 'ptm-root';
  root.lang = getLocale();
  settings.subscribe((next, previous) => {
    applySidebarState(next);
    if (next.language !== previous.language) {
      applyLanguage(next);
      root.lang = getLocale();
    }
  });

  ctx.results.start();
  host.start();

  document.body.append(root);
  const renderApp = () => render(<App ctx={ctx} host={host} />, root);
  renderApp();
  // Strings are resolved at render time: re-render the shell and restart features that render
  // into the trade page themselves.
  settings.subscribe((next, previous) => {
    if (next.language === previous.language) return;
    renderApp();
    void host.restart();
  });
  document.documentElement.classList.add('ptm-ready');

  log.info(`v${__VERSION__} ready with ${features.length} features`);
}

function waitForApp(): Promise<boolean> {
  return Promise.race([bridge.whenReady().then(() => true), delay(30_000).then(() => false)]);
}

function inactive(): void {
  log.info('trade app not found on this page, staying inactive');
}

/**
 * Guard against running twice (two installed copies, dev loader plus manager). The flag lives in
 * the DOM because each userscript manager has its own sandboxed window.
 */
function claimPage(): boolean {
  const html = document.documentElement;
  if (!html) {
    if (window.__ptmLoaded) return false;
    window.__ptmLoaded = true;
    return true;
  }
  if (html.dataset.ptmLoaded) return false;
  html.dataset.ptmLoaded = 'true';
  return true;
}

function applyLanguage(settings: Settings): void {
  setLocale(settings.language === 'auto' ? detectLocale(location.hostname) : settings.language);
}

function applySidebarState(settings: Settings): void {
  document.documentElement.classList.toggle('ptm-sidebar-open', !settings.sidebarCollapsed);
}

function addStyle(css: string, name: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.dataset.ptm = name;
  style.textContent = css;
  document.head.append(style);
  return style;
}

function domReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (firstCopy) boot().catch((error) => log.error('startup failed', error));
