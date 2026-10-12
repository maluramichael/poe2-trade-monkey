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

function searchInput(el: EventTarget | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.matches('.multiselect__input') && !!el.closest(sel.tradeRoot);
}

function start({ doc }: AppContext) {
  // On opening a multiselect: prefix the tilde and select the rest, so typing replaces it.
  const observer = new MutationObserver((records) => {
    for (const { target } of records) {
      const select = target as Element;
      if (!select.classList.contains('multiselect') || !select.classList.contains(ACTIVE)) continue;
      const input = select.querySelector('.multiselect__input');
      if (!searchInput(input) || input.value.startsWith('~')) continue; // not searchable or done
      input.value = `~${input.value}`;
      // vue-multiselect binds :value="search" and would reset the field on its next render
      // unless its search text learns about the tilde, so tell it like a keystroke would.
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.setSelectionRange(1, input.value.length);
    }
  });
  observer.observe(doc.body, { attributes: true, attributeFilter: ['class'], subtree: true });

  // While typing: a deleted tilde comes straight back. An empty field stays empty (clear button).
  // Capture phase runs before vue-multiselect's own listener, so its search text sees the tilde.
  const onInput = (e: Event) => {
    const input = e.target;
    if (!searchInput(input) || !input.value || input.value.startsWith('~') || (e as InputEvent).isComposing) return;
    const caret = (input.selectionStart ?? 0) + 1;
    input.value = `~${input.value}`;
    input.setSelectionRange(caret, caret);
  };
  doc.addEventListener('input', onInput, true);

  return {
    dispose: () => {
      observer.disconnect();
      doc.removeEventListener('input', onInput, true);
    },
  };
}

export const fuzzySearchFeature: Feature = {
  id: 'fuzzy-search',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start,
};
