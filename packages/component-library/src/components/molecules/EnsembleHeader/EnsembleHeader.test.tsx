import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnsembleHeader } from './EnsembleHeader';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('EnsembleHeader', () => {
  it('renders the header with title', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('The smartest AI is an ensemble.')).toBeInTheDocument();
  });

  it('renders the settings button', () => {
    render(<EnsembleHeader />);
    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<EnsembleHeader />);
    const header = container.firstChild;
    expect(header).toHaveClass('bg-background', 'border-b');
  });

  describe('authentication display', () => {
    it('does not render auth section when no authUser', () => {
      render(<EnsembleHeader />);
      expect(screen.queryByTestId('header-auth-user')).not.toBeInTheDocument();
    });

    it('renders auth user with photo', () => {
      render(
        <EnsembleHeader
          authUser={{
            displayName: 'Jane Doe',
            email: 'jane@example.com',
            photoURL: 'https://example.com/photo.jpg',
          }}
        />,
      );
      expect(screen.getByTestId('header-auth-user')).toBeInTheDocument();
      expect(screen.getByTestId('header-auth-avatar')).toBeInTheDocument();
    });

    it('renders fallback avatar when no photoURL', () => {
      render(
        <EnsembleHeader
          authUser={{
            displayName: 'Jane Doe',
            email: 'jane@example.com',
            photoURL: null,
          }}
        />,
      );
      expect(screen.getByTestId('header-auth-avatar-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('header-auth-avatar-fallback')).toHaveTextContent('J');
    });

    it('renders sign-out button when onSignOut is provided', () => {
      render(
        <EnsembleHeader
          authUser={{
            displayName: 'Jane Doe',
            email: 'jane@example.com',
            photoURL: null,
          }}
          onSignOut={vi.fn()}
        />,
      );
      expect(screen.getByTestId('header-sign-out-button')).toBeInTheDocument();
    });

    it('does not render sign-out button when onSignOut is not provided', () => {
      render(
        <EnsembleHeader
          authUser={{
            displayName: 'Jane Doe',
            email: 'jane@example.com',
            photoURL: null,
          }}
        />,
      );
      expect(screen.queryByTestId('header-sign-out-button')).not.toBeInTheDocument();
    });

    it('calls onSignOut when sign-out button is clicked', async () => {
      const onSignOut = vi.fn();
      const user = userEvent.setup();
      render(
        <EnsembleHeader
          authUser={{
            displayName: 'Jane Doe',
            email: 'jane@example.com',
            photoURL: null,
          }}
          onSignOut={onSignOut}
        />,
      );
      await user.click(screen.getByTestId('header-sign-out-button'));
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for default render', () => {
      const { container } = render(<EnsembleHeader />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('internationalization', () => {
    it('renders English translations correctly', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
      expect(screen.getByText('The smartest AI is an ensemble.')).toBeInTheDocument();
    });

    it('renders French translations correctly', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      expect(screen.getByText('IA Ensemble')).toBeInTheDocument();
      expect(screen.getByText("L'IA la plus intelligente est un ensemble.")).toBeInTheDocument();
    });

    it('displays translated title in English', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('Ensemble AI');
    });

    it('displays translated title in French', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('IA Ensemble');
    });

    it('displays translated tagline in English', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      expect(screen.getByText('The smartest AI is an ensemble.')).toHaveClass('text-muted-foreground');
    });

    it('displays translated tagline in French', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      expect(screen.getByText("L'IA la plus intelligente est un ensemble.")).toHaveClass('text-muted-foreground');
    });
  });
});
