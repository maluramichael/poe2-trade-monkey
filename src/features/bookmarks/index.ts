import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Lesezeichen', description: 'Suchen in Ordnern speichern, in jeder League wieder öffnen.' },
  en: { label: 'Bookmarks', description: 'Save searches in folders and reopen them in any league.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const bookmarksFeature: Feature = {
  id: 'bookmarks',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
