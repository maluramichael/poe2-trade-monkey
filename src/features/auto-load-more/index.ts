import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { sel } from '../../site/selectors';
import type { Feature, FeatureInstance } from '../types';

const t = createTranslator({
  de: {
    label: 'Automatisch nachladen',
    description: 'Lädt beim Scrollen ans Ende weitere Ergebnisse.',
    paused: 'Die Trade-Seite bremst gerade. Automatisches Nachladen pausiert {s} s.',
  },
  en: {
    label: 'Auto load more',
    description: 'Loads more results when you scroll to the end.',
    paused: 'The trade site is rate limiting. Auto load paused for {s} s.',
  },
});

export const THROTTLE_MS = 750;

/**
 * Clicks the site's own "Load More" button when it scrolls near the viewport. That is what the
 * user would do by hand, so it stays within GGG's rules: never more than once per 750 ms, never
 * while the button is out of view. After a rate limit of the site it pauses for the wait time.
 */
export function autoLoadMore(
  ctx: AppContext,
  Observer: typeof IntersectionObserver = IntersectionObserver,
): FeatureInstance {
  let watched: Element | null = null;
  let inView = false;
  let lastClick = -Infinity;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let pausedUntil = 0;
  const { doc } = ctx;

  const tryLoad = () => {
    clearTimeout(retry);
    const button = watched as HTMLButtonElement | null;
    if (!inView || !button?.isConnected || button.disabled) return;
    const wait = Math.max(lastClick + THROTTLE_MS, pausedUntil) - Date.now();
    if (wait > 0) {
      retry = setTimeout(tryLoad, wait);
      return;
    }
    lastClick = Date.now();
    button.click();
  };

  let io: IntersectionObserver | null = null;
  let root: Element | null = null;

  // The look-ahead margin only works on the element that actually scrolls: the window normally,
  // the results column in the two-column layout. Rebuild the observer when that changes.
  const observe = (button: Element | null, nextRoot: Element | null) => {
    io?.disconnect();
    root = nextRoot;
    io = new Observer(
      (entries) => {
        const entry = entries.find((e) => e.target === watched);
        if (!entry) return;
        inView = entry.isIntersecting;
        tryLoad();
      },
      { root, rootMargin: '480px' },
    );
    if (button) io.observe(button);
  };

  const offRateLimited = ctx.bridge.events.on('rateLimited', (retryAfterMs) => {
    const until = Date.now() + retryAfterMs;
    if (Date.now() >= pausedUntil) ctx.toast(t('paused', { s: Math.ceil(retryAfterMs / 1000) }), 'warning');
    pausedUntil = Math.max(pausedUntil, until);
    tryLoad();
  });

  let layoutClass: string | null = null;

  // Vue re-renders the result list (new search, sort, load more), so follow the current button.
  const attach = () => {
    const button = doc.querySelector(sel.loadMoreButton);
    // getComputedStyle over all ancestors is costly; the scroll root only moves with the layout class.
    const htmlClass = doc.documentElement.className;
    if (button === watched && io && htmlClass === layoutClass) return;
    layoutClass = htmlClass;
    const nextRoot = button ? scrollParent(button) : null;
    if (button === watched && nextRoot === root && io) return;
    watched = button;
    inView = false;
    observe(button, nextRoot);
  };
  const mutations = new MutationObserver(attach);
  mutations.observe(doc.body, { childList: true, subtree: true });
  // The layout feature switches columns via classes on <html>.
  mutations.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'] });
  attach();

  return {
    dispose() {
      clearTimeout(retry);
      offRateLimited();
      mutations.disconnect();
      io?.disconnect();
    },
  };
}

/** Nearest ancestor that scrolls on its own, `null` for the window. */
function scrollParent(element: Element): Element | null {
  for (let node = element.parentElement; node && node !== element.ownerDocument.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}

export const autoLoadMoreFeature: Feature = {
  id: 'auto-load-more',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: false,
  start: (ctx) => autoLoadMore(ctx),
};
