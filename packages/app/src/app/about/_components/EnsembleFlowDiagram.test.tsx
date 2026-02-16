import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnsembleFlowDiagram } from './EnsembleFlowDiagram';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pages.about.flow.prompt': 'Your Prompt',
        'pages.about.flow.models': 'AI Models',
        'pages.about.flow.consensus': 'Consensus',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('EnsembleFlowDiagram', () => {
  it('renders the data-testid attribute', () => {
    render(<EnsembleFlowDiagram />);
    expect(screen.getByTestId('ensemble-flow-diagram')).toBeInTheDocument();
  });

  it('renders all three flow labels', () => {
    render(<EnsembleFlowDiagram />);
    expect(screen.getByText('Your Prompt')).toBeInTheDocument();
    expect(screen.getByText('AI Models')).toBeInTheDocument();
    expect(screen.getByText('Consensus')).toBeInTheDocument();
  });

  it('renders all four model labels', () => {
    render(<EnsembleFlowDiagram />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('xAI')).toBeInTheDocument();
  });

  it('uses semantic color tokens instead of hardcoded colors', () => {
    const { container } = render(<EnsembleFlowDiagram />);
    const modelChips = container.querySelectorAll('.rounded-md');

    expect(modelChips).toHaveLength(4);

    const classes = Array.from(modelChips).map((el) => el.className);
    classes.forEach((cls) => {
      expect(cls).not.toMatch(/green-\d+/);
      expect(cls).not.toMatch(/orange-\d+/);
      expect(cls).not.toMatch(/blue-\d+/);
      expect(cls).not.toMatch(/purple-\d+/);
    });
  });
});
