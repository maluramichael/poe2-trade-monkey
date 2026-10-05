// Minimal stand-in for a userscript manager, used by E2E tests and live smoke tests in a plain
// browser. Storage is localStorage, cross-origin requests fall back to fetch.
(() => {
  if (window.GM) return;
  const PREFIX = '__gm_shim:';
  window.GM = {
    getValue: async (key, fallback) => {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    },
    setValue: async (key, value) => localStorage.setItem(PREFIX + key, JSON.stringify(value)),
    deleteValue: async (key) => localStorage.removeItem(PREFIX + key),
    listValues: async () => Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).map((k) => k.slice(PREFIX.length)),
    setClipboard: async (text) => navigator.clipboard.writeText(text),
    // Like a real manager, cross-origin requests bypass CORS: they go through a binding that the
    // test harness exposes (Node fetch). Without the binding, plain fetch is used.
    xmlHttpRequest: (details) => {
      const request = { url: details.url, method: details.method || 'GET', headers: details.headers, data: details.data };
      const run = window.__ptmGmXhr
        ? window.__ptmGmXhr(request)
        : fetch(request.url, { method: request.method, headers: request.headers, body: request.data }).then(async (r) => ({
            status: r.status,
            responseText: await r.text(),
          }));
      run.then((response) => details.onload?.(response)).catch((error) => details.onerror?.(error));
    },
  };
  window.unsafeWindow = window;
})();
