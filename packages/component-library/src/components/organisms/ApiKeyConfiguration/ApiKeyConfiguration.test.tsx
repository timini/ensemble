import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeyConfiguration } from './ApiKeyConfiguration';
import type { ApiKeyConfigurationItem } from './ApiKeyConfiguration';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const mockItems: ApiKeyConfigurationItem[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    value: 'sk-proj-...',
    placeholder: 'Enter your OpenAI API key',
    validationStatus: 'valid',
    showKey: false,
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    value: 'sk-ant-...',
    placeholder: 'Enter your Anthropic API key',
    validationStatus: 'valid',
    showKey: false,
  },
];

describe('ApiKeyConfiguration', () => {
  describe('rendering', () => {
    it('renders the default heading', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByText('Configure API Keys')).toBeInTheDocument();
    });

    it('renders custom heading', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
          heading="Custom Heading"
        />
      );

      expect(screen.getByText('Custom Heading')).toBeInTheDocument();
    });

    it('renders all API key inputs', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
    });

    it('renders inputs with correct placeholders', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByPlaceholderText('Enter your OpenAI API key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your Anthropic API key')).toBeInTheDocument();
    });

    it('renders with testid', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByTestId('api-key-configuration')).toBeInTheDocument();
    });

    it('renders empty state when no items provided', () => {
      render(
        <ApiKeyConfiguration items={[]} onKeyChange={vi.fn()} onToggleShow={vi.fn()} />
      );

      expect(screen.getByText('Configure API Keys')).toBeInTheDocument();
      expect(screen.queryByText('OpenAI')).not.toBeInTheDocument();
    });
  });

  describe('validation status', () => {
    it('renders valid status indicator', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'sk-proj-...',
              validationStatus: 'valid',
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const validIcon = container.querySelector('[data-validation="valid"]');
      expect(validIcon).toBeInTheDocument();
    });

    it('renders invalid status indicator', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'invalid-key',
              validationStatus: 'invalid',
              error: 'Invalid API key',
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const invalidIcon = container.querySelector('[data-validation="invalid"]');
      expect(invalidIcon).toBeInTheDocument();
    });

    it('renders validating status indicator', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'sk-proj-...',
              validationStatus: 'validating',
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const validatingIcon = container.querySelector('[data-validation="validating"]');
      expect(validatingIcon).toBeInTheDocument();
    });

    it('displays error message for invalid status', () => {
      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'invalid-key',
              validationStatus: 'invalid',
              error: 'Invalid API key format',
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByText('Invalid API key format')).toBeInTheDocument();
    });
  });

  describe('configured count banner', () => {
    it('reflects configured items by default', () => {
      render(
        <ApiKeyConfiguration
          items={[
            { provider: 'openai', label: 'OpenAI', validationStatus: 'valid' },
            { provider: 'anthropic', label: 'Anthropic', validationStatus: 'idle' },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />,
      );

      expect(screen.getByText(/1 API key configured/i)).toBeInTheDocument();
    });

    it('allows overriding configured count', () => {
      render(
        <ApiKeyConfiguration
          items={[
            { provider: 'openai', label: 'OpenAI', validationStatus: 'idle' },
          ]}
          configuredCountOverride={2}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />,
      );

      expect(screen.getByText(/2 API keys configured/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onKeyChange when input value changes', async () => {
      const onKeyChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: '',
              validationStatus: 'idle',
              placeholder: 'Enter key',
            },
          ]}
          onKeyChange={onKeyChange}
          onToggleShow={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('Enter key');
      await user.type(input, 'sk-test');

      // userEvent.type() calls onChange for each character
      expect(onKeyChange).toHaveBeenCalledWith('openai', 's');
      expect(onKeyChange).toHaveBeenCalledWith('openai', 'k');
      expect(onKeyChange).toHaveBeenCalledWith('openai', 't');
      expect(onKeyChange).toHaveBeenCalledTimes(7);
    });

    it('calls onToggleShow when visibility button is clicked', async () => {
      const onToggleShow = vi.fn();
      const user = userEvent.setup();

      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'sk-proj-...',
              validationStatus: 'idle',
              showKey: false,
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={onToggleShow}
        />
      );

      const toggleButton = screen.getByLabelText('Show API key');
      await user.click(toggleButton);

      expect(onToggleShow).toHaveBeenCalledWith('openai');
    });

    it('calls callbacks with correct provider for multiple items', async () => {
      const onKeyChange = vi.fn();
      const onToggleShow = vi.fn();
      const user = userEvent.setup();

      render(
        <ApiKeyConfiguration items={mockItems} onKeyChange={onKeyChange} onToggleShow={onToggleShow} />
      );

      // Click second provider's toggle button
      const toggleButtons = screen.getAllByLabelText('Show API key');
      await user.click(toggleButtons[1]);

      expect(onToggleShow).toHaveBeenCalledWith('anthropic');
    });
  });

  describe('disabled state', () => {
    it('disables all inputs when disabled prop is true', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
          disabled={true}
        />
      );

      const inputs = screen.getAllByPlaceholderText(/Enter your/);
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it('disables specific input when item disabled is true', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'sk-proj-...',
              validationStatus: 'valid',
              disabled: true,
            },
            {
              provider: 'anthropic',
              label: 'Anthropic',
              value: 'sk-ant-...',
              validationStatus: 'valid',
              disabled: false,
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const inputs = container.querySelectorAll('input[type="password"]');
      expect(inputs[0]).toBeDisabled();
      expect(inputs[1]).not.toBeDisabled();
    });

    it('does not call onKeyChange when disabled', async () => {
      const onKeyChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: '',
              validationStatus: 'idle',
              placeholder: 'Enter key',
            },
          ]}
          onKeyChange={onKeyChange}
          onToggleShow={vi.fn()}
          disabled={true}
        />
      );

      const input = screen.getByPlaceholderText('Enter key');
      await user.type(input, 'sk-test');

      expect(onKeyChange).not.toHaveBeenCalled();
    });
  });

  describe('multiple providers', () => {
    it('renders all four providers from wireframe', () => {
      const allProviders: ApiKeyConfigurationItem[] = [
        {
          provider: 'openai',
          label: 'OpenAI',
          value: 'sk-proj-...',
          validationStatus: 'valid',
        },
        {
          provider: 'anthropic',
          label: 'Anthropic',
          value: 'sk-ant-...',
          validationStatus: 'valid',
        },
        {
          provider: 'google',
          label: 'Google (Gemini)',
          value: 'AIza...',
          validationStatus: 'valid',
        },
        {
          provider: 'xai',
          label: 'Grok',
          value: 'xai-...',
          validationStatus: 'valid',
        },
      ];

      render(
        <ApiKeyConfiguration
          items={allProviders}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Google (Gemini)')).toBeInTheDocument();
      expect(screen.getByText('Grok')).toBeInTheDocument();
    });

    it('maintains independent state for each provider', async () => {
      const onToggleShow = vi.fn();

      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'sk-proj-...',
              validationStatus: 'valid',
              showKey: false,
            },
            {
              provider: 'anthropic',
              label: 'Anthropic',
              value: 'sk-ant-...',
              validationStatus: 'valid',
              showKey: true,
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={onToggleShow}
        />
      );

      const showButton = screen.getByLabelText('Show API key');
      const hideButton = screen.getByLabelText('Hide API key');

      expect(showButton).toBeInTheDocument();
      expect(hideButton).toBeInTheDocument();
    });
  });

  describe('helper text', () => {
    it('displays helper text when provided', () => {
      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: '',
              validationStatus: 'idle',
              helperText: 'Get your API key from platform.openai.com',
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByText('Get your API key from platform.openai.com')).toBeInTheDocument();
    });

    it('does not display helper text when error is present', () => {
      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'invalid',
              validationStatus: 'invalid',
              helperText: 'Get your API key from platform.openai.com',
              error: 'Invalid API key',
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.queryByText('Get your API key from platform.openai.com')).not.toBeInTheDocument();
      expect(screen.getByText('Invalid API key')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has semantic heading structure', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Configure API Keys');
    });

    it('has proper label associations', () => {
      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: '',
              validationStatus: 'idle',
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const label = screen.getByText('OpenAI');
      expect(label.tagName).toBe('LABEL');
    });

    it('provides aria-labels for toggle buttons', () => {
      render(
        <ApiKeyConfiguration
          items={[
            {
              provider: 'openai',
              label: 'OpenAI',
              value: 'sk-proj-...',
              validationStatus: 'idle',
              showKey: false,
            },
          ]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Show API key')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies correct spacing between items', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const itemsContainer = container.querySelector('.space-y-6');
      expect(itemsContainer).toBeInTheDocument();
    });

    it('applies correct heading styling', () => {
      render(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );

      const heading = screen.getByText('Configure API Keys');
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'mb-6');
    });
  });

  describe('semantic tokens', () => {
    it('uses semantic muted token for info box background', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={[{ provider: 'openai', label: 'OpenAI', validationStatus: 'valid' }]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );
      const infoBox = container.querySelector('.bg-muted');
      expect(infoBox).toBeInTheDocument();
    });

    it('uses semantic border token for info box border', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={[{ provider: 'openai', label: 'OpenAI', validationStatus: 'valid' }]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );
      const infoBox = container.querySelector('.border-border');
      expect(infoBox).toBeInTheDocument();
    });

    it('uses semantic muted-foreground token for info box text', () => {
      const { container } = render(
        <ApiKeyConfiguration
          items={[{ provider: 'openai', label: 'OpenAI', validationStatus: 'valid' }]}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />
      );
      const infoText = container.querySelector('.text-muted-foreground');
      expect(infoText).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English heading by default', () => {
      renderWithI18n(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />,
        { language: 'en' }
      );

      expect(screen.getByText('Configure API Keys')).toBeInTheDocument();
    });

    it('renders French heading', () => {
      renderWithI18n(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
        />,
        { language: 'fr' }
      );

      expect(screen.getByText('Configurer les Clés API')).toBeInTheDocument();
    });

    it('renders custom heading in English when provided', () => {
      renderWithI18n(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
          heading="Custom Heading"
        />,
        { language: 'en' }
      );

      expect(screen.getByText('Custom Heading')).toBeInTheDocument();
      expect(screen.queryByText('Configure API Keys')).not.toBeInTheDocument();
    });

    it('renders custom heading in French when provided', () => {
      renderWithI18n(
        <ApiKeyConfiguration
          items={mockItems}
          onKeyChange={vi.fn()}
          onToggleShow={vi.fn()}
          heading="En-tête personnalisé"
        />,
        { language: 'fr' }
      );

      expect(screen.getByText('En-tête personnalisé')).toBeInTheDocument();
      expect(screen.queryByText('Configurer les Clés API')).not.toBeInTheDocument();
    });
  });
});
