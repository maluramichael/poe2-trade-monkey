import { h, render } from 'preact';
import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { persistedStore } from '../../core/storage';
import { sel } from '../../site/selectors';
import { IconStar } from '../../ui/icons';
import type { Feature } from '../types';
import css from './feature.css';

const t = createTranslator({
  de: {
    label: 'Stat-Favoriten',
    description: 'Stern an Stat-Filtern, Favoriten stehen oben.',
    add: 'Zu Favoriten hinzufügen',
    remove: 'Aus Favoriten entfernen',
    favorites: 'Favoriten',
  },
  en: {
    label: 'Stat favorites',
    description: 'Star stat filters to keep them at the top.',
    add: 'Add to favorites',
    remove: 'Remove from favorites',
    favorites: 'Favorites',
  },
});

const DROPDOWN = `${sel.statPane} .filter-select-mutate`;
const STAR = 'ptm-stat-star';
const FAV = 'ptm-stat-fav';
const LIST = 'ptm-stat-fav-list';
const HAS_FAV = 'ptm-stat-has-fav';

/** "<type>::<text>" of a stat dropdown option, `null` for group headers and "no results". */
export function optionKey(option: Element): string | null {
  const typeClass = [...(option.querySelector(':scope > .mutate-type')?.classList ?? [])].find((c) =>
    c.startsWith('mutate-type-'),
  );
  const text = option.querySelector(':scope > div')?.textContent?.replace(/\s+/g, ' ').trim();
  return typeClass && text ? `${typeClass.slice('mutate-type-'.length)}::${text}` : null;
}

const asElement = (node: Node): Element | null =>
  node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

async function start(ctx: AppContext) {
  const { doc, win } = ctx;
  const favorites = await persistedStore<string[]>(ctx.storage, 'stat-favorites:keys', {
    defaultValue: [],
    schema: 1,
  });

  const toggle = (key: string) =>
    favorites.update((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));

  // vue-multiselect selects on click and closes on blur; the star must swallow both.
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const createStar = () => {
    const star = doc.createElement('button');
    star.type = 'button';
    star.tabIndex = -1;
    star.className = STAR;
    render(h(IconStar, { size: 16 }), star);
    star.addEventListener('pointerdown', swallow, true);
    star.addEventListener('mousedown', swallow, true);
    star.addEventListener(
      'click',
      (event) => {
        swallow(event);
        const key = star.parentElement && optionKey(star.parentElement);
        if (key) toggle(key);
      },
      true,
    );
    return star;
  };

  /** Idempotent: only touches the DOM tree when a star is missing or stale. */
  const decorate = () => {
    const keys = new Set(favorites.get());
    for (const list of doc.querySelectorAll<HTMLElement>(`${DROPDOWN} .multiselect__content`)) {
      let hasFav = false;
      for (const option of list.querySelectorAll(':scope > li > .multiselect__option')) {
        const key = optionKey(option);
        let star = option.querySelector<HTMLButtonElement>(`:scope > .${STAR}`);
        const fav = key !== null && keys.has(key);
        option.parentElement!.classList.toggle(FAV, fav);
        // Vue reuses <li> by index, so a header can take the place of an option.
        if (!key) {
          star?.remove();
          continue;
        }
        star ??= option.appendChild(createStar());
        star.setAttribute('aria-pressed', String(fav));
        star.setAttribute('aria-label', fav ? t('remove') : t('add'));
        star.title = star.getAttribute('aria-label')!;
        hasFav ||= fav;
      }
      list.classList.add(LIST);
      list.classList.toggle(HAS_FAV, hasFav);
      list.dataset.ptmFavLabel = t('favorites');
    }
  };

  let frame = 0;
  const schedule = () => {
    frame ||= win.requestAnimationFrame(() => {
      frame = 0;
      decorate();
    });
  };

  // Vue re-renders the option list on every keystroke. Attribute changes are ignored, so our own
  // class and aria updates never re-trigger the observer.
  const observer = new MutationObserver((records) => {
    const relevant = records.some(
      (record) =>
        asElement(record.target)?.closest(sel.statPane) ||
        [...record.addedNodes].some((node) => (node as Element).querySelector?.(DROPDOWN)),
    );
    if (relevant) schedule();
  });
  observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
  const unsubscribe = favorites.subscribe(decorate);
  decorate();

  return {
    dispose() {
      observer.disconnect();
      unsubscribe();
      if (frame) win.cancelAnimationFrame(frame);
      doc.querySelectorAll(`.${STAR}`).forEach((star) => star.remove());
      doc.querySelectorAll(`.${FAV}`).forEach((li) => li.classList.remove(FAV));
      doc.querySelectorAll<HTMLElement>(`.${LIST}`).forEach((list) => {
        list.classList.remove(LIST, HAS_FAV);
        delete list.dataset.ptmFavLabel;
      });
    },
  };
}

export const statFavoritesFeature: Feature = {
  id: 'stat-favorites',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start,
};
