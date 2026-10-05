import { createTestContext } from '../../test/context';
import { autoLoadMore, THROTTLE_MS } from './index';

/** IntersectionObserver stand-in: tests decide when the button is in view. */
class FakeObserver {
  static last: FakeObserver;
  readonly targets = new Set<Element>();
  constructor(readonly callback: IntersectionObserverCallback) {
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

    // Vue renders a new button: it gets observed, the old one is dropped.
    const next = render();
    next.addEventListener('click', () => clicks++);
    await vi.waitFor(() => expect([...io.targets]).toEqual([next]));
    io.fire(true);
    expect(clicks).toBe(2);
    io.fire(true);
    vi.advanceTimersByTime(THROTTLE_MS);
    expect(clicks).toBe(3);

    instance.dispose!();
    expect(io.targets.size).toBe(0);
  });
});
