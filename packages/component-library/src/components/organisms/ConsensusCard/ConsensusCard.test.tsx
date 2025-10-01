import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsensusCard } from './ConsensusCard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const mockConsensusText =
  'Your question has a clear focus that allows for a direct response. We can examine this through multiple lenses: theoretical foundations, real-world examples, and future considerations.';
const mockSummarizerModel = 'Claude 3 Opus';

describe('ConsensusCard', () => {
  describe('rendering', () => {
    it('renders the default heading', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      expect(screen.getByText('Consensus')).toBeInTheDocument();
    });

    it('renders custom heading', () => {
      render(
        <ConsensusCard
          consensusText={mockConsensusText}
          summarizerModel={mockSummarizerModel}
          heading="Custom Consensus Heading"
        />
      );

      expect(screen.getByText('Custom Consensus Heading')).toBeInTheDocument();
    });

    it('renders the summarizer model in subtitle', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      expect(screen.getByText(/Combined summary provided by Claude 3 Opus/)).toBeInTheDocument();
    });

    it('renders the consensus text', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      expect(screen.getByText(mockConsensusText)).toBeInTheDocument();
    });

    it('renders share icon and text', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      expect(screen.getByText('Share this consensus response')).toBeInTheDocument();
    });

    it('renders share button', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      expect(screen.getByTestId('share-button')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('renders with testid', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      expect(screen.getByTestId('consensus-card')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies blue background to card', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const card = screen.getByTestId('consensus-card');
      expect(card).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('applies blue text color to heading', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const heading = screen.getByText('Consensus');
      expect(heading).toHaveClass('text-blue-900');
    });

    it('applies blue text color to subtitle', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const subtitle = screen.getByText(/Combined summary provided by/);
      expect(subtitle).toHaveClass('text-sm', 'text-blue-700');
    });

    it('renders consensus text in white box', () => {
      const { container } = render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const whiteBox = container.querySelector('.bg-white.rounded-lg');
      expect(whiteBox).toBeInTheDocument();
      expect(whiteBox).toHaveClass('p-4');
    });

    it('applies correct heading styles', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const heading = screen.getByText('Consensus');
      expect(heading).toHaveClass('font-semibold', 'mb-2');
    });

    it('applies white background to share button', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const shareButton = screen.getByTestId('share-button');
      expect(shareButton).toHaveClass('bg-white');
    });
  });

  describe('interactions', () => {
    it('calls onShare when share button is clicked', async () => {
      const onShare = vi.fn();
      const user = userEvent.setup();

      render(
        <ConsensusCard
          consensusText={mockConsensusText}
          summarizerModel={mockSummarizerModel}
          onShare={onShare}
        />
      );

      const shareButton = screen.getByTestId('share-button');
      await user.click(shareButton);

      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it('handles multiple share button clicks', async () => {
      const onShare = vi.fn();
      const user = userEvent.setup();

      render(
        <ConsensusCard
          consensusText={mockConsensusText}
          summarizerModel={mockSummarizerModel}
          onShare={onShare}
        />
      );

      const shareButton = screen.getByTestId('share-button');
      await user.click(shareButton);
      await user.click(shareButton);
      await user.click(shareButton);

      expect(onShare).toHaveBeenCalledTimes(3);
    });

    it('does not crash when no onShare handler is provided', async () => {
      const user = userEvent.setup();

      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const shareButton = screen.getByTestId('share-button');
      await user.click(shareButton);

      // Should not throw
      expect(shareButton).toBeInTheDocument();
    });
  });

  describe('content variations', () => {
    it('handles long consensus text', () => {
      const longText = 'Lorem ipsum dolor sit amet. '.repeat(50);

      const { container } = render(<ConsensusCard consensusText={longText} summarizerModel={mockSummarizerModel} />);

      // Check that the consensus text is rendered (verify by finding the white content box)
      const contentBox = container.querySelector('.bg-white.rounded-lg');
      expect(contentBox).toBeInTheDocument();
      expect(contentBox?.textContent).toBe(longText);
    });

    it('handles short consensus text', () => {
      const shortText = 'Short summary.';

      render(<ConsensusCard consensusText={shortText} summarizerModel={mockSummarizerModel} />);

      expect(screen.getByText(shortText)).toBeInTheDocument();
    });

    it('handles different summarizer model names', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel="GPT-4 Turbo" />
      );

      expect(screen.getByText(/Combined summary provided by GPT-4 Turbo/)).toBeInTheDocument();
    });

    it('handles multiline consensus text', () => {
      const multilineText = 'First line.\n\nSecond line.\n\nThird line.';

      const { container } = render(<ConsensusCard consensusText={multilineText} summarizerModel={mockSummarizerModel} />);

      // Check that the consensus text is rendered (verify by finding the white content box)
      const contentBox = container.querySelector('.bg-white.rounded-lg');
      expect(contentBox).toBeInTheDocument();
      expect(contentBox?.textContent).toBe(multilineText);
    });
  });

  describe('accessibility', () => {
    it('has semantic heading structure', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Consensus');
    });

    it('has clickable share button', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const button = screen.getByRole('button', { name: /Share/i });
      expect(button).toBeInTheDocument();
    });

    it('provides descriptive text for share action', () => {
      render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      expect(screen.getByText('Share this consensus response')).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('renders in a card component', () => {
      const { container } = render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();
    });

    it('applies correct padding to card content', () => {
      const { container } = render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const cardContent = container.querySelector('.p-6');
      expect(cardContent).toBeInTheDocument();
    });

    it('renders share section at bottom', () => {
      const { container } = render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const shareSection = container.querySelector('.flex.items-center.justify-between');
      expect(shareSection).toBeInTheDocument();
    });

    it('displays share icon and text together', () => {
      const { container } = render(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />
      );

      const shareTextSection = container.querySelector('.flex.items-center.space-x-2');
      expect(shareTextSection).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty consensus text', () => {
      render(<ConsensusCard consensusText="" summarizerModel={mockSummarizerModel} />);

      const card = screen.getByTestId('consensus-card');
      expect(card).toBeInTheDocument();
    });

    it('handles special characters in consensus text', () => {
      const specialText = 'Text with special chars: @#$%^&*()';

      render(<ConsensusCard consensusText={specialText} summarizerModel={mockSummarizerModel} />);

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it('handles special characters in summarizer model name', () => {
      const specialModel = 'Claude-3.5 (Opus)';

      render(<ConsensusCard consensusText={mockConsensusText} summarizerModel={specialModel} />);

      expect(screen.getByText(/Combined summary provided by Claude-3\.5 \(Opus\)/)).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English text', () => {
      renderWithI18n(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />,
        { language: 'en' }
      );
      expect(screen.getByText('Consensus')).toBeInTheDocument();
      expect(screen.getByText('Combined summary provided by Claude 3 Opus.')).toBeInTheDocument();
      expect(screen.getByText('Share this consensus response')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('renders French text', () => {
      renderWithI18n(
        <ConsensusCard consensusText={mockConsensusText} summarizerModel={mockSummarizerModel} />,
        { language: 'fr' }
      );
      expect(screen.getByText('Consensus')).toBeInTheDocument();
      expect(screen.getByText('Résumé combiné fourni par Claude 3 Opus.')).toBeInTheDocument();
      expect(screen.getByText('Partager cette réponse consensuelle')).toBeInTheDocument();
      expect(screen.getByText('Partager')).toBeInTheDocument();
    });
  });
});
