/**
 * PromptInputWithHint Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInputWithHint } from './PromptInputWithHint';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pages.prompt.inputLabel': 'Enter Your Prompt',
        'pages.prompt.keyboardHint': '⌘+Enter to submit',
        'pages.prompt.placeholder': 'Enter your prompt here...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('PromptInputWithHint', () => {
  it('renders the component', () => {
    const mockOnChange = vi.fn();
    render(<PromptInputWithHint value="" onChange={mockOnChange} />);
    expect(screen.getByTestId('prompt-input-with-hint')).toBeInTheDocument();
  });

  it('displays the label', () => {
    const mockOnChange = vi.fn();
    render(<PromptInputWithHint value="" onChange={mockOnChange} />);
    expect(screen.getByText('Enter Your Prompt')).toBeInTheDocument();
  });

  it('displays the keyboard hint', () => {
    const mockOnChange = vi.fn();
    render(<PromptInputWithHint value="" onChange={mockOnChange} />);
    expect(screen.getByText('⌘+Enter to submit')).toBeInTheDocument();
  });

  it('displays the textarea with default placeholder', () => {
    const mockOnChange = vi.fn();
    render(<PromptInputWithHint value="" onChange={mockOnChange} />);
    const textarea = screen.getByTestId('prompt-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder', 'Enter your prompt here...');
  });

  it('displays the textarea with custom placeholder', () => {
    const mockOnChange = vi.fn();
    render(
      <PromptInputWithHint
        value=""
        onChange={mockOnChange}
        placeholder="Ask me anything..."
      />
    );
    const textarea = screen.getByTestId('prompt-textarea');
    expect(textarea).toHaveAttribute('placeholder', 'Ask me anything...');
  });

  it('displays the current value', () => {
    const mockOnChange = vi.fn();
    render(
      <PromptInputWithHint
        value="What is React?"
        onChange={mockOnChange}
      />
    );
    const textarea = screen.getByTestId('prompt-textarea');
    expect(textarea).toHaveValue('What is React?');
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<PromptInputWithHint value="" onChange={mockOnChange} />);

    const textarea = screen.getByTestId('prompt-textarea');
    await user.type(textarea, 'Hello');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('updates value when onChange is called', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<PromptInputWithHint value="" onChange={mockOnChange} />);

    const textarea = screen.getByTestId('prompt-textarea');
    await user.type(textarea, 'Test');

    // userEvent.type calls onChange for each character typed
    expect(mockOnChange).toHaveBeenCalled();
    // Check that the last call includes the typed character
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
    expect(lastCall[0]).toContain('t');
  });

  it('applies custom className', () => {
    const mockOnChange = vi.fn();
    render(
      <PromptInputWithHint
        value=""
        onChange={mockOnChange}
        className="custom-class"
      />
    );
    const component = screen.getByTestId('prompt-input-with-hint');
    expect(component.className).toContain('custom-class');
  });

  it('uses custom dataTestId', () => {
    const mockOnChange = vi.fn();
    render(
      <PromptInputWithHint
        value=""
        onChange={mockOnChange}
        dataTestId="custom-textarea"
      />
    );
    expect(screen.getByTestId('custom-textarea')).toBeInTheDocument();
  });

  it('applies proper styling classes to textarea', () => {
    const mockOnChange = vi.fn();
    render(<PromptInputWithHint value="" onChange={mockOnChange} />);
    const textarea = screen.getByTestId('prompt-textarea');
    expect(textarea.className).toContain('w-full');
    expect(textarea.className).toContain('min-h-[200px]');
    expect(textarea.className).toContain('rounded-lg');
  });
});
