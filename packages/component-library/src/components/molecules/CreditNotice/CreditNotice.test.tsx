import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CreditNotice, type CreditNoticeProps } from './CreditNotice';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const packs = [
  { id: 'pack-5', label: '$5' },
  { id: 'pack-20', label: '$20' },
];

function setup(overrides: Partial<CreditNoticeProps> = {}, language: 'en' | 'fr' = 'en') {
  const props: CreditNoticeProps = { variant: 'balance', balance: '$4.20', packs, onBuy: vi.fn(), ...overrides };
  const result = renderWithI18n(<CreditNotice {...props} />, { language });
  return { props, ...result };
}

describe('CreditNotice', () => {
  it('shows the balance as a status with a buy button per pack', () => {
    setup();
    const notice = screen.getByTestId('credit-notice');
    expect(notice).toHaveAttribute('data-variant', 'balance');
    expect(notice).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent('Credits: $4.20');
    expect(screen.getByTestId('credit-notice-buy-pack-5')).toHaveTextContent('Buy $5');
    expect(screen.getByTestId('credit-notice-buy-pack-20')).toHaveTextContent('Buy $20');
  });

  it('starts checkout for the chosen pack', () => {
    const { props } = setup();
    fireEvent.click(screen.getByTestId('credit-notice-buy-pack-20'));
    expect(props.onBuy).toHaveBeenCalledWith('pack-20');
  });

  it('hides the buy buttons without onBuy', () => {
    setup({ onBuy: undefined });
    expect(screen.queryByTestId('credit-notice-buy-pack-5')).not.toBeInTheDocument();
  });

  it('warns when the balance is low', () => {
    setup({ variant: 'low', balance: '$0.42' });
    expect(screen.getByTestId('credit-notice')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent(
      'Your credit balance is low ($0.42). Buy credits to keep using Pro.',
    );
    expect(screen.getByTestId('credit-notice-buy-pack-5')).toBeInTheDocument();
  });

  it('alerts when the run needs more credits than the balance', () => {
    setup({ variant: 'insufficient', balance: '$0.04', required: '$0.12' });
    expect(screen.getByTestId('credit-notice')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent(
      'This run needs about $0.12 in credits and your balance is $0.04. Buy credits or choose fewer or cheaper models.',
    );
    expect(screen.getByTestId('credit-notice-buy-pack-5')).toBeInTheDocument();
  });

  it('blocks Pro while the balance is negative and offers the packs', () => {
    setup({ variant: 'negative', balance: '-$4.00' });
    expect(screen.getByTestId('credit-notice')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent(
      'Your balance is -$4.00 because a payment was refunded or disputed after its credits were used. Buy credits to use Pro again.',
    );
    expect(screen.getByTestId('credit-notice-buy-pack-5')).toBeInTheDocument();
  });

  it('lists the models Pro cannot price, without buy buttons', () => {
    setup({ variant: 'unpriced', unpricedModels: ['Model A', 'Model B'] });
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent(
      'Pro cannot price Model A and Model B yet, so it cannot run them. Remove them to ask.',
    );
    expect(screen.queryByTestId('credit-notice-buy-pack-5')).not.toBeInTheDocument();
  });

  it('uses the singular for one unpriced model', () => {
    setup({ variant: 'unpriced', unpricedModels: ['Model A'] });
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent('so it cannot run it. Remove it to ask.');
  });

  it('alerts when the balance could not load', () => {
    setup({ variant: 'error', balance: undefined });
    expect(screen.getByTestId('credit-notice')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent('Could not load your credit balance.');
    expect(screen.queryByTestId('credit-notice-buy-pack-5')).not.toBeInTheDocument();
  });

  it('disables every pack and marks the pending one while checkout starts', () => {
    setup({ pendingPackId: 'pack-5' });
    const pending = screen.getByTestId('credit-notice-buy-pack-5');
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('credit-notice-buy-pack-20')).toBeDisabled();
    expect(screen.getByTestId('credit-notice-buy-pack-20')).not.toHaveAttribute('aria-busy');
  });

  it('says when a checkout could not start', () => {
    setup({ buyError: true });
    const error = screen.getByTestId('credit-notice-buy-error');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveTextContent('Could not start the checkout. Try again.');
  });

  it('renders in French', () => {
    setup({ variant: 'low', balance: '0,42 $' }, 'fr');
    expect(screen.getByTestId('credit-notice-message')).toHaveTextContent('Votre solde de crédits est bas (0,42 $).');
    expect(screen.getByTestId('credit-notice-buy-pack-5')).toHaveTextContent('Acheter $5');
  });
});
