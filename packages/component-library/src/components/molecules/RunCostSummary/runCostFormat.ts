/**
 * Format a USD amount: exactly two significant digits below one dollar
 * ($0.012, $0.90), cents from there up. Amounts that would round to a
 * dollar at two significant digits use cents too.
 */
export function formatUsd(value: number, locale: string): string {
  const small = value > 0 && value < 0.995;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    ...(small
      ? { minimumSignificantDigits: 2, maximumSignificantDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }).format(value);
}

/** How much of the run the price table covers. */
export type Coverage = 'all' | 'partial' | 'none';

export function coverageOf(priced: number, unpriced: number): Coverage {
  if (unpriced === 0) return 'all';
  return priced === 0 ? 'none' : 'partial';
}
