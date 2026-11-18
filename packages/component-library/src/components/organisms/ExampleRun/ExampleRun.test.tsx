import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ExampleRun } from './ExampleRun';
import { exampleRunArgs } from './ExampleRun.fixtures';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ExampleRun', () => {
  it('shows the question, the agreement score with its level, and the consensus', () => {
    renderWithI18n(<ExampleRun {...exampleRunArgs} />);
    expect(screen.getByTestId('example-run-prompt')).toHaveTextContent('Mount Everest');
    expect(screen.getByTestId('agreement-ring')).toHaveAttribute('aria-label', expect.stringContaining('97'));
    expect(screen.getByTestId('example-run-level')).toHaveTextContent('High agreement');
    expect(screen.getByTestId('example-run-consensus')).toHaveTextContent('70 to 73.5°C');
  });

  it('labels the run as real, with its models, date, calls and cost', () => {
    renderWithI18n(<ExampleRun {...exampleRunArgs} />);
    expect(screen.getByTestId('example-run-kind')).toHaveTextContent('Real answers');
    expect(screen.getByTestId('example-run-stats')).toHaveTextContent('3 models · 7 calls · $0.0003');
    const source = screen.getByTestId('example-run-source');
    expect(source).toHaveTextContent('17 November 2026');
    expect(source).toHaveTextContent('OpenRouter');
    expect(source).toHaveTextContent('openai/text-embedding-3-small');
    expect(screen.getAllByTestId('example-run-answer').map((el) => el.getAttribute('data-model'))).toEqual([
      'Llama 3.3 70B',
      'Mistral Small 3.2',
      'Gemini 2.5 Flash Lite',
    ]);
  });

  it('says when the labels are not calibrated', () => {
    renderWithI18n(<ExampleRun {...exampleRunArgs} />);
    expect(screen.getByTestId('example-run-uncalibrated')).toBeInTheDocument();
  });

  it('labels an illustrative example honestly', () => {
    renderWithI18n(<ExampleRun {...exampleRunArgs} illustrative />);
    expect(screen.getByTestId('example-run-kind')).toHaveTextContent('Illustrative example');
  });

  it('clamps the consensus and answers until asked to show them in full', () => {
    renderWithI18n(<ExampleRun {...exampleRunArgs} />);
    const toggle = screen.getByTestId('example-run-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByTestId('example-run-answer-text')[0]).toHaveClass('line-clamp-2');
    expect(screen.getByTestId('example-run-consensus')).toHaveClass('line-clamp-4');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByTestId('example-run-answer-text')[0]).not.toHaveClass('line-clamp-2');
    expect(screen.getByTestId('example-run-consensus')).not.toHaveClass('line-clamp-4');
  });

  it('renders in French', () => {
    renderWithI18n(<ExampleRun {...exampleRunArgs} />, { language: 'fr' });
    expect(screen.getByTestId('example-run-kind')).toHaveTextContent('Réponses réelles');
  });
});
