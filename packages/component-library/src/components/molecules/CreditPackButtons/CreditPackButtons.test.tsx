import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CreditPackButtons } from './CreditPackButtons';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const packs = [
  { id: 'usd-5', label: '$5' },
  { id: 'usd-20', label: '$20' },
];

describe('CreditPackButtons', () => {
  it('offers a buy button per pack in a labelled group', () => {
    renderWithI18n(<CreditPackButtons packs={packs} onBuy={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Credit packs' })).toBeInTheDocument();
    expect(screen.getByTestId('credit-pack-buy-usd-5')).toHaveTextContent('Buy $5');
    expect(screen.getByTestId('credit-pack-buy-usd-20')).toHaveTextContent('Buy $20');
  });

  it('starts checkout for the chosen pack', () => {
    const onBuy = vi.fn();
    renderWithI18n(<CreditPackButtons packs={packs} onBuy={onBuy} />);
    fireEvent.click(screen.getByTestId('credit-pack-buy-usd-20'));
    expect(onBuy).toHaveBeenCalledWith('usd-20');
  });

  it('uses the given test id prefix', () => {
    renderWithI18n(<CreditPackButtons packs={packs} onBuy={vi.fn()} testIdPrefix="credit-notice-buy" />);
    expect(screen.getByTestId('credit-notice-buy-usd-5')).toBeInTheDocument();
  });

  it('disables every pack and marks the pending one', () => {
    renderWithI18n(<CreditPackButtons packs={packs} onBuy={vi.fn()} pendingPackId="usd-5" />);
    expect(screen.getByTestId('credit-pack-buy-usd-5')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('credit-pack-buy-usd-20')).toBeDisabled();
  });

  it('renders nothing without packs', () => {
    const { container } = renderWithI18n(<CreditPackButtons packs={[]} onBuy={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders in French', () => {
    renderWithI18n(<CreditPackButtons packs={packs} onBuy={vi.fn()} />, { language: 'fr' });
    expect(screen.getByRole('group', { name: 'Packs de crédits' })).toBeInTheDocument();
    expect(screen.getByTestId('credit-pack-buy-usd-5')).toHaveTextContent('Acheter $5');
  });
});
