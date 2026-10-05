import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Stat-Favoriten', description: 'Stern an Stat-Filtern, Favoriten stehen oben.' },
  en: { label: 'Stat favorites', description: 'Star stat filters to keep them at the top.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const statFavoritesFeature: Feature = {
  id: 'stat-favorites',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
