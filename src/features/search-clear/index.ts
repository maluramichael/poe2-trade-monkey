import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Suchfeld leeren', description: 'Löschen-Knopf im Item-Suchfeld.' },
  en: { label: 'Clear item search', description: 'Clear button in the item search field.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const searchClearFeature: Feature = {
  id: 'search-clear',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
