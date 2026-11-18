import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { SignInPanel } from './SignInPanel';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

function setup(props: Partial<React.ComponentProps<typeof SignInPanel>> = {}, language: 'en' | 'fr' = 'en') {
  const onGoogle = vi.fn();
  const onEmailLink = vi.fn();
  renderWithI18n(<SignInPanel onGoogle={onGoogle} onEmailLink={onEmailLink} {...props} />, { language });
  return { onGoogle, onEmailLink };
}

describe('SignInPanel', () => {
  it('explains that an account is only needed for Pro, sharing and sync', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText(/only need an account for Pro credits/)).toBeInTheDocument();
  });

  it('starts Google sign-in', () => {
    const { onGoogle } = setup();
    fireEvent.click(screen.getByTestId('sign-in-google'));
    expect(onGoogle).toHaveBeenCalledOnce();
  });

  it('sends an email link to the trimmed address', () => {
    const { onEmailLink } = setup();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  ada@example.com ' } });
    fireEvent.click(screen.getByTestId('sign-in-email-submit'));
    expect(onEmailLink).toHaveBeenCalledWith('ada@example.com');
  });

  it('does not send an empty or malformed address and says why', () => {
    const { onEmailLink } = setup();
    fireEvent.click(screen.getByTestId('sign-in-email-submit'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.submit(screen.getByTestId('sign-in-email-form'));
    expect(onEmailLink).not.toHaveBeenCalled();
    expect(screen.getByTestId('sign-in-error')).toHaveTextContent('Enter a valid email address.');
  });

  it('shows where the link went', () => {
    setup({ emailSentTo: 'ada@example.com' });
    expect(screen.getByTestId('sign-in-email-sent')).toHaveTextContent('ada@example.com');
  });

  it('disables the buttons while a request is pending', () => {
    setup({ pending: true });
    expect(screen.getByTestId('sign-in-google')).toBeDisabled();
    expect(screen.getByTestId('sign-in-email-submit')).toBeDisabled();
  });

  it('shows a translated error as an alert', () => {
    setup({ error: 'network' }, 'fr');
    expect(screen.getByRole('alert')).toHaveTextContent('Pas de connexion');
  });

  it('asks for the address again to finish an email link, without Google', () => {
    const { onEmailLink } = setup({ confirmEmail: true });
    expect(screen.getByRole('heading', { name: 'Finish signing in' })).toBeInTheDocument();
    expect(screen.queryByTestId('sign-in-google')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByTestId('sign-in-email-submit'));
    expect(onEmailLink).toHaveBeenCalledWith('ada@example.com');
  });
});
