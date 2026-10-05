import { createTranslator } from '../../core/i18n';
import type { ResultRow } from '../../site/results';
import { sel } from '../../site/selectors';
import type { CurrencyEntry } from '../../site/tradeData';
import type { Feature } from '../types';
import css from './feature.css';
import { equivalents } from './format';
import { RateSource, type Rates } from './rates';

const t = createTranslator({
  de: {
    label: 'Preis-Umrechnung',
    description: 'Rechnet Preise über poe.ninja in Divine und Exalted um.',
    source: 'Umgerechnet mit Kursen von poe.ninja',
  },
  en: {
    label: 'Price equivalent',
    description: 'Converts prices to Divine and Exalted via poe.ninja.',
    source: 'Converted with poe.ninja rates',
  },
});

const LINE_CLASS = 'ptm-price-equivalent';

export const priceEquivalentFeature: Feature = {
  id: 'price-equivalent',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start(ctx) {
    const source = new RateSource(ctx.storage);
    let undecorate = () => {};
    let generation = 0;

    const clear = () => {
      undecorate();
      undecorate = () => {};
      for (const line of ctx.doc.querySelectorAll(`.${LINE_CLASS}`)) line.remove();
    };

    const load = async (league: string | null) => {
      const current = ++generation;
      clear();
      if (!league) return;
      const [rates, currencies] = await Promise.all([
        source.get(league),
        ctx.data.currencies().catch(() => new Map<string, CurrencyEntry>()),
      ]);
      if (current !== generation || rates.size === 0) return;
      undecorate = ctx.results.decorate('price-equivalent', (row) => render(ctx.doc, row, rates, currencies));
    };

    void load(ctx.leagues.current.get());
    const off = ctx.leagues.current.subscribe((league) => void load(league));
    return {
      dispose() {
        off();
        generation++;
        clear();
      },
    };
  },
};

function render(doc: Document, row: ResultRow, rates: Rates, currencies: Map<string, CurrencyEntry>): void {
  const target = row.element.querySelector(sel.row.price);
  target?.querySelector(`.${LINE_CLASS}`)?.remove();
  const price = row.data?.listing.price;
  if (!target || !price) return;
  const parts = equivalents(price, rates);
  if (parts.length === 0) return;

  const line = doc.createElement('div');
  line.className = LINE_CLASS;
  line.title = t('source');
  for (const part of parts) {
    const span = doc.createElement('span');
    span.className = `${LINE_CLASS}__part`;
    span.append(`≈ ${part.text}`);
    const currency = currencies.get(part.currency);
    if (currency?.image) {
      const img = doc.createElement('img');
      img.className = `${LINE_CLASS}__icon`;
      img.src = currency.image;
      img.alt = img.title = currency.text;
      span.append(img);
    } else {
      span.append(` ${currency?.text ?? part.currency}`);
    }
    line.append(span);
  }
  // Inside the site's grey price box, right under the asking price.
  (target.querySelector(sel.row.priceField) ?? target).append(line);
}
