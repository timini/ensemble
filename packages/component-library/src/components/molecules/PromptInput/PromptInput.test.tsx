import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';

describe('PromptInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders label', () => {
      render(<PromptInput label="Enter prompt" value="" />);
      expect(screen.getByText('Enter prompt')).toBeInTheDocument();
    });

    it('renders textarea', () => {
      render(<PromptInput label="Enter prompt" value="" />);
      expect(screen.getByLabelText('Enter prompt')).toBeInTheDocument();
    });

    it('renders placeholder text', () => {
      render(<PromptInput label="Enter prompt" placeholder="Type here..." value="" />);
      expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
    });

    it('renders with value', () => {
      render(<PromptInput label="Enter prompt" value="Test prompt" />);
      expect(screen.getByLabelText('Enter prompt')).toHaveValue('Test prompt');
    });

    it('renders helper text when provided', () => {
      render(<PromptInput label="Enter prompt" helperText="Minimum 10 characters" value="" />);
      expect(screen.getByText('Minimum 10 characters')).toBeInTheDocument();
    });

    it('renders error message when provided', () => {
      render(<PromptInput label="Enter prompt" error="Too short" value="" />);
      expect(screen.getByText('Too short')).toBeInTheDocument();
    });
  });

  describe('character counter', () => {
    it('shows character count of 0 for empty input', () => {
      render(<PromptInput label="Enter prompt" value="" />);
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('shows current character count', () => {
      render(<PromptInput label="Enter prompt" value="Hello" />);
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    it('updates character count when value changes', () => {
      const { rerender } = render(<PromptInput label="Enter prompt" value="Hello" />);
      expect(screen.getByText(/5/)).toBeInTheDocument();

      rerender(<PromptInput label="Enter prompt" value="Hello World" />);
      expect(screen.getByText(/11/)).toBeInTheDocument();
    });

    it('shows max length when provided', () => {
      render(<PromptInput label="Enter prompt" value="Hello" maxLength={100} />);
      expect(screen.getByText(/5.*100/)).toBeInTheDocument();
    });

    it('shows warning color when near max length', () => {
      const { container } = render(<PromptInput label="Enter prompt" value={'A'.repeat(85)} maxLength={100} />);
      const counter = container.querySelector('[data-testid="character-counter"]');
      expect(counter).toHaveClass('text-orange-500');
    });

    it('shows error color when at max length', () => {
      const { container } = render(<PromptInput label="Enter prompt" value={'A'.repeat(100)} maxLength={100} />);
      const counter = container.querySelector('[data-testid="character-counter"]');
      expect(counter).toHaveClass('text-red-500');
    });
  });

  describe('validation', () => {
    it('is invalid when below min length', () => {
      render(<PromptInput label="Enter prompt" value="Short" minLength={10} error="Too short" />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('is valid when at or above min length', () => {
      render(<PromptInput label="Enter prompt" value="This is valid" minLength={10} />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).not.toHaveAttribute('aria-invalid');
    });

    it('validates at exactly min length', () => {
      render(<PromptInput label="Enter prompt" value="Exactly10!" minLength={10} />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).not.toHaveAttribute('aria-invalid');
    });

    it('prevents input beyond max length', () => {
      render(<PromptInput label="Enter prompt" value={'A'.repeat(100)} maxLength={100} />);
      const textarea = screen.getByLabelText('Enter prompt') as HTMLTextAreaElement;
      expect(textarea.value.length).toBe(100);
    });

    it('applies error styling when validation fails', () => {
      render(<PromptInput label="Enter prompt" value="Short" minLength={10} error="Too short" />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).toHaveClass('border-red-500');
    });
  });

  describe('user interactions', () => {
    it('calls onChange when input value changes', async () => {
      vi.useRealTimers();

      const onChange = vi.fn();
      render(<PromptInput label="Enter prompt" value="" onChange={onChange} debounceMs={100} />);

      const textarea = screen.getByLabelText('Enter prompt');
      await userEvent.type(textarea, 'test');

      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(onChange).toHaveBeenCalled();

      vi.useFakeTimers();
    });

    it('debounces onChange calls', async () => {
      vi.useRealTimers();

      const onChange = vi.fn();
      render(<PromptInput label="Enter prompt" value="" onChange={onChange} debounceMs={100} />);

      const textarea = screen.getByLabelText('Enter prompt');
      await userEvent.type(textarea, 'test');

      // Should not be called immediately (within 50ms)
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(onChange).not.toHaveBeenCalled();

      // Should be called after debounce delay
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onChange).toHaveBeenCalled();

      vi.useFakeTimers();
    });

    it('does not call onChange when disabled', async () => {
      vi.useRealTimers();

      const onChange = vi.fn();
      render(<PromptInput label="Enter prompt" value="" disabled onChange={onChange} debounceMs={100} />);

      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).toBeDisabled();

      await userEvent.type(textarea, 'test');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(onChange).not.toHaveBeenCalled();

      vi.useFakeTimers();
    });

    it('updates internal value immediately while debouncing onChange', async () => {
      vi.useRealTimers();

      const onChange = vi.fn();
      render(<PromptInput label="Enter prompt" value="" onChange={onChange} debounceMs={100} />);

      const textarea = screen.getByLabelText('Enter prompt');
      await userEvent.type(textarea, 'test');

      // Value should update immediately
      expect(textarea).toHaveValue('test');

      // But onChange should not be called yet (within 50ms)
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(onChange).not.toHaveBeenCalled();

      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onChange).toHaveBeenCalledWith('test');

      vi.useFakeTimers();
    });
  });

  describe('disabled state', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<PromptInput label="Enter prompt" value="" disabled />);
      expect(screen.getByLabelText('Enter prompt')).toBeDisabled();
    });

    it('applies disabled styling', () => {
      render(<PromptInput label="Enter prompt" value="" disabled />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).toHaveClass('disabled:opacity-50');
    });

    it('shows character counter when disabled', () => {
      render(<PromptInput label="Enter prompt" value="Test" disabled />);
      expect(screen.getByText(/4/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('associates label with textarea', () => {
      render(<PromptInput label="Enter prompt" value="" />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).toHaveAccessibleName('Enter prompt');
    });

    it('adds aria-invalid when validation fails', () => {
      render(<PromptInput label="Enter prompt" value="Short" minLength={10} error="Too short" />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('does not add aria-invalid when valid', () => {
      render(<PromptInput label="Enter prompt" value="This is a valid prompt" minLength={10} />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea).not.toHaveAttribute('aria-invalid');
    });

    it('links error message to textarea with aria-describedby', () => {
      render(<PromptInput label="Enter prompt" value="Short" minLength={10} error="Too short" />);
      const textarea = screen.getByLabelText('Enter prompt');
      const errorId = textarea.getAttribute('aria-describedby');

      expect(errorId).toBeTruthy();
      const errorElement = screen.getByText('Too short').closest('[role="alert"]');
      expect(errorElement).toHaveAttribute('id', errorId!);
    });

    it('links helper text to textarea with aria-describedby', () => {
      render(<PromptInput label="Enter prompt" value="" helperText="Min 10 chars" />);
      const textarea = screen.getByLabelText('Enter prompt');
      const helperTextId = textarea.getAttribute('aria-describedby');

      expect(helperTextId).toBeTruthy();
      expect(screen.getByText('Min 10 chars')).toHaveAttribute('id', helperTextId!);
    });
  });

  describe('composition', () => {
    it('uses Textarea atom for input', () => {
      render(<PromptInput label="Enter prompt" value="" />);
      const textarea = screen.getByLabelText('Enter prompt');
      expect(textarea.tagName.toLowerCase()).toBe('textarea');
    });

    it('uses Label atom for label', () => {
      const { container } = render(<PromptInput label="Enter prompt" value="" />);
      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Enter prompt');
    });

    it('uses InlineAlert atom for error messages', () => {
      const { container } = render(<PromptInput label="Enter prompt" value="" error="Error message" />);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Error message');
    });
  });
});
