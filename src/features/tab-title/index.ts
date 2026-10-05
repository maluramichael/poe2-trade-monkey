import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Tab-Titel', description: 'Zeigt den Namen der Suche im Browser-Tab.' },
  en: { label: 'Tab title', description: 'Shows the search name in the browser tab.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const tabTitleFeature: Feature = {
  id: 'tab-title',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
