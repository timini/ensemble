import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { PurchaseHistory, type PurchaseHistoryItem } from './PurchaseHistory';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const items: PurchaseHistoryItem[] = [
  { id: 'r', kind: 'refund', amount: '-$20.00', date: '12 Nov 2026', negative: true },
  { id: 'd', kind: 'dispute', amount: '-$5.00', date: '10 Nov 2026', negative: true },
  { id: 'p', kind: 'purchase', pack: '$20', amount: '+$20.00', date: '3 Nov 2026' },
  { id: 'g', kind: 'grant', amount: '+$1.00', date: '1 Nov 2026' },
];

describe('PurchaseHistory', () => {
  it('names each kind of entry with its amount and date', () => {
    renderWithI18n(<PurchaseHistory items={items} status="ready" />);
    const rows = within(screen.getByTestId('purchase-history-list')).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      'Refund12 Nov 2026-$20.00',
      'Disputed payment10 Nov 2026-$5.00',
      '$20 credit pack3 Nov 2026+$20.00',
      'Free credits1 Nov 2026+$1.00',
    ]);
    expect(screen.getByTestId('purchase-history-item-r')).toHaveAttribute('data-kind', 'refund');
    expect(screen.getByTestId('purchase-history-amount-r').className).toContain('text-destructive');
  });

  it('says when there are no purchases', () => {
    renderWithI18n(<PurchaseHistory items={[]} status="ready" />);
    expect(screen.getByTestId('purchase-history-empty')).toHaveTextContent('No purchases yet.');
  });

  it('renders in French', () => {
    renderWithI18n(<PurchaseHistory items={items} status="ready" />, { language: 'fr' });
    expect(screen.getByRole('heading', { name: 'Achats' })).toBeInTheDocument();
    expect(screen.getByTestId('purchase-history-item-r')).toHaveTextContent('Remboursement');
    expect(screen.getByTestId('purchase-history-item-p')).toHaveTextContent('Pack de crédits $20');
  });
});
