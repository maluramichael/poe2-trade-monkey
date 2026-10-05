import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Mods als Filter übernehmen', description: 'Plus und Minus an jeder Mod im Ergebnis fügen sie als Filter hinzu oder schließen sie aus.' },
  en: { label: 'Mod filter buttons', description: 'Plus and minus on each result mod add it as a filter or exclude it.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const modActionsFeature: Feature = {
  id: 'mod-actions',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
