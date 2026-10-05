import type { FetchResult } from '../../site/tradeTypes';
import { createTestContext } from '../../test/context';
import { regroupSimilarFeature } from './index';

function listing(id: string, seller: string, amount: number): FetchResult {
  return {
    id,
    listing: { indexed: '', account: { name: seller }, price: { type: '~price', amount, currency: 'exalted' } },
    item: { name: 'Bramble Locket', typeLine: 'Gold Amulet', baseType: 'Gold Amulet' },
  };
}

const row = (id: string) =>
  `<div class="row" data-id="${id}"><div class="right"><div class="details"><div class="btns"></div></div></div></div>`;

function render(ids: string[]) {
  document.body.innerHTML = `<div id="vue3-portal"><div class="results"><div class="resultset">${ids.map(row).join('')}</div></div></div>`;
}

const resultset = () => document.querySelector('.resultset')!;
const hidden = () => [...document.querySelectorAll('.ptm-regroup-hidden')].map((el) => (el as HTMLElement).dataset.id);
const button = (id: string) => document.querySelector<HTMLButtonElement>(`[data-id="${id}"] .ptm-regroup-btn`);

describe('regroup-similar', () => {
  it('collapses consecutive identical listings, also across load-more batches', () => {
    const ctx = createTestContext();
    ctx.emitListings([listing('a', 'S1', 1), listing('b', 'S1', 1), listing('c', 'S2', 1), listing('d', 'S2', 1), listing('e', 'S2', 1), listing('f', 'S2', 2)]);
    render(['a', 'b', 'c', 'd']);
    const instance = regroupSimilarFeature.start(ctx) as { dispose(): void };
    ctx.results.flush();
    expect(hidden()).toEqual(['b', 'd']);
    expect(button('a')?.textContent).toBe('1 similar');

    button('c')!.click();
    expect(hidden()).toEqual(['b']);
    expect(document.querySelector('[data-id="d"]')!.classList.contains('ptm-regroup-shown')).toBe(true);

    // Load more appends e (joins the open group of c) and f (different price).
    resultset().insertAdjacentHTML('beforeend', row('e') + row('f'));
    ctx.results.flush();
    expect(button('c')?.textContent).toBe('2 similar');
    expect(hidden()).toEqual(['b']);
    expect(button('f')).toBeNull();

    button('c')!.click();
    expect(hidden()).toEqual(['b', 'd', 'e']);

    instance.dispose();
    expect(hidden()).toEqual([]);
    expect(document.querySelector('.ptm-regroup-btn, .ptm-regroup-shown, [data-ptm-group]')).toBeNull();
  });
});
