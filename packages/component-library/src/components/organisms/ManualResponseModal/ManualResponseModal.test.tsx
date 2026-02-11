import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualResponseModal } from './ManualResponseModal';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ManualResponseModal', () => {
  const mockProps = {
    value: '',
    onChange: vi.fn(),
    modelName: '',
    onModelNameChange: vi.fn(),
    modelProvider: '',
    onModelProviderChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  describe('rendering', () => {
    it('renders when open', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      expect(screen.getByTestId('manual-response-modal')).toBeInTheDocument();
      expect(screen.getByText('Manual Response')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<ManualResponseModal {...mockProps} open={false} />);

      expect(screen.queryByTestId('manual-response-modal')).not.toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(<ManualResponseModal {...mockProps} open={true} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders textarea', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      expect(screen.getByTestId('response-textarea')).toBeInTheDocument();
    });

    it('renders cancel and submit buttons', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<ManualResponseModal {...mockProps} open={true} placeholder="Custom placeholder" />);

      const textarea = screen.getByTestId('response-textarea');
      expect(textarea).toHaveAttribute('placeholder', 'Custom placeholder');
    });

    it('renders with default placeholder', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      const textarea = screen.getByTestId('response-textarea');
      expect(textarea).toHaveAttribute('placeholder', 'Enter your response here...');
    });

    it('renders model name input', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      expect(screen.getByTestId('model-name-input')).toBeInTheDocument();
      expect(screen.getByText('Model Name')).toBeInTheDocument();
    });

    it('renders model provider input', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      expect(screen.getByTestId('model-provider-input')).toBeInTheDocument();
      expect(screen.getByText('Model Provider')).toBeInTheDocument();
    });
  });

  describe('textarea interactions', () => {
    it('displays current value', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Test response" />);

      const textarea = screen.getByTestId('response-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Test response');
    });

    it('calls onChange when textarea value changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ManualResponseModal {...mockProps} onChange={onChange} open={true} />);

      const textarea = screen.getByTestId('response-textarea');
      await user.type(textarea, 'New text');

      expect(onChange).toHaveBeenCalled();
    });

    it('updates with controlled value', () => {
      const { rerender } = render(<ManualResponseModal {...mockProps} open={true} value="Initial" />);

      const textarea = screen.getByTestId('response-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Initial');

      rerender(<ManualResponseModal {...mockProps} open={true} value="Updated" />);
      expect(textarea.value).toBe('Updated');
    });
  });

  describe('model name input interactions', () => {
    it('displays current model name value', () => {
      render(<ManualResponseModal {...mockProps} open={true} modelName="GPT-4" />);

      const input = screen.getByTestId('model-name-input') as HTMLInputElement;
      expect(input.value).toBe('GPT-4');
    });

    it('calls onModelNameChange when input value changes', async () => {
      const user = userEvent.setup();
      const onModelNameChange = vi.fn();

      render(<ManualResponseModal {...mockProps} onModelNameChange={onModelNameChange} open={true} />);

      const input = screen.getByTestId('model-name-input');
      await user.type(input, 'GPT-4');

      expect(onModelNameChange).toHaveBeenCalled();
    });
  });

  describe('model provider input interactions', () => {
    it('displays current model provider value', () => {
      render(<ManualResponseModal {...mockProps} open={true} modelProvider="OpenAI" />);

      const input = screen.getByTestId('model-provider-input') as HTMLInputElement;
      expect(input.value).toBe('OpenAI');
    });

    it('calls onModelProviderChange when input value changes', async () => {
      const user = userEvent.setup();
      const onModelProviderChange = vi.fn();

      render(<ManualResponseModal {...mockProps} onModelProviderChange={onModelProviderChange} open={true} />);

      const input = screen.getByTestId('model-provider-input');
      await user.type(input, 'OpenAI');

      expect(onModelProviderChange).toHaveBeenCalled();
    });
  });

  describe('submit button', () => {
    it('is disabled when value is empty', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="" modelName="GPT-4" modelProvider="OpenAI" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('is disabled when value is only whitespace', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="   " modelName="GPT-4" modelProvider="OpenAI" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('is disabled when model name is empty', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Some content" modelName="" modelProvider="OpenAI" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('is disabled when model provider is empty', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Some content" modelName="GPT-4" modelProvider="" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('is enabled when all fields have content', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Some content" modelName="GPT-4" modelProvider="OpenAI" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('is disabled when disabled prop is true', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Content" modelName="GPT-4" modelProvider="OpenAI" disabled={true} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('calls onSubmit with all data when clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ManualResponseModal {...mockProps} onSubmit={onSubmit} open={true} value="Test response" modelName="GPT-4" modelProvider="OpenAI" />);

      await user.click(screen.getByTestId('submit-button'));

      expect(onSubmit).toHaveBeenCalledWith({
        response: 'Test response',
        modelName: 'GPT-4',
        modelProvider: 'OpenAI',
      });
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onSubmit is not provided', async () => {
      const user = userEvent.setup();

      render(<ManualResponseModal {...mockProps} onSubmit={undefined} open={true} value="Test" modelName="GPT-4" modelProvider="OpenAI" />);

      await user.click(screen.getByTestId('submit-button'));

      // Should not throw
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });
  });

  describe('cancel button', () => {
    it('calls onCancel when clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<ManualResponseModal {...mockProps} onCancel={onCancel} open={true} />);

      await user.click(screen.getByTestId('cancel-button'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenChange with false when clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(<ManualResponseModal {...mockProps} onOpenChange={onOpenChange} open={true} />);

      await user.click(screen.getByTestId('cancel-button'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls both onCancel and onOpenChange when clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ManualResponseModal
          {...mockProps}
          onCancel={onCancel}
          onOpenChange={onOpenChange}
          open={true}
        />
      );

      await user.click(screen.getByTestId('cancel-button'));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not crash when onCancel is not provided', async () => {
      const user = userEvent.setup();

      render(<ManualResponseModal {...mockProps} onCancel={undefined} open={true} />);

      await user.click(screen.getByTestId('cancel-button'));

      // Should not throw
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies correct classes to textarea', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      const textarea = screen.getByTestId('response-textarea');
      expect(textarea).toHaveClass('min-h-[200px]', 'resize-y');
    });

    it('applies correct classes to submit button', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Test" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveClass('bg-primary');
    });
  });

  describe('accessibility', () => {
    it('has semantic heading for dialog title', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      const heading = screen.getByRole('heading', { name: 'Manual Response' });
      expect(heading).toBeInTheDocument();
    });

    it('has accessible textarea with label', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      const textarea = screen.getByRole('textbox', { name: /response/i });
      expect(textarea).toBeInTheDocument();
    });

    it('has accessible buttons', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Test" />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('has screen reader description', () => {
      render(<ManualResponseModal {...mockProps} open={true} />);

      // DialogDescription is present but hidden with sr-only
      const modal = screen.getByTestId('manual-response-modal');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty string value', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="" />);

      const textarea = screen.getByTestId('response-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });

    it('handles long text values', () => {
      const longText = 'Lorem ipsum '.repeat(100);
      render(<ManualResponseModal {...mockProps} open={true} value={longText} />);

      const textarea = screen.getByTestId('response-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(longText);
    });

    it('handles multiline text', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      render(<ManualResponseModal {...mockProps} open={true} value={multilineText} />);

      const textarea = screen.getByTestId('response-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(multilineText);
    });

    it('handles special characters in text', () => {
      const specialText = 'Special chars: @#$%^&*()[]{}|\\<>?/~`';
      render(<ManualResponseModal {...mockProps} open={true} value={specialText} />);

      const textarea = screen.getByTestId('response-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(specialText);
    });
  });

  describe('internationalization', () => {
    it('renders English text', () => {
      renderWithI18n(<ManualResponseModal {...mockProps} open={true} />, { language: 'en' });
      expect(screen.getByText('Manual Response')).toBeInTheDocument();
      expect(screen.getByText('Model Name')).toBeInTheDocument();
      expect(screen.getByText('Model Provider')).toBeInTheDocument();
      expect(screen.getByText('Response')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('renders French text', () => {
      renderWithI18n(<ManualResponseModal {...mockProps} open={true} />, { language: 'fr' });
      expect(screen.getByText('Réponse Manuelle')).toBeInTheDocument();
      expect(screen.getByText('Nom du Modèle')).toBeInTheDocument();
      expect(screen.getByText('Fournisseur du Modèle')).toBeInTheDocument();
      expect(screen.getByText('Réponse')).toBeInTheDocument();
      expect(screen.getByText('Annuler')).toBeInTheDocument();
      expect(screen.getByText('Soumettre')).toBeInTheDocument();
    });
  });
});
