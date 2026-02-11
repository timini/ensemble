/**
 * PromptTips Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromptTips } from './PromptTips';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pages.prompt.tipsHeading': 'Tips for better prompts',
        'pages.prompt.tipsDescription': 'Small adjustments often lead to noticeably more aligned outputs.',
        'pages.prompt.tip1': 'Be specific and clear about the desired outcome.',
        'pages.prompt.tip2': 'Provide context, examples, or constraints when they matter.',
        'pages.prompt.tip3': 'Experiment with tone: analytical, conversational, or creative.',
        'pages.prompt.tip4': 'Iterate on length and structure to probe different behaviours.',
      };
      return translations[key] || key;
    },
  }),
}));

describe('PromptTips', () => {
  it('renders the component', () => {
    render(<PromptTips />);
    expect(screen.getByTestId('prompt-tips')).toBeInTheDocument();
  });

  it('displays the heading', () => {
    render(<PromptTips />);
    expect(screen.getByText('Tips for better prompts')).toBeInTheDocument();
  });

  it('displays the description', () => {
    render(<PromptTips />);
    expect(screen.getByText('Small adjustments often lead to noticeably more aligned outputs.')).toBeInTheDocument();
  });

  it('displays all 4 tips', () => {
    render(<PromptTips />);
    expect(screen.getByText('Be specific and clear about the desired outcome.')).toBeInTheDocument();
    expect(screen.getByText('Provide context, examples, or constraints when they matter.')).toBeInTheDocument();
    expect(screen.getByText('Experiment with tone: analytical, conversational, or creative.')).toBeInTheDocument();
    expect(screen.getByText('Iterate on length and structure to probe different behaviours.')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PromptTips className="custom-class" />);
    const component = screen.getByTestId('prompt-tips');
    expect(component.className).toContain('custom-class');
  });

  it('applies primary theme styling', () => {
    render(<PromptTips />);
    const component = screen.getByTestId('prompt-tips');
    expect(component.className).toContain('bg-primary/10');
    expect(component.className).toContain('border-primary/20');
  });
});
