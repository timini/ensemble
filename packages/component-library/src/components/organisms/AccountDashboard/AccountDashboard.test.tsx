import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AccountDashboard, type AccountDashboardProps } from './AccountDashboard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const props: AccountDashboardProps = {
  email: 'ada@example.com',
  balance: { state: 'ok', balance: '$22.03', packs: [{ id: 'usd-5', label: '$5' }], onBuy: () => undefined },
  usage: { status: 'ready', days: 30, items: [] },
  purchases: { status: 'ready', items: [] },
  runs: { status: 'ready', items: [] },
};

describe('AccountDashboard', () => {
  it('shows the account heading, the balance and the three lists', () => {
    renderWithI18n(<AccountDashboard {...props} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument();
    expect(screen.getByTestId('account-dashboard-user')).toHaveTextContent('Signed in as ada@example.com');
    expect(screen.getByTestId('credit-balance-amount')).toHaveTextContent('$22.03');
    expect(screen.getByTestId('model-usage')).toBeInTheDocument();
    expect(screen.getByTestId('purchase-history')).toBeInTheDocument();
    expect(screen.getByTestId('run-history')).toBeInTheDocument();
  });

  it('holds the balance place while it loads', () => {
    renderWithI18n(<AccountDashboard {...props} balance={null} />);
    expect(screen.getByTestId('account-dashboard-balance-loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('says when the balance could not load', () => {
    renderWithI18n(<AccountDashboard {...props} balance={null} balanceError />);
    expect(screen.getByTestId('account-dashboard-balance-error')).toHaveAttribute('role', 'alert');
  });

  it('renders in French', () => {
    renderWithI18n(<AccountDashboard {...props} />, { language: 'fr' });
    expect(screen.getByRole('heading', { level: 1, name: 'Compte' })).toBeInTheDocument();
    expect(screen.getByTestId('account-dashboard-user')).toHaveTextContent('Connecté en tant que ada@example.com');
  });
});
