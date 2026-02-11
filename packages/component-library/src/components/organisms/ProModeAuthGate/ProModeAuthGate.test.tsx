import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProModeAuthGate } from './ProModeAuthGate';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const defaultProps = {
  authStatus: 'unauthenticated' as const,
  onSignInWithGoogle: vi.fn(),
  onSignInWithGitHub: vi.fn(),
  onSignOut: vi.fn(),
};

describe('ProModeAuthGate', () => {
  describe('unauthenticated state', () => {
    it('renders sign-in heading', () => {
      render(<ProModeAuthGate {...defaultProps} />);
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });

    it('renders Google sign-in button', () => {
      render(<ProModeAuthGate {...defaultProps} />);
      expect(screen.getByTestId('auth-google-button')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('renders GitHub sign-in button', () => {
      render(<ProModeAuthGate {...defaultProps} />);
      expect(screen.getByTestId('auth-github-button')).toBeInTheDocument();
      expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    });

    it('calls onSignInWithGoogle when clicked', async () => {
      const onSignInWithGoogle = vi.fn();
      const user = userEvent.setup();
      render(<ProModeAuthGate {...defaultProps} onSignInWithGoogle={onSignInWithGoogle} />);

      await user.click(screen.getByTestId('auth-google-button'));
      expect(onSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('calls onSignInWithGitHub when clicked', async () => {
      const onSignInWithGitHub = vi.fn();
      const user = userEvent.setup();
      render(<ProModeAuthGate {...defaultProps} onSignInWithGitHub={onSignInWithGitHub} />);

      await user.click(screen.getByTestId('auth-github-button'));
      expect(onSignInWithGitHub).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('renders loading spinner', () => {
      render(<ProModeAuthGate {...defaultProps} authStatus="loading" />);
      expect(screen.getByTestId('auth-loading-spinner')).toBeInTheDocument();
    });

    it('does not render sign-in buttons', () => {
      render(<ProModeAuthGate {...defaultProps} authStatus="loading" />);
      expect(screen.queryByTestId('auth-google-button')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    const authUser = {
      displayName: 'Jane Doe',
      email: 'jane@example.com',
      photoURL: 'https://example.com/photo.jpg',
    };

    it('renders user display name', () => {
      render(
        <ProModeAuthGate
          {...defaultProps}
          authStatus="authenticated"
          user={authUser}
        />,
      );
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('renders user email', () => {
      render(
        <ProModeAuthGate
          {...defaultProps}
          authStatus="authenticated"
          user={authUser}
        />,
      );
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('renders user avatar when photoURL is provided', () => {
      render(
        <ProModeAuthGate
          {...defaultProps}
          authStatus="authenticated"
          user={authUser}
        />,
      );
      expect(screen.getByTestId('auth-user-avatar')).toBeInTheDocument();
    });

    it('renders fallback avatar when no photoURL', () => {
      render(
        <ProModeAuthGate
          {...defaultProps}
          authStatus="authenticated"
          user={{ ...authUser, photoURL: null }}
        />,
      );
      expect(screen.getByTestId('auth-user-avatar-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('auth-user-avatar-fallback')).toHaveTextContent('J');
    });

    it('renders sign-out button', () => {
      render(
        <ProModeAuthGate
          {...defaultProps}
          authStatus="authenticated"
          user={authUser}
        />,
      );
      expect(screen.getByTestId('auth-sign-out-button')).toBeInTheDocument();
    });

    it('calls onSignOut when sign-out button is clicked', async () => {
      const onSignOut = vi.fn();
      const user = userEvent.setup();
      render(
        <ProModeAuthGate
          {...defaultProps}
          authStatus="authenticated"
          user={authUser}
          onSignOut={onSignOut}
        />,
      );

      await user.click(screen.getByTestId('auth-sign-out-button'));
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it('shows email as name when displayName is null', () => {
      render(
        <ProModeAuthGate
          {...defaultProps}
          authStatus="authenticated"
          user={{ ...authUser, displayName: null }}
        />,
      );
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has data-testid on root element', () => {
      render(<ProModeAuthGate {...defaultProps} />);
      expect(screen.getByTestId('pro-mode-auth-gate')).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English text', () => {
      renderWithI18n(<ProModeAuthGate {...defaultProps} />, { language: 'en' });
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });

    it('renders French text', () => {
      renderWithI18n(<ProModeAuthGate {...defaultProps} />, { language: 'fr' });
      expect(screen.getByText('Connectez-vous pour continuer')).toBeInTheDocument();
    });
  });
});
