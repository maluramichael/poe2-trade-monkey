// Synthetic trade2 page for offline E2E tests. The real site needs a login and blocks automated
// browsers, so this serves the DOM snapshots from src/test/fixtures plus a tiny stand-in for the
// site's Vue 2 + Vuex app (`window.app.$store`) and answers every request via context.route.
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import type { BrowserContext, Route } from '@playwright/test';

const read = (path: string) => readFileSync(path, 'utf8');
const fixture = (name: string) => read(`src/test/fixtures/${name}`);

const USERSCRIPT = 'dist/poe2-trade-monkey.user.js';
if (!existsSync(USERSCRIPT)) throw new Error(`${USERSCRIPT} is missing, run "npm run build" first`);

export const QUERY = { status: { option: 'online' }, type: 'Gold Amulet', stats: [{ type: 'and', filters: [] }] };
/** Like the real site: the id is the gzip-compressed query, base64url-encoded ("H4sI..."). */
export const SEARCH_ID = gzipSync(JSON.stringify(QUERY)).toString('base64url');
export const PAGE_URL = `https://www.pathofexile.com/trade2/search/poe2/Standard/${SEARCH_ID}`;

const listingIds: string[] = JSON.parse(fixture('fetch.json')).result.map((r: { id: string }) => r.id);

/** Runs in the page: fake `window.app` and a `__fakeSite.search()` that issues the site's requests. */
const pageScript = `(() => {
  const isEmpty = (v) => v == null || (typeof v === 'object' && Object.keys(v).length === 0);
  const state = {
    persistent: {
      tab: 'search', realm: 'poe2', league: 'Standard', status: 'online',
      name: null, type: 'Gold Amulet', disc: null, term: null,
      filters: {}, stats: [{ type: 'and', filters: [] }],
    },
    transient: { searches: [], search: { active: null, pseudo: null }, blurred: false, advancedSearchHidden: false },
  };
  // Same logic as docs/dom/vuex-mutations.txt (Vue.set/Vue.delete become plain writes).
  const mutations = {
    setItem(t, e) { t.name = e.name || null; t.type = e.type || null; t.disc = e.disc || null; t.term = e.term || null; },
    setPropertyFilter(t, n) {
      if (!t.filters[n.group]) t.filters[n.group] = { filters: {} };
      const group = t.filters[n.group];
      if (!(group.filters && typeof group.filters === 'object' && !Array.isArray(group.filters))) group.filters = {};
      if (isEmpty(n.value)) delete group.filters[n.index]; else group.filters[n.index] = n.value;
    },
    setFilterGroupDisabled(t, n) {
      if (!t[n.type][n.group]) t[n.type][n.group] = {};
      t[n.type][n.group].disabled = n.disable;
    },
    setStatFilter(t, e) {
      if (e.index !== undefined) t.stats[e.group].filters.splice(e.index, 1, e.value);
      else t.stats[e.group].filters.push(e.value);
    },
    pushStatGroup(t, e) { t.stats.push({ filters: e.filters || [], type: e.type }); },
  };
  const subscribers = [];
  const $store = {
    state,
    commit(type, payload) {
      const mutation = mutations[type];
      if (!mutation) return console.error('[vuex] unknown mutation type: ' + type);
      mutation(state.persistent, payload);
      for (const handler of subscribers.slice()) handler({ type, payload }, state);
    },
    subscribe(handler) {
      subscribers.push(handler);
      return () => subscribers.splice(subscribers.indexOf(handler), 1);
    },
  };
  window.app = { $store };

  // The site posts the search via XHR and loads listings via fetch.
  window.__fakeSite = {
    search: () => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/trade2/search/poe2/Standard');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onerror = reject;
      xhr.onload = () => {
        const { id, result } = JSON.parse(xhr.responseText);
        fetch('/api/trade2/fetch/' + result.slice(0, 10).join(',') + '?query=' + id + '&realm=poe2')
          .then((r) => r.json()).then(resolve, reject);
      };
      xhr.send(JSON.stringify({ query: ${JSON.stringify(QUERY)}, sort: { price: 'asc' } }));
    }),
  };
})();`;

function pageHtml(): string {
  // search-panel.html is #trade (navigation + .top); the result list sits inside #trade too.
  const trade = fixture('search-panel.html').trim();
  const end = trade.lastIndexOf('</div>');
  const body = trade.slice(0, end) + fixture('result-rows.html').trim() + trade.slice(end);
  // Same wrappers as the live page (the layout feature measures #trade's parent) and a minimal
  // stand-in for the site's row CSS: the item card sits right of the icon column, not at x=0.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Trade - Path of Exile</title>
<style>#vue3-portal .row { display: flex; } #vue3-portal .row > .left { flex: 0 0 110px; } #vue3-portal .row > .middle { flex: 1; }</style></head>
<body class="modern trade en_US"><div class="container-fluid full"><div class="content"><div class="wrapper">${body}</div></div></div>
<script>${pageScript}</script></body></html>`;
}

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

const DATA = /^\/api\/trade2\/data\/(stats|static|filters|leagues)$/;

/** Routes all traffic of the context (nothing goes online) and installs GM shim + userscript. */
export async function setupFakeSite(context: BrowserContext): Promise<void> {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'poe.ninja') return json(route, read('src/features/price-equivalent/ninja-overview.fixture.json'));
    if (url.hostname !== 'www.pathofexile.com') return route.fulfill({ status: 404, body: '' });
    const data = DATA.exec(url.pathname);
    if (data) return json(route, fixture(`${data[1]}.json`));
    if (url.pathname === '/api/trade2/search/poe2/Standard' && route.request().method() === 'POST') {
      return json(route, { id: SEARCH_ID, total: 141, result: listingIds });
    }
    if (url.pathname.startsWith('/api/trade2/fetch/')) return json(route, fixture('fetch.json'));
    if (url.pathname.startsWith('/trade2/')) return route.fulfill({ status: 200, contentType: 'text/html', body: pageHtml() });
    return route.fulfill({ status: 404, body: '' });
  });
  await context.addInitScript({ content: read('e2e/gm-shim.js') + '\n' + read(USERSCRIPT) });
}
