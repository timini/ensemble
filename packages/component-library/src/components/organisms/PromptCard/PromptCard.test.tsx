import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptCard } from './PromptCard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const mockPrompt = 'What is the meaning of life?';

describe('PromptCard', () => {
    describe('rendering', () => {
        it('renders the default heading', () => {
            render(<PromptCard prompt={mockPrompt} />);
            expect(screen.getByText('Your Prompt')).toBeInTheDocument();
        });

        it('renders custom heading', () => {
            render(<PromptCard prompt={mockPrompt} heading="Custom Heading" />);
            expect(screen.getByText('Custom Heading')).toBeInTheDocument();
        });

        it('renders the prompt text', () => {
            render(<PromptCard prompt={mockPrompt} />);
            expect(screen.getByText(mockPrompt)).toBeInTheDocument();
        });

        it('renders copy button by default', () => {
            render(<PromptCard prompt={mockPrompt} />);
            expect(screen.getByText('Copy')).toBeInTheDocument();
        });

        it('hides copy button when showCopy is false', () => {
            render(<PromptCard prompt={mockPrompt} showCopy={false} />);
            expect(screen.queryByText('Copy')).not.toBeInTheDocument();
        });
    });

    describe('interactions', () => {
        it('copies text to clipboard when copy button is clicked', async () => {
            const user = userEvent.setup();
            const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
            Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, writable: true });

            render(<PromptCard prompt={mockPrompt} />);

            const copyButton = screen.getByRole('button', { name: /Copy/i });
            await user.click(copyButton);

            expect(mockClipboard.writeText).toHaveBeenCalledWith(mockPrompt);
        });

        it('shows Copied feedback after clicking copy', async () => {
            const user = userEvent.setup();
            const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
            Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, writable: true });

            render(<PromptCard prompt={mockPrompt} />);

            const copyButton = screen.getByRole('button', { name: /Copy/i });
            await user.click(copyButton);

            expect(screen.getByText('Copied!')).toBeInTheDocument();
        });
    });

    describe('styling', () => {
        it('renders in a card', () => {
            const { container } = render(<PromptCard prompt={mockPrompt} />);
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('i18n', () => {
        it('renders heading and copy label in French', () => {
            renderWithI18n(<PromptCard prompt={mockPrompt} />, { language: 'fr' });
            expect(screen.getByText('Votre invite')).toBeInTheDocument();
            expect(screen.getByTestId('copy-prompt-button')).toHaveTextContent('Copier');
        });

        it('shows the French copied label after copying', async () => {
            const user = userEvent.setup();
            const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
            Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, writable: true });

            renderWithI18n(<PromptCard prompt={mockPrompt} />, { language: 'fr' });
            await user.click(screen.getByTestId('copy-prompt-button'));

            expect(screen.getByTestId('copy-prompt-button')).toHaveTextContent('Copié !');
        });
    });
});
