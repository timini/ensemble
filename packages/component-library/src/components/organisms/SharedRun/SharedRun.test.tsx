import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { SharedRun, type SharedRunProps } from './SharedRun';
import { samplePairs } from '../../molecules/AgreementSummary/fixtures';
import { sampleAnswers } from '../AnswerColumns/fixtures';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

function setup(overrides: Partial<SharedRunProps> = {}, language: 'en' | 'fr' = 'en') {
  const props: SharedRunProps = {
    prompt: 'At what temperature does water boil on Everest?',
    sharedOn: '18 November 2026',
    expiresOn: '18 December 2026',
    agreement: { status: 'ready', score: 0.86, pairs: samplePairs },
    consensus: { status: 'success', text: 'About 70 °C.', method: 'standard', onShare: () => undefined },
    answers: sampleAnswers.map((a) => ({ ...a, onRetry: () => undefined })),
    ctaHref: '/workspace',
    ...overrides,
  };
  renderWithI18n(<SharedRun {...props} />, { language });
  return props;
}

describe('SharedRun', () => {
  it('shows the question as the heading with the model count and dates', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('water boil on Everest');
    const meta = screen.getByTestId('shared-run-meta');
    expect(meta).toHaveTextContent('3 answers');
    expect(meta).toHaveTextContent('Shared on 18 November 2026');
    expect(meta).toHaveTextContent('link expires 18 December 2026');
  });

  it('shows the agreement, the consensus and every answer', () => {
    setup();
    expect(screen.getByTestId('agreement-summary')).toBeInTheDocument();
    expect(screen.getByTestId('consensus-answer')).toHaveTextContent('About 70 °C.');
    expect(screen.getAllByTestId('answer-card')).toHaveLength(3);
  });

  it('is read only: no share or retry buttons', () => {
    setup({
      answers: [{ id: 'x', modelName: 'Grok', status: 'error', error: 'Down', onRetry: () => undefined }, ...sampleAnswers],
    });
    expect(screen.queryByTestId('consensus-answer-share')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('leaves out the agreement card when the run had no score', () => {
    setup({ agreement: null, consensus: { status: 'notSaved', method: 'standard' } });
    expect(screen.queryByTestId('agreement-summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('consensus-answer')).toHaveAttribute('data-status', 'notSaved');
  });

  it('links to the workspace to ask your own question', () => {
    setup();
    const cta = screen.getByTestId('shared-run-cta');
    expect(within(cta).getByTestId('shared-run-cta-link')).toHaveAttribute('href', '/workspace');
    expect(cta).toHaveTextContent('Ask your own question');
  });

  it('is in French', () => {
    setup({}, 'fr');
    expect(screen.getByText('Exécution partagée')).toBeInTheDocument();
    expect(screen.getByTestId('shared-run-meta')).toHaveTextContent('3 réponses');
  });
});
