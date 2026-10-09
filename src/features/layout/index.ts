import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { sel } from '../../site/selectors';
import type { Feature, FeatureInstance } from '../types';
import css from './feature.css';

const t = createTranslator({
  de: { label: 'Zwei-Spalten-Layout', description: 'Filter links, Ergebnisse rechts, volle Breite.' },
  en: { label: 'Two-column layout', description: 'Filters on the left, results on the right, full width.' },
});

/** Width of #trade's parent (viewport minus our sidebar) from which two columns are used:
 * both column minimums from feature.css (440 + 740) plus the gap. */
export const SPLIT_MIN_WIDTH = 1188;
/** Same threshold the site uses for its own "Back to top" button. */
const SCROLLED_MIN = 88;

// ponytail: local selectors until they move to src/site/selectors.ts (owned by another task).
const PORTAL = sel.portal;
const TOP_COLUMN = sel.topColumn;

/**
 * CSS does the layout (feature.css, scoped under html.ptm-layout). JS only decides when two
 * columns fit (our sidebar narrows the page, so a media query can't), measures where the columns
 * start and points "Back to top" at the results column.
 */
export function layout(ctx: AppContext, Observer: typeof ResizeObserver = ResizeObserver): FeatureInstance {
  const { doc, location } = ctx;
  const root = doc.documentElement;
  const container = doc.querySelector(sel.tradeRoot)?.parentElement ?? doc.body;

  root.classList.add('ptm-layout');

  const update = () => {
    const split = location.get() !== null && container.clientWidth >= SPLIT_MIN_WIDTH;
    root.classList.toggle('ptm-layout-split', split);
    if (!split) return;
    const column = doc.querySelector(TOP_COLUMN);
    if (column) {
      const top = `${Math.round(column.getBoundingClientRect().top + (doc.defaultView?.scrollY ?? 0))}px`;
      if (root.style.getPropertyValue('--ptm-layout-top') !== top) root.style.setProperty('--ptm-layout-top', top);
    }
  };

  const portal = () => doc.querySelector<HTMLElement>(PORTAL);
  // Scroll does not bubble, so listen in the capture phase; Vue may replace the portal's content.
  const onScroll = (event: Event) => {
    if (event.target !== portal()) return;
    root.classList.toggle('ptm-layout-scrolled', (event.target as HTMLElement).scrollTop > SCROLLED_MIN);
  };
  // The site's own handler scrolls the window, which does nothing in split mode.
  const onClick = (event: MouseEvent) => {
    if (!root.classList.contains('ptm-layout-split')) return;
    if (!(event.target as Element | null)?.closest?.(sel.topButton)) return;
    portal()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fires on window resize, sidebar toggle (body padding) and header changes (logo load).
  const observer = new Observer(update);
  observer.observe(container);
  const offLocation = location.subscribe(update);
  doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
  doc.addEventListener('click', onClick, true);
  update();

  return {
    dispose() {
      observer.disconnect();
      offLocation();
      doc.removeEventListener('scroll', onScroll, { capture: true });
      doc.removeEventListener('click', onClick, true);
      root.classList.remove('ptm-layout', 'ptm-layout-split', 'ptm-layout-scrolled');
      root.style.removeProperty('--ptm-layout-top');
      if (!root.getAttribute('style')) root.removeAttribute('style');
    },
  };
}

export const layoutFeature: Feature = {
  id: 'layout',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  early: true,
  css,
  start: (ctx) => layout(ctx),
};
