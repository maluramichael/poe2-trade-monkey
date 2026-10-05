import { render } from 'preact';
import type { AppContext } from './app/context';
import { FeatureHost } from './app/featureHost';
import { LeagueService } from './app/leagues';
import { loadSettings, type Settings } from './app/settings';
import { createToaster } from './app/toaster';
import { detectLocale, setLocale } from './core/i18n';
import { log } from './core/log';
import { GmStorage } from './core/storage';
import { features } from './features';
import { injectPageScript, PageBridge } from './site/bridge/client';
import { trackLocation } from './site/location';
import { ResultsObserver } from './site/results';
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
if (!window.__ptmLoaded) injectPageScript(__PAGE_SCRIPT__);

async function boot(): Promise<void> {
  await domReady();
  const appReady = await Promise.race([bridge.whenReady().then(() => true), delay(30_000).then(() => false)]);
  if (!appReady) {
    log.info('trade app not found on this page, staying inactive');
    return;
  }

  const storage = new GmStorage();
  const settings = await loadSettings(storage);
  const { location } = trackLocation(window);
  const leagues = new LeagueService(storage, location);
  void leagues.load();

  const ctx: AppContext = {
    win: window,
    doc: document,
    bridge,
    storage,
    settings,
    location,
    leagues,
    results: new ResultsObserver(bridge, document),
    toast: createToaster(),
  };

  applyLanguage(settings.get());
  applySidebarState(settings.get());
  settings.subscribe((next, previous) => {
    applySidebarState(next);
    if (next.language !== previous.language) applyLanguage(next);
  });

  addStyle(coreCss, 'core');
  ctx.results.start();
  const host = new FeatureHost(features, ctx);
  host.start();

  const root = document.createElement('div');
  root.id = 'ptm-root';
  document.body.append(root);
  const renderApp = () => render(<App ctx={ctx} host={host} />, root);
  renderApp();
  // Strings are resolved at render time, so a language switch only needs a re-render.
  settings.subscribe((next, previous) => {
    if (next.language !== previous.language) renderApp();
  });

  log.info(`v${__VERSION__} ready with ${features.length} features`);
}

function applyLanguage(settings: Settings): void {
  setLocale(settings.language === 'auto' ? detectLocale(location.hostname) : settings.language);
}

function applySidebarState(settings: Settings): void {
  document.documentElement.classList.toggle('ptm-sidebar-open', !settings.sidebarCollapsed);
}

function addStyle(css: string, name: string): void {
  const style = document.createElement('style');
  style.dataset.ptm = name;
  style.textContent = css;
  document.head.append(style);
}

function domReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Guard against running twice (two installed copies, dev loader plus manager).
if (!window.__ptmLoaded) {
  window.__ptmLoaded = true;
  boot().catch((error) => log.error('startup failed', error));
}
