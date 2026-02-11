import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareDialog } from './ShareDialog';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const mockShareUrl = 'https://example.com/share/abc123';

describe('ShareDialog', () => {
  describe('rendering', () => {
    it('renders the dialog when open', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <ShareDialog
          open={false}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
    });

    it('renders the title', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(screen.getByText('Share Results')).toBeInTheDocument();
    });

    it('renders the description', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(
        screen.getByText(
          'Share your ensemble review with others using this link.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders loading spinner when isLoading', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={null}
          isLoading={true}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(screen.getByTestId('share-loading')).toBeInTheDocument();
    });

    it('renders generating text when loading', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={null}
          isLoading={true}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(screen.getByText('Generating share link...')).toBeInTheDocument();
    });

    it('does not show URL input when loading', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={null}
          isLoading={true}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(screen.queryByTestId('share-url-input')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error message', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={null}
          isLoading={false}
          error="Something went wrong"
          onCopyLink={() => {}}
        />,
      );

      expect(screen.getByTestId('share-error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not show URL input when error', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={null}
          isLoading={false}
          error="Error"
          onCopyLink={() => {}}
        />,
      );

      expect(screen.queryByTestId('share-url-input')).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('renders the share URL input', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      const input = screen.getByTestId('share-url-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(mockShareUrl);
    });

    it('renders the copy button', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
    });

    it('renders the open in new tab link', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      const link = screen.getByTestId('open-share-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', mockShareUrl);
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('URL input is read-only', () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      const input = screen.getByTestId('share-url-input');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('interactions', () => {
    it('calls onCopyLink when copy button is clicked', async () => {
      const onCopyLink = vi.fn();
      const user = userEvent.setup();

      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={onCopyLink}
        />,
      );

      await user.click(screen.getByTestId('copy-link-button'));
      expect(onCopyLink).toHaveBeenCalledTimes(1);
    });

    it('shows copied confirmation after clicking copy', async () => {
      const user = userEvent.setup();

      render(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
      );

      await user.click(screen.getByTestId('copy-link-button'));
      expect(screen.getByTestId('copied-confirmation')).toBeInTheDocument();
      expect(
        screen.getByText('Link copied to clipboard!'),
      ).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English text', () => {
      renderWithI18n(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
        { language: 'en' },
      );

      expect(screen.getByText('Share Results')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Share your ensemble review with others using this link.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Open in new tab')).toBeInTheDocument();
    });

    it('renders French text', () => {
      renderWithI18n(
        <ShareDialog
          open={true}
          onOpenChange={() => {}}
          shareUrl={mockShareUrl}
          isLoading={false}
          error={null}
          onCopyLink={() => {}}
        />,
        { language: 'fr' },
      );

      expect(screen.getByText('Partager les Résultats')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Partagez votre analyse ensemble avec d\'autres via ce lien.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Ouvrir dans un nouvel onglet'),
      ).toBeInTheDocument();
    });
  });
});
