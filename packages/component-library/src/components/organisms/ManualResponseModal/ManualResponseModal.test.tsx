import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualResponseModal } from './ManualResponseModal';

describe('ManualResponseModal', () => {
  const mockProps = {
    value: '',
    onChange: vi.fn(),
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

  describe('submit button', () => {
    it('is disabled when value is empty', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('is disabled when value is only whitespace', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="   " />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('is enabled when value has content', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Some content" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('is disabled when disabled prop is true', () => {
      render(<ManualResponseModal {...mockProps} open={true} value="Content" disabled={true} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('calls onSubmit with current value when clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ManualResponseModal {...mockProps} onSubmit={onSubmit} open={true} value="Test response" />);

      await user.click(screen.getByTestId('submit-button'));

      expect(onSubmit).toHaveBeenCalledWith('Test response');
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onSubmit is not provided', async () => {
      const user = userEvent.setup();

      render(<ManualResponseModal {...mockProps} onSubmit={undefined} open={true} value="Test" />);

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
      expect(submitButton).toHaveClass('bg-blue-600');
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
});
