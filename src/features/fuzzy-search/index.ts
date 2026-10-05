import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { sel } from '../../site/selectors';
import type { Feature } from '../types';

const t = createTranslator({
  de: {
    label: 'Immer unscharf suchen',
    description: 'Setzt automatisch ~ vor die Eingabe in den Suchfeldern, damit die Seite unscharf sucht.',
  },
  en: {
    label: 'Always fuzzy search',
    description: 'Adds ~ in front of what you type in search fields so the site matches fuzzily.',
  },
});

const ACTIVE = 'multiselect--active';

function start({ doc }: AppContext) {
  // Multiselects already handled in their current activation, so a deleted tilde stays deleted.
  const handled = new WeakSet<Element>();

  const observer = new MutationObserver((records) => {
    for (const { target } of records) {
      const select = target as Element;
      if (!select.classList.contains('multiselect') || !select.closest(sel.tradeRoot)) continue;
      if (!select.classList.contains(ACTIVE)) {
        handled.delete(select);
        continue;
      }
      if (handled.has(select)) continue;
      const input = select.querySelector<HTMLInputElement>('.multiselect__input');
      if (!input) continue; // not searchable
      handled.add(select);
      if (input.value.startsWith('~')) continue;
      input.value = `~${input.value}`;
      // vue-multiselect binds :value="search" and would reset the field on its next render
      // unless its search text learns about the tilde, so tell it like a keystroke would.
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.setSelectionRange(1, input.value.length);
    }
  });
  observer.observe(doc.body, { attributes: true, attributeFilter: ['class'], subtree: true });

  return { dispose: () => observer.disconnect() };
}

export const fuzzySearchFeature: Feature = {
  id: 'fuzzy-search',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start,
};
