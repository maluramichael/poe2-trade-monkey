import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { log } from '../../core/log';
import { Store, useStore } from '../../core/store';
import { sel } from '../../site/selectors';
import type { FilterOption } from '../../site/tradeData';
import type { PersistentState } from '../../site/tradeTypes';
import { ButtonGroup } from '../../ui/components/Button';
import { errorText } from '../../ui/messages';
import { IconChevronDown, IconClose } from '../../ui/icons';
import type { Feature } from '../types';
import css from './feature.css';
import {
  NUMBERS,
  TOGGLES,
  clearCommits,
  isEmpty,
  nextTri,
  numberCommits,
  rarityCommits,
  toView,
  toggleCommits,
  type Commit,
  type NumberControl,
} from './model';

const t = createTranslator({
  de: {
    label: 'Schnellfilter',
    description: 'Leiste mit häufigen Filtern wie Verderbt oder Gegenstandsstufe.',
    corrupted: 'Verderbt',
    fractured_item: 'Brüchig',
    desecrated: 'Entweiht',
    mirrored: 'Gespiegelt',
    sanctified: 'Geheiligt',
    identified: 'Identifiziert',
    ilvl: 'Gegenstandsstufe',
    quality: 'Qualität',
    lvl: 'Max. Stufe',
    rune_sockets: 'Fassungen',
    rarity: 'Seltenheit',
    any: 'beliebig',
    yes: 'ja',
    no: 'nein',
    triTitle: '{name}: {state}. Klick wechselt zwischen beliebig, ja und nein.',
    numberTitle: '{name}: Eingabe mit Enter übernehmen, Esc schließt.',
    reset: 'Zurücksetzen',
    clear: 'Leeren',
    clearTitle: 'Alle Schnellfilter zurücksetzen',
    rarityAny: 'Beliebig',
    rarityNormal: 'Normal',
    rarityMagic: 'Magisch',
    rarityRare: 'Selten',
    rarityUnique: 'Einzigartig',
    rarityFoil: 'Einzigartig (Folie)',
    rarityNonUnique: 'Nicht einzigartig',
  },
  en: {
    label: 'Quick filters',
    description: 'Bar with common filters like corrupted or item level.',
    corrupted: 'Corrupted',
    fractured_item: 'Fractured',
    desecrated: 'Desecrated',
    mirrored: 'Mirrored',
    sanctified: 'Sanctified',
    identified: 'Identified',
    ilvl: 'Item level',
    quality: 'Quality',
    lvl: 'Max level',
    rune_sockets: 'Sockets',
    rarity: 'Rarity',
    any: 'any',
    yes: 'yes',
    no: 'no',
    triTitle: '{name}: {state}. Click cycles any, yes and no.',
    numberTitle: '{name}: press Enter to apply, Esc closes.',
    reset: 'Reset',
    clear: 'Clear',
    clearTitle: 'Reset all quick filters',
    rarityAny: 'Any',
    rarityNormal: 'Normal',
    rarityMagic: 'Magic',
    rarityRare: 'Rare',
    rarityUnique: 'Unique',
    rarityFoil: 'Unique (Foil)',
    rarityNonUnique: 'Any Non-Unique',
  },
});

/** Used until (or if never) the site's own, translated options arrive from /data/filters. */
const fallbackRarities = (): FilterOption[] => [
  { id: null, text: t('rarityAny') },
  { id: 'normal', text: t('rarityNormal') },
  { id: 'magic', text: t('rarityMagic') },
  { id: 'rare', text: t('rarityRare') },
  { id: 'unique', text: t('rarityUnique') },
  { id: 'uniquefoil', text: t('rarityFoil') },
  { id: 'nonunique', text: t('rarityNonUnique') },
];

type Apply = (commits: Commit[]) => void;

function NumberPopover({ control, current, apply }: { control: NumberControl; current: number | undefined; apply: (n: number | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div class="ptm-qf__pop" role="dialog" aria-label={t(control.key as 'ilvl')}>
      <input
        ref={input}
        type="number"
        min={0}
        class="ptm-qf__input"
        value={current ?? ''}
        placeholder={control.bound}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          const raw = event.currentTarget.value.trim();
          apply(raw === '' ? undefined : Number(raw));
        }}
      />
      {control.quick.map((n) => (
        <button key={n} type="button" class="ptm-qf__quick" onClick={() => apply(n)}>
          {n}
        </button>
      ))}
      <button type="button" class="ptm-qf__quick" title={t('reset')} aria-label={t('reset')} onClick={() => apply(undefined)}>
        <IconClose size={12} />
      </button>
    </div>
  );
}

function Strip({ state, rarities, apply }: { state: Store<PersistentState | null>; rarities: Store<FilterOption[]>; apply: Apply }) {
  const current = useStore(state);
  const options = useStore(rarities);
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (current?.tab === 'exchange') return null;
  const filters = current?.filters ?? {};
  const view = toView(filters);
  const run = (commits: Commit[]) => {
    setOpen(null);
    apply(commits);
  };
  const toggleOpen = (key: string) => setOpen(open === key ? null : key);
  const rarity = options.find((option) => option.id === view.rarity);

  return (
    <div class="ptm-qf__strip" ref={root}>
      <ButtonGroup block label={t('label')}>
        {TOGGLES.map((id) => {
          const tri = view.toggles[id];
          return (
            <button
              key={id}
              type="button"
              class={`ptm-btn ptm-btn--blue ptm-btn--sm ptm-qf__btn ptm-qf__btn--${tri}${tri === 'yes' ? ' ptm-btn--active' : ''}`}
              data-filter={id}
              data-state={tri}
              title={t('triTitle', { name: t(id), state: t(tri) })}
              aria-label={t('triTitle', { name: t(id), state: t(tri) })}
              onClick={() => run(toggleCommits(filters, id, nextTri(tri)))}
            >
              <span>{t(id)}</span>
            </button>
          );
        })}
      </ButtonGroup>
      <div class="ptm-qf__row">
        <ButtonGroup block>
          {NUMBERS.map((control) => {
            const n = view.numbers[control.key];
            const name = t(control.key as 'ilvl');
            return (
              <div key={control.key} class="ptm-qf__anchor">
                <button
                  type="button"
                  class={`ptm-btn ptm-btn--blue ptm-btn--sm ptm-qf__btn${n !== undefined ? ' ptm-btn--active' : ''}`}
                  data-filter={control.key}
                  title={t('numberTitle', { name })}
                  aria-expanded={open === control.key}
                  onClick={() => toggleOpen(control.key)}
                >
                  <span>{name}</span>
                  {n !== undefined && <span class="ptm-qf__badge">{`${control.bound === 'min' ? '≥' : '≤'}${n}`}</span>}
                </button>
                {open === control.key && (
                  <NumberPopover
                    control={control}
                    current={n}
                    apply={(value) => run(numberCommits(filters, control, value !== undefined && Number.isFinite(value) ? value : undefined))}
                  />
                )}
              </div>
            );
          })}
          <div class="ptm-qf__anchor">
            <button
              type="button"
              class={`ptm-btn ptm-btn--blue ptm-btn--sm ptm-qf__btn${view.rarity !== null ? ' ptm-btn--active' : ''}`}
              data-filter="rarity"
              data-rarity={view.rarity ?? undefined}
              aria-expanded={open === 'rarity'}
              onClick={() => toggleOpen('rarity')}
            >
              <span>{view.rarity !== null ? (rarity?.text ?? view.rarity) : t('rarity')}</span>
              <IconChevronDown size={11} />
            </button>
            {open === 'rarity' && (
              <div class="ptm-qf__pop ptm-qf__pop--list">
                {options.map((option) => (
                  <button
                    key={option.id ?? 'any'}
                    type="button"
                    aria-pressed={option.id === view.rarity}
                    class="ptm-qf__option"
                    data-rarity={option.id ?? undefined}
                    onClick={() => run(rarityCommits(filters, option.id))}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ButtonGroup>
        <button
          type="button"
          class="ptm-btn ptm-btn--red ptm-btn--sm ptm-qf__clear"
          title={t('clearTitle')}
          aria-label={t('clearTitle')}
          disabled={isEmpty(view)}
          onClick={() => run(clearCommits(filters))}
        >
          <IconClose size={12} />
        </button>
      </div>
    </div>
  );
}

const DEBOUNCE_MS = 100;

function start(ctx: AppContext) {
  const { doc, bridge } = ctx;
  const state = new Store<PersistentState | null>(null);
  const rarities = new Store<FilterOption[]>(fallbackRarities());
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const refresh = async () => {
    try {
      const next = await bridge.getState();
      if (!disposed) state.set(next);
    } catch (error) {
      log.warn('quick filters: reading the form failed', error);
    }
  };

  const apply: Apply = async (commits) => {
    try {
      for (const commit of commits) await bridge.commit(commit.mutation, commit.payload);
    } catch (error) {
      log.error('quick filters: commit failed', error);
      ctx.toast(errorText(error), 'error');
    }
    await refresh();
  };

  const offMutation = bridge.events.on('mutation', () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, DEBOUNCE_MS);
  });

  ctx.data
    .filterOptions()
    .then((map) => {
      const options = map.get('type_filters.rarity');
      if (options?.length && !disposed) rarities.set(options);
    })
    .catch(() => {
      // Keep our own labels.
    });

  const host = doc.createElement('div');
  host.className = 'ptm-qf';
  // First child of the site's control bar, so strip and Search/Clear form one block that the
  // layout keeps at the bottom of the screen.
  const place = () => {
    const controls = doc.querySelector(sel.controls);
    if (controls && controls.firstElementChild !== host) controls.prepend(host);
  };
  // ponytail: watches the whole body because Vue may replace #trade itself; the callback is one querySelector.
  const observer = new MutationObserver(place);
  observer.observe(doc.body, { childList: true, subtree: true });
  place();
  render(<Strip state={state} rarities={rarities} apply={apply} />, host);
  void refresh();

  return {
    dispose() {
      disposed = true;
      clearTimeout(timer);
      offMutation();
      observer.disconnect();
      render(null, host);
      host.remove();
    },
  };
}

export const quickFiltersFeature: Feature = {
  id: 'quick-filters',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start,
};
