import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CreditBalanceCard, type CreditBalanceCardProps } from './CreditBalanceCard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const packs = [{ id: 'usd-5', label: '$5' }];

function setup(overrides: Partial<CreditBalanceCardProps> = {}, language: 'en' | 'fr' = 'en') {
  const props: CreditBalanceCardProps = { state: 'ok', balance: '$22.03', packs, onBuy: vi.fn(), ...overrides };
  renderWithI18n(<CreditBalanceCard {...props} />, { language });
  return props;
}

describe('CreditBalanceCard', () => {
  it('shows the balance, how billing works and the packs', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Credit balance' })).toBeInTheDocument();
    expect(screen.getByTestId('credit-balance-amount')).toHaveTextContent('$22.03');
    expect(screen.getByTestId('credit-balance')).toHaveAttribute('data-state', 'ok');
    expect(screen.getByTestId('credit-balance-message')).toHaveTextContent('reserves its estimate');
    expect(screen.getByTestId('credit-balance-buy-usd-5')).toHaveTextContent('Buy $5');
  });

  it('buys a pack', () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('credit-balance-buy-usd-5'));
    expect(props.onBuy).toHaveBeenCalledWith('usd-5');
  });

  it('warns when the balance is low', () => {
    setup({ state: 'low', balance: '$0.42' });
    expect(screen.getByTestId('credit-balance-message')).toHaveTextContent('Your balance is low.');
  });

  it('says why a negative balance pauses Pro', () => {
    setup({ state: 'negative', balance: '-$14.60' });
    expect(screen.getByTestId('credit-balance')).toHaveAttribute('data-state', 'negative');
    expect(screen.getByTestId('credit-balance-message')).toHaveTextContent('refunded or disputed');
    expect(screen.getByTestId('credit-balance-message')).toHaveTextContent('Pro runs are paused');
  });

  it('says when a checkout could not start', () => {
    setup({ buyError: true });
    expect(screen.getByTestId('credit-balance-buy-error')).toHaveAttribute('role', 'alert');
  });

  it('renders in French', () => {
    setup({ state: 'negative', balance: '-14,60 $' }, 'fr');
    expect(screen.getByRole('heading', { name: 'Solde de crédits' })).toBeInTheDocument();
    expect(screen.getByTestId('credit-balance-message')).toHaveTextContent('remboursé ou contesté');
  });
});
