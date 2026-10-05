import { createTranslator } from '../../core/i18n';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Gesuchte Mods hervorheben', description: 'Markiert Mods in Ergebnissen, nach denen du filterst.' },
  en: { label: 'Highlight searched mods', description: 'Marks mods in results that match your stat filters.' },
});

/** Stub, implemented in its build wave. See PROJEKT.md for the scope. */
export const highlightModsFeature: Feature = {
  id: 'highlight-mods',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start() {},
};
