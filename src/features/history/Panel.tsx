import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { AppContext } from '../../app/context';
import { createTranslator, getLocale } from '../../core/i18n';
import { type Store, useStore } from '../../core/store';
import { buildTradePath } from '../../site/tradeLocation';
import { Button } from '../../ui/components/Button';
import { ConfirmDialog } from '../../ui/components/ConfirmDialog';
import { IconTrash } from '../../ui/icons';
import type { HistoryEntry } from './index';

const t = createTranslator({
  de: {
    search: 'Suche',
    exchange: 'Große Mengen',
    openIn: 'in {league} öffnen',
    clear: 'Verlauf leeren',
    clearMessage: 'Alle {n} Einträge aus dem Verlauf löschen?',
    clearConfirm: 'Leeren',
    empty: 'Noch keine Suchen. Jede Suche, die du öffnest, landet hier.',
  },
  en: {
    search: 'Search',
    exchange: 'Bulk exchange',
    openIn: 'open in {league}',
    clear: 'Clear history',
    clearMessage: 'Delete all {n} entries from the history?',
    clearConfirm: 'Clear',
    empty: 'No searches yet. Every search you open shows up here.',
  },
});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "vor 5 Minuten" / "5 minutes ago" in the current locale. Under a minute reads "jetzt" / "now". */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = (Date.parse(iso) - now) / 1000;
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit);
  }
  return format.format(0, 'second');
}

export function historyPanel(entries: Store<HistoryEntry[]>, ctx: Pick<AppContext, 'leagues' | 'searchNames'>): ComponentType {
  return function HistoryPanel() {
    const list = useStore(entries);
    const names = useStore(ctx.searchNames);
    const current = useStore(ctx.leagues.current);
    const [confirming, setConfirming] = useState(false);
    // Re-render once a minute so "2 minutes ago" keeps counting.
    const [, setTick] = useState(0);
    useEffect(() => {
      const timer = setInterval(() => setTick((n) => n + 1), 60_000);
      return () => clearInterval(timer);
    }, []);

    if (list.length === 0) return <p class="ptm-empty">{t('empty')}</p>;

    return (
      <div class="ptm-history">
        <div class="ptm-toolbar">
          <Button variant="plain" size="sm" icon={<IconTrash />} onClick={() => setConfirming(true)}>
            {t('clear')}
          </Button>
        </div>
        <ul class="ptm-history__list">
          {list.map((entry) => {
            const href = (league: string) =>
              buildTradePath({ type: entry.type, realm: entry.realm, league, id: entry.searchId, live: entry.live });
            return (
              <li key={entry.id} class="ptm-history__item">
                <a class="ptm-history__title" href={href(entry.league)}>
                  {entry.live && '⚡ '}
                  {names[entry.searchId] || entry.title}
                </a>
                <p class="ptm-meta">
                  {t(entry.type)} · {entry.league} ·{' '}
                  <time dateTime={entry.createdAt} title={new Date(entry.createdAt).toLocaleString(getLocale())}>
                    {relativeTime(entry.createdAt)}
                  </time>
                </p>
                {current && current !== entry.league && (
                  <a class="ptm-history__other" href={href(current)}>
                    {t('openIn', { league: current })}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        {confirming && (
          <ConfirmDialog
            title={t('clear')}
            message={t('clearMessage', { n: list.length })}
            confirmLabel={t('clearConfirm')}
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              entries.set([]);
            }}
          />
        )}
      </div>
    );
  };
}
