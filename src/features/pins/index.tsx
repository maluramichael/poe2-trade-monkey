import { Store, useStore } from '../../core/store';
import { createTranslator } from '../../core/i18n';
import type { AppContext } from '../../app/context';
import type { ResultRow } from '../../site/results';
import { sel } from '../../site/selectors';
import { Button } from '../../ui/components/Button';
import { IconPin, IconTrash } from '../../ui/icons';
import type { Feature } from '../types';
import css from './feature.css';

const t = createTranslator({
  de: {
    label: 'Angepinnte Items',
    tab: 'Pins',
    description: 'Ergebnisse anpinnen und vergleichen.',
    pin: 'Anpinnen',
    unpin: 'Lösen',
    scroll: 'Zum Ergebnis',
    remove: 'Entfernen',
    clear: 'Alle entfernen',
    seller: 'Verkäufer: {seller}',
    empty: 'Noch nichts angepinnt. Klick bei einem Ergebnis auf „Anpinnen“, um es hier zu sammeln. Pins bleiben bis zum Neuladen der Seite erhalten, auch bei neuen Suchen.',
  },
  en: {
    label: 'Pinned items',
    tab: 'Pins',
    description: 'Pin results to compare them.',
    pin: 'Pin',
    unpin: 'Unpin',
    scroll: 'Scroll to result',
    remove: 'Unpin',
    clear: 'Clear pins',
    seller: 'Seller: {seller}',
    empty: 'Nothing pinned yet. Click "Pin" on a result to collect it here. Pins stay until you reload the page, even across new searches.',
  },
});

interface Pin {
  id: string;
  /** outerHTML of the row's `.item-popup`, the site's own markup. */
  html: string;
  priceHtml: string;
  seller: string;
  indexed: string;
  pinnedAt: number;
}

const BUTTON_CLASS = 'ptm-pin-btn';
const PINNED_CLASS = 'ptm-pinned';
const GLOW_CLASS = 'ptm-pin-glow';
const GLOW_MS = 1000;

function start(ctx: AppContext) {
  const { doc } = ctx;
  const pins = new Store<Pin[]>([]);
  /** Bumped whenever rows appear or vanish, so the panel re-checks which pins are on screen. */
  const rowsVersion = new Store(0);
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const rowElements = () => [...doc.querySelectorAll<HTMLElement>(sel.resultRow)];
  const findRow = (id: string) => rowElements().find((element) => element.dataset.id === id);
  const isPinned = (id: string) => pins.get().some((pin) => pin.id === id);

  const sync = (element: HTMLElement) => {
    const pinned = isPinned(element.dataset.id ?? '');
    element.classList.toggle(PINNED_CLASS, pinned);
    const button = element.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    if (!button) return;
    button.textContent = pinned ? t('unpin') : t('pin');
    button.setAttribute('aria-pressed', String(pinned));
  };

  const snapshot = (element: HTMLElement, id: string): Pin => {
    const popup = element.querySelector(sel.row.itemPopup)?.cloneNode(true) as HTMLElement | undefined;
    // Buttons other features put into the card (mod actions) are dead in the copy.
    popup?.querySelectorAll('button').forEach((button) => button.remove());
    const listing = ctx.results.getListing(id)?.listing;
    return {
      id,
      html: popup?.outerHTML ?? '',
      priceHtml: element.querySelector(sel.row.price)?.innerHTML ?? '',
      seller: listing?.account.name ?? element.querySelector(sel.row.sellerLink)?.textContent ?? '',
      indexed: listing?.indexed ?? '',
      pinnedAt: Date.now(),
    };
  };

  const toggle = (element: HTMLElement) => {
    const id = element.dataset.id ?? '';
    if (isPinned(id)) {
      pins.update((list) => list.filter((pin) => pin.id !== id));
      return;
    }
    pins.update((list) => [...list, snapshot(element, id)]);
    ctx.settings.update((settings) => ({ ...settings, activeTab: 'pins' }));
  };

  const decorate = (row: ResultRow) => {
    rowsVersion.update((n) => n + 1);
    const bar = row.element.querySelector(sel.row.buttons);
    if (!bar) return;
    bar.querySelector(`.${BUTTON_CLASS}`)?.remove();
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = `btn btn-default ${BUTTON_CLASS}`;
    button.addEventListener('click', () => toggle(row.element));
    bar.append(button);
    sync(row.element);
  };

  const scrollTo = (id: string) => {
    const element = findRow(id);
    if (!element) return;
    element.scrollIntoView({ block: 'center' });
    element.classList.remove(GLOW_CLASS);
    void element.offsetWidth; // restart the animation on repeated clicks
    element.classList.add(GLOW_CLASS);
    const timer = setTimeout(() => {
      timers.delete(timer);
      element.classList.remove(GLOW_CLASS);
    }, GLOW_MS);
    timers.add(timer);
  };

  const unsubscribe = pins.subscribe(() => rowElements().forEach(sync));
  const offDecorate = ctx.results.decorate('pins', decorate);
  const offClear = ctx.results.onClear(() => rowsVersion.update((n) => n + 1));

  function Panel() {
    const list = useStore(pins);
    useStore(rowsVersion);
    if (list.length === 0) return <p class="ptm-empty">{t('empty')}</p>;
    return (
      <div class="ptm-pins">
        <div class="ptm-toolbar">
          <Button variant="gold" icon={<IconTrash />} onClick={() => pins.set([])}>
            {t('clear')}
          </Button>
        </div>
        {list.map((pin) => (
          <article key={pin.id} class="ptm-pin">
            <div class="ptm-pin__item" dangerouslySetInnerHTML={{ __html: pin.html }} />
            <div class="ptm-pin__price" dangerouslySetInnerHTML={{ __html: pin.priceHtml }} />
            <p class="ptm-meta ptm-pin__seller">
              {t('seller', { seller: pin.seller })}
              {pin.indexed && ` · ${new Date(pin.indexed).toLocaleString()}`}
            </p>
            <div class="ptm-pin__actions">
              {/* Plain button with kit classes: the kit's Button props do not accept `disabled`. */}
              <button type="button" class="ptm-btn ptm-btn--blue" disabled={!findRow(pin.id)} onClick={() => scrollTo(pin.id)}>
                <span>{t('scroll')}</span>
              </button>
              <Button variant="plain" onClick={() => pins.update((all) => all.filter((p) => p.id !== pin.id))}>
                {t('remove')}
              </Button>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return {
    Panel,
    dispose() {
      unsubscribe();
      offDecorate();
      offClear();
      timers.forEach(clearTimeout);
      doc.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => button.remove());
      doc.querySelectorAll(`.${PINNED_CLASS}, .${GLOW_CLASS}`).forEach((element) => element.classList.remove(PINNED_CLASS, GLOW_CLASS));
    },
  };
}

export const pinsFeature: Feature = {
  id: 'pins',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  sidebarTab: { label: () => t('tab'), icon: IconPin, order: 3 },
  start,
};
