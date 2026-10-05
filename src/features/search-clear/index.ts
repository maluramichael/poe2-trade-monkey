import { h, render } from 'preact';
import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { log } from '../../core/log';
import { sel } from '../../site/selectors';
import { IconClose } from '../../ui/icons';
import type { Feature } from '../types';
import css from './feature.css';

const t = createTranslator({
  de: { label: 'Suchfeld leeren', description: 'Löschen-Knopf im Item-Suchfeld.', clear: 'Item-Suche leeren' },
  en: { label: 'Clear item search', description: 'Clear button in the item search field.', clear: 'Clear item search' },
});

const BUTTON = 'ptm-search-clear';
const CONTAINER = '#trade .search-bar .search-left';

async function start(ctx: AppContext) {
  const { doc, bridge } = ctx;
  let hasItem = false;
  let stateRequest = 0;

  const input = () => doc.querySelector<HTMLInputElement>(sel.itemSearchInput);

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = BUTTON;
  button.hidden = true;
  button.setAttribute('aria-label', t('clear'));
  button.title = t('clear');
  render(h(IconClose, { size: 14 }), button);

  const update = () => {
    button.hidden = !hasItem && !input()?.value;
  };

  const refresh = async () => {
    const request = ++stateRequest;
    try {
      const state = await bridge.getState();
      if (request !== stateRequest) return;
      hasItem = state.name != null || state.type != null || state.term != null;
      update();
    } catch (error) {
      log.error('search-clear: reading the item failed', error);
    }
  };

  button.addEventListener('click', () => {
    bridge.commit('setItem', {}).catch((error) => log.error('search-clear: setItem failed', error));
    const field = input();
    if (field) {
      field.value = '';
      // Lets vue-multiselect drop its search text too.
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    hasItem = false;
    stateRequest++; // an older getState reply must not show the button again
    update();
  });

  // Sits next to the multiselect, not inside, so clicks never open the dropdown.
  const ensure = () => {
    const container = doc.querySelector(CONTAINER);
    if (container && button.parentElement !== container) container.append(button);
  };

  const onInput = (event: Event) => {
    if ((event.target as Element).matches?.(sel.itemSearchInput)) update();
  };
  doc.addEventListener('input', onInput, true);
  doc.addEventListener('focusout', onInput, true);

  const observer = new MutationObserver(ensure);
  observer.observe(doc.body, { childList: true, subtree: true });
  const off = bridge.events.on('mutation', () => void refresh());
  ensure();
  void refresh();

  return {
    dispose() {
      observer.disconnect();
      off();
      doc.removeEventListener('input', onInput, true);
      doc.removeEventListener('focusout', onInput, true);
      button.remove();
    },
  };
}

export const searchClearFeature: Feature = {
  id: 'search-clear',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start,
};
