import { describe, expect, it } from 'vitest';
import { createTestI18n } from '../../../lib/test-utils/i18n-test-wrapper';
import { methodCostLabel } from './methodCost';
import { estimate } from './fixtures';

const t = createTestI18n('en').t;

describe('methodCostLabel', () => {
  it('shows a range when low and high differ', () => {
    expect(methodCostLabel(estimate(7, 0.004, 0.012), t, 'en')).toBe('$0.0040 to $0.012');
  });

  it('says about when both ends round to the same amount', () => {
    expect(methodCostLabel(estimate(7, 0.0101, 0.0102), t, 'en')).toBe('about $0.010');
  });

  it('says free when every call is local', () => {
    expect(methodCostLabel(estimate(7, 0, 0, { local: 7 }), t, 'en')).toBe('free');
  });

  it('gives a lower bound when some calls have no price', () => {
    expect(methodCostLabel(estimate(7, 0.004, 0.012, { priced: 4, unpriced: 3 }), t, 'en')).toBe('at least $0.0040');
  });

  it('says unknown when no call has a price', () => {
    expect(methodCostLabel(estimate(7, 0, 0, { priced: 0, unpriced: 7 }), t, 'en')).toBe('cost unknown');
  });

  it('formats for French', () => {
    const fr = createTestI18n('fr').t;
    expect(methodCostLabel(estimate(7, 0.004, 0.012), fr, 'fr')).toMatch(/^0,0040\s\$US à 0,012\s\$US$/);
  });
});
