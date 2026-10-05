import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Schnellfilter', description: 'Leiste mit häufigen Filtern wie Corrupted oder Item-Level.' },
  en: { label: 'Quick filters', description: 'Bar with common filters like corrupted or item level.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const quickFiltersFeature: Feature = {
  id: 'quick-filters',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
