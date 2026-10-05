import { createTestContext } from '../../test/context';
import { layout, SPLIT_MIN_WIDTH } from './index';

/** ResizeObserver stand-in: tests trigger the callback themselves. */
class FakeResizeObserver {
  static last: FakeResizeObserver;
  readonly targets = new Set<Element>();
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.last = this;
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  disconnect() {
    this.targets.clear();
  }
  fire() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const RO = FakeResizeObserver as unknown as typeof ResizeObserver;
const LOCATION = { type: 'search', realm: 'poe2', league: 'Standard', id: null, live: false } as const;

function render(filtersHidden: boolean) {
  document.body.innerHTML = `
    <div class="wrapper"><div class="logo"></div>
      <div id="trade">
        <button class="top-btn"></button>
        <div class="navigation"></div>
        <div class="top"><div class="search-panel">
          <div class="search-bar search-advanced${filtersHidden ? ' search-advanced-hidden' : ''}"></div>
          <div class="controls"><button class="btn toggle-search-btn"></button></div>
        </div></div>
        <div id="vue3-portal"><div class="results"></div></div>
      </div>
    </div>`;
  const wrapper = document.querySelector('.wrapper') as HTMLElement;
  const advanced = document.querySelector('.search-advanced')!;
  const toggle = document.querySelector('.toggle-search-btn') as HTMLButtonElement;
  const portal = document.querySelector('#vue3-portal') as HTMLElement;
  // Vue's toggleSearch: flips the class.
  let clicks = 0;
  toggle.addEventListener('click', () => {
    clicks++;
    advanced.classList.toggle('search-advanced-hidden');
  });
  const setWidth = (width: number) => Object.defineProperty(wrapper, 'clientWidth', { value: width, configurable: true });
  (document.querySelector('#trade > .top') as HTMLElement).getBoundingClientRect = () => ({ top: 150 }) as DOMRect;
  return { advanced, toggle, portal, setWidth, clicks: () => clicks };
}

const html = () => document.documentElement;

describe('layout', () => {
  afterEach(() => {
    html().className = '';
    html().removeAttribute('style');
  });

  it('splits when wide enough, never touches the filter toggle and restores everything on dispose', () => {
    const page = render(true);
    page.setWidth(SPLIT_MIN_WIDTH);
    const instance = layout(createTestContext({ location: LOCATION }), RO);

    expect(html().classList.contains('ptm-layout')).toBe(true);
    expect(html().classList.contains('ptm-layout-split')).toBe(true);
    expect(html().style.getPropertyValue('--ptm-layout-top')).toBe('150px');

    // Narrow (sidebar opened): stacked layout. Wide again: split again.
    page.setWidth(SPLIT_MIN_WIDTH - 1);
    FakeResizeObserver.last.fire();
    expect(html().classList.contains('ptm-layout-split')).toBe(false);
    page.setWidth(1600);
    FakeResizeObserver.last.fire();
    expect(html().classList.contains('ptm-layout-split')).toBe(true);

    instance.dispose!();
    expect(html().className).toBe('');
    expect(html().getAttribute('style') ?? '').toBe('');
    // Filters stay open via CSS in split mode, so the site's toggle is never clicked.
    expect(page.clicks()).toBe(0);
    expect(page.advanced.classList.contains('search-advanced-hidden')).toBe(true);
    expect(FakeResizeObserver.last.targets.size).toBe(0);
  });

  it('stays stacked on narrow screens and on non-search pages', () => {
    const page = render(true);
    page.setWidth(800);
    const ctx = createTestContext({ location: LOCATION });
    const instance = layout(ctx, RO);
    expect(html().classList.contains('ptm-layout')).toBe(true);
    expect(html().classList.contains('ptm-layout-split')).toBe(false);
    expect(page.clicks()).toBe(0);

    page.setWidth(1600);
    ctx.location.set(null); // history, settings, about
    FakeResizeObserver.last.fire();
    expect(html().classList.contains('ptm-layout-split')).toBe(false);
    ctx.location.set({ ...LOCATION });
    expect(html().classList.contains('ptm-layout-split')).toBe(true);
    instance.dispose!();
  });

  it('drives "Back to top" from the results column in split mode', () => {
    const page = render(false);
    page.setWidth(1600);
    const instance = layout(createTestContext({ location: LOCATION }), RO);

    page.portal.scrollTop = 500;
    page.portal.dispatchEvent(new Event('scroll'));
    expect(html().classList.contains('ptm-layout-scrolled')).toBe(true);

    const scrollTo = vi.fn();
    page.portal.scrollTo = scrollTo as unknown as HTMLElement['scrollTo'];
    (document.querySelector('.top-btn') as HTMLButtonElement).click();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    page.portal.scrollTop = 0;
    page.portal.dispatchEvent(new Event('scroll'));
    expect(html().classList.contains('ptm-layout-scrolled')).toBe(false);

    instance.dispose!();
    page.portal.scrollTop = 500;
    page.portal.dispatchEvent(new Event('scroll'));
    expect(html().classList.contains('ptm-layout-scrolled')).toBe(false);
  });
});
