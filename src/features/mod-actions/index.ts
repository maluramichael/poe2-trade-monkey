import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { log } from '../../core/log';
import { sel } from '../../site/selectors';
import type { StatFilter } from '../../site/tradeTypes';
import { errorText } from '../../ui/messages';
import type { Feature } from '../types';
import css from './feature.css';

const t = createTranslator({
  de: {
    label: 'Mods als Filter übernehmen',
    description: 'Plus und Minus an jeder Mod im Ergebnis fügen sie als Filter hinzu oder schließen sie aus.',
    addTitle: 'Als Filter hinzufügen',
    addHint: 'Als Filter hinzufügen (Shift: ohne Mindestwert)',
    excludeTitle: 'Ausschließen',
    added: 'Filter hinzugefügt: {text}',
    excluded: 'Ausgeschlossen: {text}',
    duplicate: 'Schon im Filter: {text}',
  },
  en: {
    label: 'Mod filter buttons',
    description: 'Plus and minus on each result mod add it as a filter or exclude it.',
    addTitle: 'Add as filter',
    addHint: 'Add as filter (Shift: without minimum)',
    excludeTitle: 'Exclude',
    added: 'Filter added: {text}',
    excluded: 'Excluded: {text}',
    duplicate: 'Already in filter: {text}',
  },
});

const ACTION = 'ptm-mod-action';
const FLASH_OK = 'ptm-mod-flash-ok';
const FLASH_FAIL = 'ptm-mod-flash-fail';
const NUM = String.raw`[-−]?\d+(?:\.\d+)?`;
const VALUE_RE = new RegExp(`(${NUM})(?:\\s+to\\s+(${NUM}))?`);

const toNumber = (raw: string) => Number.parseFloat(raw.replace('−', '-'));

/** First number in a mod text; "Adds 5 to 10" gives the average rounded down. */
export function parseModValue(text: string): number | undefined {
  const match = VALUE_RE.exec(text);
  if (!match) return undefined;
  const first = toNumber(match[1]!);
  return match[2] === undefined ? first : Math.floor((first + toNumber(match[2])) / 2);
}

export interface ModAction {
  /** Stat id without the "stat." prefix, e.g. "explicit.stat_3299347043". */
  id: string;
  text: string;
  kind: 'add' | 'exclude';
  /** `false` adds the filter without a min value (Shift-click). */
  withValue: boolean;
}

/** Puts the stat into the search form. Never searches. Returns `false` on bridge errors. */
export async function applyModAction(ctx: AppContext, action: ModAction): Promise<boolean> {
  const type = action.kind === 'add' ? 'and' : 'not';
  try {
    const stats = (await ctx.bridge.getState()).stats ?? [];
    let group = stats.findIndex((g) => g.type === type && !g.disabled);
    if (group >= 0 && stats[group]!.filters.some((f) => f.id === action.id)) {
      ctx.toast(t('duplicate', { text: action.text }), 'warning');
      return true;
    }
    if (group < 0) {
      await ctx.bridge.commit('pushStatGroup', { type, filters: [] });
      group = stats.length;
    }
    const value: StatFilter = { id: action.id };
    const min = action.kind === 'add' && action.withValue ? parseModValue(action.text) : undefined;
    if (min !== undefined) value.value = { min };
    await ctx.bridge.commit('setStatFilter', { group, value });
    ctx.toast(t(action.kind === 'add' ? 'added' : 'excluded', { text: action.text }));
    return true;
  } catch (error) {
    log.error('mod-actions: commit failed', error);
    ctx.toast(errorText(error), 'error');
    return false;
  }
}

export const modActionsFeature: Feature = {
  id: 'mod-actions',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start(ctx) {
    // Serialized so two quick clicks do not both create a new group.
    let queue = Promise.resolve();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const flash = (line: Element, ok: boolean) => {
      const cls = ok ? FLASH_OK : FLASH_FAIL;
      line.classList.remove(FLASH_OK, FLASH_FAIL);
      line.classList.add(cls);
      const timer = setTimeout(() => {
        timers.delete(timer);
        line.classList.remove(cls);
      }, 900);
      timers.add(timer);
    };

    const button = (line: Element, stat: HTMLElement, kind: ModAction['kind']) => {
      const el = ctx.doc.createElement('button');
      el.type = 'button';
      el.className = `${ACTION} ${ACTION}--${kind}`;
      el.textContent = kind === 'add' ? '+' : '−';
      el.title = t(kind === 'add' ? 'addHint' : 'excludeTitle');
      el.setAttribute('aria-label', `${t(kind === 'add' ? 'addTitle' : 'excludeTitle')}: ${(stat.textContent ?? '').trim()}`);
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action: ModAction = {
          id: stat.dataset.field!.slice('stat.'.length),
          text: (stat.textContent ?? '').trim(),
          kind,
          withValue: !event.shiftKey,
        };
        queue = queue.then(async () => flash(line, await applyModAction(ctx, action)));
      });
      return el;
    };

    const unregister = ctx.results.decorate('mod-actions', (row) => {
      for (const stat of row.element.querySelectorAll<HTMLElement>(sel.row.modStat)) {
        const line = stat.parentElement!;
        if (line.querySelector(`.${ACTION}`)) continue;
        line.append(button(line, stat, 'add'), button(line, stat, 'exclude'));
      }
    });

    return {
      dispose() {
        unregister();
        for (const timer of timers) clearTimeout(timer);
        for (const el of ctx.doc.querySelectorAll(`.${ACTION}`)) el.remove();
        for (const el of ctx.doc.querySelectorAll(`.${FLASH_OK}, .${FLASH_FAIL}`)) el.classList.remove(FLASH_OK, FLASH_FAIL);
      },
    };
  },
};
