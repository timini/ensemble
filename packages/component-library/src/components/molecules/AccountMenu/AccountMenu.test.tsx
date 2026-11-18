import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AccountMenu, initialsOf } from './AccountMenu';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const signIn = { onGoogle: vi.fn(), onEmailLink: vi.fn() };

describe('AccountMenu', () => {
  it('offers sign-in while signed out and opens the sign-in panel', () => {
    renderWithI18n(<AccountMenu status="signedOut" signIn={signIn} />);
    const trigger = screen.getByTestId('account-menu-trigger');
    expect(trigger).toHaveTextContent('Sign in');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('account-menu-panel')).toContainElement(screen.getByTestId('sign-in-panel'));
    fireEvent.click(screen.getByTestId('sign-in-google'));
    expect(signIn.onGoogle).toHaveBeenCalledOnce();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderWithI18n(<AccountMenu status="signedOut" signIn={signIn} defaultOpen />);
    fireEvent.keyDown(screen.getByTestId('account-menu-trigger'), { key: 'Escape' });
    expect(screen.queryByTestId('account-menu-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-menu-trigger')).toHaveFocus();
  });

  it('shows a busy trigger while the session loads', () => {
    renderWithI18n(<AccountMenu status="loading" />);
    const trigger = screen.getByTestId('account-menu-trigger');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAccessibleName('Checking your account');
  });

  it('shows the signed-in user and signs out', () => {
    const onSignOut = vi.fn();
    renderWithI18n(
      <AccountMenu status="signedIn" user={{ name: 'Ada Lovelace', email: 'ada@example.com' }} onSignOut={onSignOut}>
        <p>Credits: $4.20</p>
      </AccountMenu>,
    );
    const trigger = screen.getByTestId('account-menu-trigger');
    expect(trigger).toHaveAccessibleName('Account: Ada Lovelace');
    expect(trigger).toHaveTextContent('AL');
    fireEvent.click(trigger);
    expect(screen.getByTestId('account-menu-user')).toHaveTextContent('ada@example.com');
    expect(screen.getByText('Credits: $4.20')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('account-menu-sign-out'));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('account-menu-panel')).not.toBeInTheDocument();
  });

  it('explains when sign-in is not set up, in French too', () => {
    renderWithI18n(<AccountMenu status="unavailable" defaultOpen />, { language: 'fr' });
    expect(screen.getByTestId('account-menu-unavailable')).toHaveTextContent('Le mode gratuit fonctionne sans compte');
    expect(screen.queryByTestId('sign-in-panel')).not.toBeInTheDocument();
  });
});

describe('initialsOf', () => {
  it('uses the first and last names, or the email', () => {
    expect(initialsOf({ name: 'Ada King Lovelace' })).toBe('AL');
    expect(initialsOf({ name: 'Ada' })).toBe('A');
    expect(initialsOf({ email: 'zed@example.com' })).toBe('Z');
    expect(initialsOf({})).toBe('?');
  });
});
