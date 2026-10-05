import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Automatisch nachladen', description: 'Lädt beim Scrollen ans Ende weitere Ergebnisse.' },
  en: { label: 'Auto load more', description: 'Loads more results when you scroll to the end.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const autoLoadMoreFeature: Feature = {
  id: 'auto-load-more',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: false,
  start() {},
};
