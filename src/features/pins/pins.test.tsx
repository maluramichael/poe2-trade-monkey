import { render } from 'preact';
import { act } from 'preact/test-utils';
import { sel } from '../../site/selectors';
import type { FetchResult } from '../../site/tradeTypes';
import { createTestContext, type TestContext } from '../../test/context';
import type { FeatureInstance } from '../types';
import { pinsFeature } from './index';

import rowsHtml from '../../test/fixtures/result-rows.html?raw';
import fetchJson from '../../test/fixtures/fetch.json?raw';

const listings = (JSON.parse(fetchJson) as { result: FetchResult[] }).result;

let ctx: TestContext;
let instance: FeatureInstance;
let panel: HTMLElement;

const rows = () => [...document.querySelectorAll<HTMLElement>(sel.resultRow)];
const pinButton = (row: HTMLElement) => row.querySelector<HTMLButtonElement>('.ptm-pin-btn')!;
const panelButtons = (label: string) =>
  [...panel.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent === label);

function loadRows() {
  document.body.innerHTML = rowsHtml;
  ctx.results.flush();
}

beforeEach(async () => {
  ctx = createTestContext();
  ctx.emitListings(listings);
  loadRows();
  instance = (await pinsFeature.start(ctx)) as FeatureInstance;
  ctx.results.flush();
  panel = document.createElement('div');
  document.body.after(panel);
  const Panel = instance.Panel!;
  act(() => render(<Panel />, panel));
});

afterEach(() => {
  act(() => render(null, panel));
  panel.remove();
  instance.dispose?.();
});

describe('pins', () => {
  it('adds a site-styled pin button to every row', () => {
    expect(rows().length).toBe(4);
    for (const row of rows()) {
      const button = pinButton(row);
      expect(button.parentElement!.matches(sel.row.buttons.split(' ').pop()!)).toBe(true);
      expect(button.className).toBe('btn btn-default ptm-pin-btn');
      expect(button.textContent).toBe('Pin');
    }
  });

  it('pins a row: snapshot in the panel, row highlighted, pins tab opened', () => {
    const row = rows()[0]!;
    act(() => pinButton(row).click());
    expect(row.classList.contains('ptm-pinned')).toBe(true);
    expect(pinButton(row).textContent).toBe('Unpin');
    expect(ctx.settings.get().activeTab).toBe('pins');
    const card = panel.querySelector('.ptm-pin')!;
    expect(card.querySelector('.item-popup')?.textContent).toContain('Gold Amulet');
    expect(card.querySelector('.ptm-pin__price')?.textContent).toContain('Exalted Orb');
    expect(card.textContent).toContain(listings.find((l) => l.id === row.dataset.id)!.listing.account.name);

    act(() => pinButton(row).click());
    expect(row.classList.contains('ptm-pinned')).toBe(false);
    expect(panel.querySelector('.ptm-pin')).toBeNull();
    expect(panel.querySelector('.ptm-empty')).not.toBeNull();
  });

  it('re-decorated rows reflect the pinned state', () => {
    const row = rows()[1]!;
    act(() => pinButton(row).click());
    const fresh = row.cloneNode(true) as HTMLElement;
    fresh.querySelector('.ptm-pin-btn')!.remove();
    fresh.className = 'row';
    for (const attr of [...fresh.attributes]) if (attr.name.startsWith('data-ptm-')) fresh.removeAttribute(attr.name);
    row.replaceWith(fresh);
    ctx.results.flush();
    expect(fresh.classList.contains('ptm-pinned')).toBe(true);
    expect(pinButton(fresh).textContent).toBe('Unpin');
    expect(fresh.querySelectorAll('.ptm-pin-btn').length).toBe(1);
  });

  it('keeps pins across searches and only scrolls to rows in the DOM', () => {
    vi.useFakeTimers();
    const row = rows()[2]!;
    const scroll = vi.fn();
    row.scrollIntoView = scroll;
    act(() => pinButton(row).click());
    act(() => panelButtons('Scroll to result')[0]!.click());
    expect(scroll).toHaveBeenCalledWith({ block: 'center' });
    expect(row.classList.contains('ptm-pin-glow')).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(row.classList.contains('ptm-pin-glow')).toBe(false);
    vi.useRealTimers();

    document.body.innerHTML = '';
    act(() => ctx.results.flush());
    expect(panel.querySelectorAll('.ptm-pin').length).toBe(1);
    expect(panelButtons('Scroll to result')[0]!.disabled).toBe(true);

    act(() => loadRows());
    expect(panelButtons('Scroll to result')[0]!.disabled).toBe(false);
    expect(rows()[2]!.classList.contains('ptm-pinned')).toBe(true);
  });

  it('removes single pins and clears all', () => {
    act(() => pinButton(rows()[0]!).click());
    act(() => pinButton(rows()[1]!).click());
    expect(panel.querySelectorAll('.ptm-pin').length).toBe(2);
    act(() => panelButtons('Unpin')[0]!.click());
    expect(panel.querySelectorAll('.ptm-pin').length).toBe(1);
    expect(rows()[0]!.classList.contains('ptm-pinned')).toBe(false);
    act(() => panelButtons('Clear pins')[0]!.click());
    expect(panel.querySelector('.ptm-pin')).toBeNull();
    expect(rows()[1]!.classList.contains('ptm-pinned')).toBe(false);
  });

  it('dispose removes buttons and classes', () => {
    act(() => pinButton(rows()[0]!).click());
    instance.dispose?.();
    expect(document.querySelector('.ptm-pin-btn, .ptm-pinned')).toBeNull();
    instance = {};
  });
});
