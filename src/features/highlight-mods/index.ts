import type { CurrentSearch } from '../../app/currentSearch';
import { createTranslator } from '../../core/i18n';
import { sel } from '../../site/selectors';
import type { Feature } from '../types';
import css from './feature.css';

const t = createTranslator({
  de: { label: 'Gesuchte Mods hervorheben', description: 'Markiert Mods in Ergebnissen, nach denen du filterst.' },
  en: { label: 'Highlight searched mods', description: 'Marks mods in results that match your stat filters.' },
});

const HIGHLIGHT = 'ptm-mod-highlight';

/** Stat ids the search actually filters by: enabled filters in enabled, non-"not" groups. */
export function activeStatIds(search: CurrentSearch | null): Set<string> {
  const ids = new Set<string>();
  for (const group of search?.payload?.query.stats ?? []) {
    if (group.disabled || group.type === 'not') continue;
    for (const filter of group.filters) if (!filter.disabled) ids.add(filter.id);
  }
  return ids;
}

export const highlightModsFeature: Feature = {
  id: 'highlight-mods',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start(ctx) {
    let unregister = () => {};
    let appliedKey: string | null = null;
    const clear = () => {
      unregister();
      for (const mod of ctx.doc.querySelectorAll(`.${HIGHLIGHT}`)) mod.classList.remove(HIGHLIGHT);
    };
    const apply = (search: CurrentSearch | null) => {
      const ids = activeStatIds(search);
      const key = [...ids].sort().join(',');
      if (key === appliedKey) return;
      appliedKey = key;
      clear();
      unregister = ctx.results.decorate('highlight-mods', (row) => {
        for (const stat of row.element.querySelectorAll<HTMLElement>(sel.row.modStat)) {
          const id = stat.dataset.field!.slice('stat.'.length);
          if (ids.has(id)) stat.closest(sel.row.mod)?.classList.add(HIGHLIGHT);
        }
      });
    };
    const unsubscribe = ctx.currentSearch.subscribe(apply);
    apply(ctx.currentSearch.get());
    return {
      dispose() {
        unsubscribe();
        clear();
      },
    };
  },
};
