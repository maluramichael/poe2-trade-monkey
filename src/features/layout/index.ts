import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Zwei-Spalten-Layout', description: 'Filter links, Ergebnisse rechts, volle Breite.' },
  en: { label: 'Two-column layout', description: 'Filters on the left, results on the right, full width.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const layoutFeature: Feature = {
  id: 'layout',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
