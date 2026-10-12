import { sel } from '../../site/selectors';
import { createTestContext } from '../../test/context';
import type { FeatureInstance } from '../types';
import { fuzzySearchFeature } from './index';

import panelHtml from '../../test/fixtures/search-panel.html?raw';

let instance: FeatureInstance;

const select = () => document.querySelector('#trade .search-bar .search-left .multiselect')!;
const input = () => document.querySelector<HTMLInputElement>(sel.itemSearchInput)!;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function activate() {
  select().classList.add('multiselect--active');
  await flush();
}

async function deactivate() {
  select().classList.remove('multiselect--active');
  await flush();
}

beforeEach(async () => {
  document.body.innerHTML = panelHtml;
  instance = (await fuzzySearchFeature.start(createTestContext())) as FeatureInstance;
});

afterEach(() => instance?.dispose?.());

describe('fuzzy search', () => {
  it('prefixes ~ on activation, tells Vue and selects the rest', async () => {
    const typed = vi.fn();
    input().addEventListener('input', typed);
    input().value = 'Head';
    await activate();
    expect(input().value).toBe('~Head');
    expect(typed).toHaveBeenCalledTimes(1);
    expect([input().selectionStart, input().selectionEnd]).toEqual([1, 5]);
  });

  it('leaves an existing ~ alone', async () => {
    const typed = vi.fn();
    input().addEventListener('input', typed);
    input().value = '~belt';
    await activate();
    expect(input().value).toBe('~belt');
    expect(typed).not.toHaveBeenCalled();
  });

  it('puts a deleted ~ straight back, caret after the typed text', async () => {
    const seen: string[] = [];
    input().addEventListener('input', () => seen.push(input().value));
    await activate();
    expect(input().value).toBe('~');
    input().value = 'ring';
    input().setSelectionRange(0, 0); // Backspace on the tilde leaves the caret at the start
    input().dispatchEvent(new Event('input', { bubbles: true }));
    expect(input().value).toBe('~ring');
    expect(seen.at(-1)).toBe('~ring'); // Vue's listener already sees the tilde
    expect([input().selectionStart, input().selectionEnd]).toEqual([1, 1]);
  });

  it('lets the field go empty', async () => {
    await activate();
    input().value = '';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    expect(input().value).toBe('');
  });

  it('re-adds ~ on the next activation', async () => {
    await activate();
    input().value = 'ring';
    await deactivate();
    await activate();
    expect(input().value).toBe('~ring');
  });

  it('ignores multiselects without a search input', async () => {
    input().remove();
    await expect(activate()).resolves.toBeUndefined();
    expect(select().querySelector('.multiselect__input')).toBeNull();
  });

  it('stops on dispose', async () => {
    instance.dispose?.();
    await activate();
    expect(input().value).toBe('');
  });
});
