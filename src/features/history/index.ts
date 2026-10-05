import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Verlauf', description: 'Liste der letzten Suchen.' },
  en: { label: 'History', description: 'List of your recent searches.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const historyFeature: Feature = {
  id: 'history',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
