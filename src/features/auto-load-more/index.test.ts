import { createTestContext } from '../../test/context';
import { autoLoadMore, THROTTLE_MS } from './index';

/** IntersectionObserver stand-in: tests decide when the button is in view. */
class FakeObserver {
  static last: FakeObserver;
  readonly targets = new Set<Element>();
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeObserver.last = this;
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
  }
  fire(isIntersecting: boolean) {
    const entries = [...this.targets].map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry);
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function render() {
  document.body.innerHTML =
    '<div id="vue3-portal"><div class="results"><div class="resultset"><div class="row controls"><button class="btn load-more-btn">Load More</button></div></div></div></div>';
  return document.querySelector('.load-more-btn') as HTMLButtonElement;
}

describe('auto-load-more', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('clicks the visible button at most once per 750 ms and follows re-renders', async () => {
    let clicks = 0;
    render().addEventListener('click', () => clicks++);
    const instance = autoLoadMore(createTestContext(), FakeObserver as unknown as typeof IntersectionObserver);
    const io = FakeObserver.last;

    io.fire(false);
    expect(clicks).toBe(0);
    io.fire(true);
    expect(clicks).toBe(1);
    io.fire(true);
    expect(clicks).toBe(1);
    io.fire(false);
    vi.advanceTimersByTime(THROTTLE_MS);
    expect(clicks).toBe(1);

    // Vue renders a new button: a fresh observer watches it, the old one is dropped.
    const next = render();
    next.addEventListener('click', () => clicks++);
    await vi.waitFor(() => expect([...FakeObserver.last.targets]).toEqual([next]));
    expect(io.targets.size).toBe(0);
    const io2 = FakeObserver.last;
    io2.fire(true);
    expect(clicks).toBe(2);
    io2.fire(true);
    vi.advanceTimersByTime(THROTTLE_MS);
    expect(clicks).toBe(3);

    instance.dispose!();
    expect(io2.targets.size).toBe(0);
  });

  it('uses the scrolling results column as root in the two-column layout', async () => {
    render();
    const instance = autoLoadMore(createTestContext(), FakeObserver as unknown as typeof IntersectionObserver);
    expect(FakeObserver.last.options.root ?? null).toBeNull();

    const portal = document.querySelector('#vue3-portal') as HTMLElement;
    portal.style.overflowY = 'auto';
    document.documentElement.classList.add('ptm-layout-split');
    await vi.waitFor(() => expect(FakeObserver.last.options.root).toBe(portal));
    expect(FakeObserver.last.options.rootMargin).toBe('480px');

    document.documentElement.classList.remove('ptm-layout-split');
    instance.dispose!();
  });
  it('pauses after a rate limit until the wait is over, with one warning', () => {
    let clicks = 0;
    const button = render();
    button.addEventListener('click', () => clicks++);
    const ctx = createTestContext();
    const instance = autoLoadMore(ctx, FakeObserver as unknown as typeof IntersectionObserver);
    const io = FakeObserver.last;

    ctx.fromPage({ kind: 'rateLimited', retryAfterMs: 5000 });
    ctx.fromPage({ kind: 'rateLimited', retryAfterMs: 5000 });
    io.fire(true);
    expect(clicks).toBe(0);
    const toasts = ctx.toast.toasts.get();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.kind).toBe('warning');

    vi.advanceTimersByTime(4999);
    expect(clicks).toBe(0);
    vi.advanceTimersByTime(1);
    expect(clicks).toBe(1);

    instance.dispose!();
  });

  it('does not recompute styles on mutations that change neither button nor layout', async () => {
    render();
    const instance = autoLoadMore(createTestContext(), FakeObserver as unknown as typeof IntersectionObserver);
    const spy = vi.spyOn(window, 'getComputedStyle');
    const seen = vi.fn();
    const probe = new MutationObserver(seen);
    probe.observe(document.body, { childList: true, subtree: true });

    document.querySelector('.resultset')!.append(document.createElement('div'));
    await vi.waitFor(() => expect(seen).toHaveBeenCalled());
    expect(spy).not.toHaveBeenCalled();

    probe.disconnect();
    spy.mockRestore();
    instance.dispose!();
  });
});
