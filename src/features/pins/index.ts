import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Angepinnte Items', description: 'Ergebnisse anpinnen und vergleichen.' },
  en: { label: 'Pinned items', description: 'Pin results to compare them.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const pinsFeature: Feature = {
  id: 'pins',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
