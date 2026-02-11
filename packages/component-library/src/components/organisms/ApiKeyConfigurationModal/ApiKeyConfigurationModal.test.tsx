import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeyConfigurationModal } from './ApiKeyConfigurationModal';

describe('ApiKeyConfigurationModal', () => {
  const mockItems = [
    {
      provider: 'openai' as const,
      label: 'OpenAI API Key',
      value: 'sk-test-key',
      placeholder: 'sk-...',
      helperText: 'Enter your OpenAI API key',
      validationStatus: 'idle' as const,
      showKey: false,
    },
  ];

  describe('rendering', () => {
    it('renders when open is true', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByTestId('api-key-configuration-modal')).toBeInTheDocument();
      expect(screen.getByText('Configure API Key')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <ApiKeyConfigurationModal
          open={false}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.queryByTestId('api-key-configuration-modal')).not.toBeInTheDocument();
    });

    it('does not render when provider is null', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider={null}
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.queryByTestId('api-key-configuration-modal')).not.toBeInTheDocument();
    });

    it('renders ApiKeyConfiguration component', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByTestId('api-key-configuration')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByTestId('close-modal-button')).toBeInTheDocument();
    });

    it('renders Done button', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onOpenChange with false when close button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={onOpenChange}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      await user.click(screen.getByTestId('close-modal-button'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onOpenChange with false when Done button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={onOpenChange}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      await user.click(screen.getByText('Done'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('composition', () => {
    it('passes items to ApiKeyConfiguration', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });

    it('passes onKeyChange to ApiKeyConfiguration', async () => {
      const user = userEvent.setup();
      const onKeyChange = vi.fn();

      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={onKeyChange}
          onToggleShow={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('sk-...');
      await user.type(input, 'new-key');

      expect(onKeyChange).toHaveBeenCalled();
    });

    it('passes onToggleShow to ApiKeyConfiguration', async () => {
      const user = userEvent.setup();
      const onToggleShow = vi.fn();

      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={onToggleShow}
        />
      );

      const toggleButton = screen.getByLabelText(/show|hide/i);
      await user.click(toggleButton);

      expect(onToggleShow).toHaveBeenCalled();
    });
  });

  describe('dark mode', () => {
    it('applies dark mode modal background class', () => {
      const { container } = render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );
      const modalContent = container.querySelector('.bg-white');
      expect(modalContent).toHaveClass('dark:bg-gray-900');
    });

    it('applies dark mode title text class', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );
      const title = screen.getByText('Configure API Key');
      expect(title).toHaveClass('dark:text-gray-100');
    });

    it('applies dark mode close button hover class', () => {
      const { container } = render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );
      const closeButton = container.querySelector('[data-testid="close-modal-button"]');
      expect(closeButton).toHaveClass('dark:hover:bg-gray-800');
    });

    it('applies dark mode close button icon color class', () => {
      const { container } = render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );
      const icon = container.querySelector('[data-testid="close-modal-button"] svg');
      expect(icon).toHaveClass('dark:text-gray-400');
    });
  });

  describe('accessibility', () => {
    it('has close button with aria-label', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('has modal overlay', () => {
      render(
        <ApiKeyConfigurationModal
          open={true}
          onOpenChange={vi.fn()}
          provider="openai"
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const modal = screen.getByTestId('api-key-configuration-modal');
      expect(modal).toHaveClass('fixed', 'inset-0', 'z-50');
    });
  });
});
