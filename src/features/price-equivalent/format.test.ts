import { describe, expect, it } from 'vitest';
import { equivalents, formatAmount } from './format';

// 1 divine = 500 exalted = 8 chaos
const rates = new Map([
  ['divine', 1],
  ['exalted', 1 / 500],
  ['chaos', 1 / 8],
]);
const price = (amount: number, currency: string) => ({ type: '~price', amount, currency });

describe('formatAmount', () => {
  it('rounds by magnitude', () => {
    expect(formatAmount(1234.56, 'en')).toBe('1,235');
    expect(formatAmount(12.345, 'en')).toBe('12.3');
    expect(formatAmount(1.234, 'en')).toBe('1.23');
    expect(formatAmount(2, 'en')).toBe('2');
  });

  it('uses the locale', () => {
    expect(formatAmount(1.5, 'de')).toBe('1,5');
    expect(formatAmount(1234, 'de')).toBe('1.234');
  });
});

describe('equivalents', () => {
  it('shows divine and exalted for other currencies', () => {
    expect(equivalents(price(4, 'chaos'), rates, 'en')).toEqual([
      { currency: 'divine', text: '0.5' },
      { currency: 'exalted', text: '250' },
    ]);
  });

  it('shows divine for exalted prices from 0.1 divine on', () => {
    expect(equivalents(price(1000, 'exalted'), rates, 'en')).toEqual([{ currency: 'divine', text: '2' }]);
    expect(equivalents(price(49, 'exalted'), rates, 'en')).toEqual([]);
  });

  it('shows exalted for divine prices', () => {
    expect(equivalents(price(1.5, 'divine'), rates, 'de')).toEqual([{ currency: 'exalted', text: '750' }]);
  });

  it('shows nothing for unknown currencies or without exalted rate', () => {
    expect(equivalents(price(1, 'unknown'), rates, 'en')).toEqual([]);
    expect(equivalents(price(1, 'divine'), new Map([['divine', 1]]), 'en')).toEqual([]);
  });
});
