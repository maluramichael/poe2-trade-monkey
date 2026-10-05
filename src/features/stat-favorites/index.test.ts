import { sel } from '../../site/selectors';
import { createTestContext, type TestContext } from '../../test/context';
import type { FeatureInstance } from '../types';
import { optionKey, statFavoritesFeature } from './index';

import panelHtml from '../../test/fixtures/search-panel.html?raw';

// Markup as in docs/dom/stat-filter-options.txt.
const OPTIONS = `<li class="multiselect__element"><span class="multiselect__option multiselect__option--disabled"><span>Pseudo</span></span></li>
<li class="multiselect__element"><span class="multiselect__option multiselect__option--highlight">
  <i class="mutate-type mutate-type-pseudo">pseudo</i> <div><span>+# total maximum <strong>Life</strong></span></div></span></li>
<li class="multiselect__element"><span class="multiselect__option multiselect__option--disabled"><span>Explicit</span></span></li>
<li class="multiselect__element"><span class="multiselect__option">
  <i class="mutate-type mutate-type-explicit">explicit</i> <div><span># to maximum <strong>Life</strong></span></div></span></li>`;

const KEY_EXPLICIT = 'explicit::# to maximum Life';
const KEY_PSEUDO = 'pseudo::+# total maximum Life';

let ctx: TestContext;
let instance: FeatureInstance;

const list = () => document.querySelector<HTMLElement>(`${sel.statPane} .filter-select-mutate .multiselect__content`)!;
const options = () => [...list().querySelectorAll<HTMLElement>(':scope > li > .multiselect__option')];
const star = (option: HTMLElement) => option.querySelector<HTMLButtonElement>(':scope > .ptm-stat-star');
const explicitOption = () => options()[3]!;
const saved = () => JSON.parse(ctx.storage.data.get('stat-favorites:keys') ?? 'null');

async function startFeature() {
  instance = (await statFavoritesFeature.start(ctx)) as FeatureInstance;
}

beforeEach(() => {
  document.body.innerHTML = panelHtml;
  list().innerHTML = OPTIONS;
  ctx = createTestContext();
});

afterEach(() => instance?.dispose?.());

describe('stat favorites', () => {
  it('builds the key from type and collapsed text, null for headers', () => {
    expect(options().map(optionKey)).toEqual([null, KEY_PSEUDO, null, KEY_EXPLICIT]);
  });

  it('adds a star to each stat option, not to group headers or other dropdowns', async () => {
    await startFeature();
    expect(options().map((o) => !!star(o))).toEqual([false, true, false, true]);
    expect(document.querySelector(`${sel.propertyPane} .ptm-stat-star`)).toBeNull();
    expect(document.querySelector('.search-left .ptm-stat-star')).toBeNull();
    expect(star(explicitOption())!.getAttribute('aria-pressed')).toBe('false');
    expect(list().classList.contains('ptm-stat-fav-list')).toBe(true);
  });

  it('toggles a favorite on click, persists it and moves it to the top', async () => {
    await startFeature();
    star(explicitOption())!.click();
    expect(saved()).toEqual({ schema: 1, data: [KEY_EXPLICIT] });
    expect(star(explicitOption())!.getAttribute('aria-pressed')).toBe('true');
    expect(explicitOption().parentElement!.classList.contains('ptm-stat-fav')).toBe(true);
    expect(list().classList.contains('ptm-stat-has-fav')).toBe(true);
    expect(list().dataset.ptmFavLabel).toBe('Favorites');

    star(explicitOption())!.click();
    expect(saved()).toEqual({ schema: 1, data: [] });
    expect(explicitOption().parentElement!.classList.contains('ptm-stat-fav')).toBe(false);
    expect(list().classList.contains('ptm-stat-has-fav')).toBe(false);
  });

  it('never lets star presses reach the option (no selection, no blur)', async () => {
    await startFeature();
    const option = explicitOption();
    const reached = vi.fn();
    for (const type of ['pointerdown', 'mousedown', 'click']) option.addEventListener(type, reached);

    const button = star(option)!;
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    button.dispatchEvent(down);
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    button.querySelector('svg')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(reached).not.toHaveBeenCalled();
    expect(down.defaultPrevented).toBe(true);
    expect(saved().data).toEqual([KEY_EXPLICIT]);
  });

  it('applies stored favorites on start', async () => {
    await ctx.storage.set('stat-favorites:keys', { schema: 1, data: [KEY_PSEUDO] });
    await startFeature();
    expect(star(options()[1]!)!.getAttribute('aria-pressed')).toBe('true');
    expect(options()[1]!.parentElement!.classList.contains('ptm-stat-fav')).toBe(true);
    expect(explicitOption().parentElement!.classList.contains('ptm-stat-fav')).toBe(false);
  });

  it('re-decorates when Vue re-renders or patches the list', async () => {
    await ctx.storage.set('stat-favorites:keys', { schema: 1, data: [KEY_EXPLICIT] });
    await startFeature();

    list().innerHTML = OPTIONS;
    await vi.waitFor(() => expect(options().every((o) => optionKey(o) === null || star(o))).toBe(true));
    expect(explicitOption().parentElement!.classList.contains('ptm-stat-fav')).toBe(true);

    // Vue keys options by index: the same <li> now shows another stat.
    explicitOption().querySelector('div > span')!.textContent = 'Something else';
    await vi.waitFor(() => expect(star(explicitOption())!.getAttribute('aria-pressed')).toBe('false'));
    expect(explicitOption().parentElement!.classList.contains('ptm-stat-fav')).toBe(false);
    expect(explicitOption().querySelectorAll('.ptm-stat-star')).toHaveLength(1);
  });

  it('removes everything on dispose', async () => {
    await ctx.storage.set('stat-favorites:keys', { schema: 1, data: [KEY_EXPLICIT] });
    await startFeature();
    instance.dispose?.();
    expect(document.querySelector('.ptm-stat-star, .ptm-stat-fav, .ptm-stat-fav-list, .ptm-stat-has-fav')).toBeNull();
    expect(list().dataset.ptmFavLabel).toBeUndefined();
  });
});
