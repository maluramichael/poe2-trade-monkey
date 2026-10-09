import { sel } from '../../site/selectors';
import { createTestContext, type TestContext } from '../../test/context';
import type { FeatureInstance } from '../types';
import { t as ui } from '../../ui/messages';
import { searchClearFeature } from './index';

import panelHtml from '../../test/fixtures/search-panel.html?raw';

const EMPTY = { name: null, type: null, disc: null, term: null };

let ctx: TestContext;
let instance: FeatureInstance;
let pageState: Record<string, unknown>;

const button = () => document.querySelector<HTMLButtonElement>('.search-left .ptm-search-clear');
const input = () => document.querySelector<HTMLInputElement>(sel.itemSearchInput)!;

async function startWith(state: Record<string, unknown>) {
  pageState = { ...EMPTY, ...state };
  const options = { pageState };
  ctx = createTestContext(options);
  instance = (await searchClearFeature.start(ctx)) as FeatureInstance;
  await vi.waitFor(() => expect(button()).not.toBeNull());
  return options;
}

beforeEach(() => {
  document.body.innerHTML = panelHtml;
});

afterEach(() => instance?.dispose?.());

describe('search clear', () => {
  it('adds an accessible button that stays hidden without an item', async () => {
    await startWith({});
    const clear = button()!;
    expect(clear.type).toBe('button');
    expect(clear.getAttribute('aria-label')).toBe('Clear item search');
    expect(clear.hidden).toBe(true);
  });

  it('shows for a selected item and clears it on click', async () => {
    await startWith({ name: 'Headhunter', type: 'Leather Belt' });
    await vi.waitFor(() => expect(button()!.hidden).toBe(false));

    const typed = vi.fn();
    input().value = 'Head';
    input().addEventListener('input', typed);
    button()!.click();

    expect(ctx.commits).toEqual([{ mutation: 'setItem', payload: {} }]);
    expect(input().value).toBe('');
    expect(typed).toHaveBeenCalled();
    expect(button()!.hidden).toBe(true);
  });

  it('reports a failed clear as a toast', async () => {
    await startWith({ name: 'Headhunter' });
    vi.spyOn(ctx.bridge, 'commit').mockRejectedValue(new Error('page bridge: timed out'));
    button()!.click();
    await vi.waitFor(() => expect(ctx.toast.toasts.get().at(-1)).toMatchObject({ kind: 'error', message: ui('actionFailed') }));
  });

  it('shows while the input has text', async () => {
    await startWith({});
    input().value = 'Amu';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    expect(button()!.hidden).toBe(false);
    input().value = '';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    expect(button()!.hidden).toBe(true);
  });

  it('re-reads the item after site mutations', async () => {
    const options = await startWith({});
    options.pageState = { ...EMPTY, term: 'belt' };
    ctx.fromPage({ kind: 'mutation', type: 'persistent/setItem' });
    await vi.waitFor(() => expect(button()!.hidden).toBe(false));
  });

  it('comes back after Vue re-renders the search bar', async () => {
    await startWith({});
    const left = document.querySelector('#trade .search-bar .search-left')!;
    left.innerHTML = left.innerHTML.replace(/<button[^>]*ptm-search-clear[\s\S]*?<\/button>/, '');
    expect(button()).toBeNull();
    await vi.waitFor(() => expect(button()).not.toBeNull());
    expect(document.querySelectorAll('.ptm-search-clear')).toHaveLength(1);
  });

  it('removes the button on dispose', async () => {
    await startWith({});
    instance.dispose?.();
    expect(document.querySelector('.ptm-search-clear')).toBeNull();
  });
});
