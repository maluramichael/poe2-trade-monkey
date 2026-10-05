import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Gleiche Angebote zusammenfassen', description: 'Fasst gleiche Items vom selben Verkäufer zum selben Preis zusammen.' },
  en: { label: 'Group identical listings', description: 'Collapses identical items from the same seller at the same price.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const regroupSimilarFeature: Feature = {
  id: 'regroup-similar',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
