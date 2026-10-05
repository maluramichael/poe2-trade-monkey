import { createTranslator } from '../../core/i18n';
import type { ResultRow } from '../../site/results';
import { sel } from '../../site/selectors';
import type { Feature } from '../types';
import css from './feature.css';

const t = createTranslator({
  de: {
    label: 'Gleiche Angebote zusammenfassen',
    description: 'Fasst gleiche Items vom selben Verkäufer zum selben Preis zusammen.',
    similar: '{n} ähnliche',
  },
  en: {
    label: 'Group identical listings',
    description: 'Collapses identical items from the same seller at the same price.',
    similar: '{n} similar',
  },
});

const KEY_ATTR = 'data-ptm-group';
const HIDDEN = 'ptm-regroup-hidden';
const SHOWN = 'ptm-regroup-shown';
const BUTTON = 'ptm-regroup-btn';

/** Seller + item + price. Falls back to the rendered text if the listing data was not captured. */
export function groupKey({ element, data }: ResultRow): string {
  const seller = data?.listing.account.name ?? element.querySelector(sel.row.sellerLink)?.getAttribute('href') ?? '';
  if (!data) {
    const header = [...element.querySelectorAll(sel.row.itemHeaderLines)].map((line) => line.textContent).join('|');
    return [seller, header, element.querySelector(sel.row.priceField)?.textContent ?? ''].join('|');
  }
  const { item, listing } = data;
  return [seller, item.name, item.typeLine, listing.price?.amount ?? '', listing.price?.currency ?? ''].join('|');
}

/** Rows of the same group that follow `head`, in order. */
function followers(head: Element): HTMLElement[] {
  const key = head.getAttribute(KEY_ATTR);
  const rows: HTMLElement[] = [];
  for (let next = head.nextElementSibling; next instanceof HTMLElement && next.getAttribute(KEY_ATTR) === key; next = next.nextElementSibling) {
    rows.push(next);
  }
  return rows;
}

function toggleButton(head: HTMLElement): HTMLButtonElement {
  const existing = head.querySelector<HTMLButtonElement>(`.${BUTTON}`);
  if (existing) return existing;
  const button = head.ownerDocument.createElement('button');
  button.type = 'button';
  button.className = `btn btn-default ${BUTTON}`;
  button.dataset.count = '0';
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    for (const row of followers(head)) {
      row.classList.toggle(HIDDEN, !expanded);
      row.classList.toggle(SHOWN, expanded);
    }
  });
  head.querySelector(sel.row.buttons)?.append(button);
  return button;
}

export const regroupSimilarFeature: Feature = {
  id: 'regroup-similar',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start(ctx) {
    // Rows are decorated in DOM order, so the previous rows already carry their key. That also
    // covers "load more": appended rows join a group that ended the previous batch.
    const unregister = ctx.results.decorate('regroup-similar', (row) => {
      const key = groupKey(row);
      row.element.setAttribute(KEY_ATTR, key);
      let head = row.element;
      while (head.previousElementSibling instanceof HTMLElement && head.previousElementSibling.getAttribute(KEY_ATTR) === key) {
        head = head.previousElementSibling;
      }
      if (head === row.element) return;
      const button = toggleButton(head);
      const count = Number(button.dataset.count) + 1;
      button.dataset.count = String(count);
      button.textContent = t('similar', { n: count });
      row.element.classList.add(button.getAttribute('aria-expanded') === 'true' ? SHOWN : HIDDEN);
    });
    return {
      dispose() {
        unregister();
        for (const button of ctx.doc.querySelectorAll(`.${BUTTON}`)) button.remove();
        for (const row of ctx.doc.querySelectorAll(`[${KEY_ATTR}]`)) {
          row.removeAttribute(KEY_ATTR);
          row.classList.remove(HIDDEN, SHOWN);
        }
      },
    };
  },
};
