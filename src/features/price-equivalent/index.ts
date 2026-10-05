import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Preis-Umrechnung', description: 'Rechnet Preise über poe.ninja in Divine und Exalted um.' },
  en: { label: 'Price equivalent', description: 'Converts prices to Divine and Exalted via poe.ninja.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const priceEquivalentFeature: Feature = {
  id: 'price-equivalent',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
