import { createTranslator } from '../../core/i18n';
import { resolveSearchTitle } from '../../app/searchName';
import type { Feature } from '../types';

const t = createTranslator({
  de: { label: 'Tab-Titel', description: 'Zeigt den Namen der Suche im Browser-Tab.' },
  en: { label: 'Tab title', description: 'Shows the search name in the browser tab.' },
});

/** The site prefixes the title with the number of unread whispers, e.g. "(3) Trade - Path of Exile". */
const UNREAD = /^\(\d+\) /;
/** Spacing between re-applies, so a script fighting over the title cannot cause a busy loop. */
const THROTTLE_MS = 100;

export const tabTitleFeature: Feature = {
  id: 'tab-title',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  start(ctx) {
    const { doc, win } = ctx;
    const unread = () => UNREAD.exec(doc.title)?.[0] ?? '';
    const base = doc.title.replace(UNREAD, '');
    /** Our part between unread prefix and base title. `null` = not controlling the title. */
    let segment: string | null = null;
    const desired = () => unread() + (segment ?? '') + base;
    const apply = () => {
      if (doc.title !== desired()) doc.title = desired();
    };

    let generation = 0;
    const update = async () => {
      const run = ++generation;
      const search = ctx.currentSearch.get();
      if (!search) {
        segment = null;
        return apply();
      }
      const name = await resolveSearchTitle(ctx, search);
      if (run !== generation) return;
      segment = (search.location.live ? '⚡ ' : '') + (name ? `${name} - ` : '');
      apply();
    };

    // The site rewrites the title on many interactions: put ours back (leading + trailing throttle).
    let last = 0;
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      if (segment === null || timer !== undefined || doc.title === desired()) return;
      const wait = last + THROTTLE_MS - Date.now();
      const run = () => {
        timer = undefined;
        last = Date.now();
        apply();
      };
      if (wait <= 0) run();
      else timer = win.setTimeout(run, wait);
    });
    // Whole head, so a replaced <title> element is caught as well.
    observer.observe(doc.head, { childList: true, characterData: true, subtree: true });

    const offs = [ctx.currentSearch.subscribe(() => void update()), ctx.searchNames.subscribe(() => void update())];
    void update();

    return {
      dispose() {
        generation++;
        observer.disconnect();
        win.clearTimeout(timer);
        for (const off of offs) off();
        segment = null;
        apply();
      },
    };
  },
};
