import { PageBridge } from './bridge/client';
import { PAGE_TO_CONTENT } from './bridge/protocol';
import { ResultsObserver } from './results';

function renderRows(ids: string[]) {
  document.body.innerHTML = `<div id="vue3-portal"><div class="results"><div class="resultset">${ids
    .map((id) => `<div class="row" data-id="${id}"><div class="middle"></div></div>`)
    .join('')}</div></div></div>`;
}

describe('ResultsObserver', () => {
  it('decorates each row once per decorator and attaches captured listing data', () => {
    const bridge = new PageBridge(window);
    const results = new ResultsObserver(bridge, document);
    window.dispatchEvent(
      new CustomEvent(PAGE_TO_CONTENT, {
        detail: JSON.stringify({ kind: 'listings', results: [{ id: 'a', listing: {}, item: { name: 'X' } }] }),
      }),
    );
    renderRows(['a', 'b']);
    const seen: string[] = [];
    results.decorate('test', (row) => seen.push(`${row.id}:${row.data?.item.name ?? '-'}`));
    results.flush();
    results.flush();
    expect(seen).toEqual(['a:X', 'b:-']);
  });

  it('re-offers rows after the decorator is removed and fires clear once', () => {
    const results = new ResultsObserver(new PageBridge(window), document);
    renderRows(['a']);
    let calls = 0;
    let clears = 0;
    results.onClear(() => clears++);
    const off = results.decorate('x', () => calls++);
    results.flush();
    off();
    results.decorate('x', () => calls++);
    results.flush();
    renderRows([]);
    results.flush();
    results.flush();
    expect(calls).toBe(2);
    expect(clears).toBe(1);
  });
});
