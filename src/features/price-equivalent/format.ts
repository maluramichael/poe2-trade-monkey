import { getLocale } from '../../core/i18n';
import type { Price } from '../../site/tradeTypes';
import type { Rates } from './rates';

export interface Equivalent {
  currency: 'divine' | 'exalted';
  text: string;
}

const MIN_DIVINE = 0.1;

export function formatAmount(value: number, locale: string = getLocale()): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

/** The price in divine (from 0.1 on) and exalted, leaving out the currency it is listed in. */
export function equivalents(price: Price, rates: Rates, locale: string = getLocale()): Equivalent[] {
  const unit = rates.get(price.currency);
  if (unit === undefined) return [];
  const divine = price.amount * unit;
  const result: Equivalent[] = [];
  if (price.currency !== 'divine' && divine >= MIN_DIVINE) result.push({ currency: 'divine', text: formatAmount(divine, locale) });
  const exalted = rates.get('exalted');
  if (price.currency !== 'exalted' && exalted) result.push({ currency: 'exalted', text: formatAmount(divine / exalted, locale) });
  return result;
}
