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
    xmlHttpRequest: (details) => {
      fetch(details.url, { method: details.method || 'GET', headers: details.headers, body: details.data })
        .then(async (response) => details.onload?.({ status: response.status, responseText: await response.text() }))
        .catch((error) => details.onerror?.(error));
    },
  };
  window.unsafeWindow = window;
})();
