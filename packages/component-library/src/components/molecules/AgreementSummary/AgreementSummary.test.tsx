import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AgreementSummary, agreementLevel } from './AgreementSummary';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const pairs = [
  { a: 'GPT-6', b: 'Claude', score: 0.91 },
  { a: 'GPT-6', b: 'Gemini', score: 0.84 },
  { a: 'Claude', b: 'Gemini', score: 0.42 },
];

describe('agreementLevel', () => {
  it('uses the default thresholds: above 0.8 high, from 0.5 medium', () => {
    expect(agreementLevel(0.81)).toBe('high');
    expect(agreementLevel(0.8)).toBe('medium');
    expect(agreementLevel(0.5)).toBe('medium');
    expect(agreementLevel(0.49)).toBe('low');
  });

  it('uses calibrated thresholds when given', () => {
    expect(agreementLevel(0.6, { high: 0.55, medium: 0.3 })).toBe('high');
  });
});

describe('AgreementSummary', () => {
  it('shows the score, its level and what it means', () => {
    renderWithI18n(<AgreementSummary status="ready" score={0.86} pairs={pairs} />);
    expect(screen.getByRole('heading', { name: 'Agreement' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Agreement score 86 out of 100' })).toBeInTheDocument();
    const level = screen.getByTestId('agreement-level');
    expect(level).toHaveAttribute('data-level', 'high');
    expect(level).toHaveTextContent('High agreement');
    expect(screen.getByTestId('agreement-meaning')).toHaveTextContent('probably safe to use');
  });

  it('applies calibrated thresholds', () => {
    renderWithI18n(<AgreementSummary status="ready" score={0.6} thresholds={{ high: 0.55, medium: 0.3 }} pairs={[]} />);
    expect(screen.getByTestId('agreement-level')).toHaveAttribute('data-level', 'high');
  });

  it('lists the score for each pair, behind a toggle on small screens', () => {
    renderWithI18n(<AgreementSummary status="ready" score={0.72} pairs={pairs} />);
    const toggle = screen.getByRole('button', { name: 'Scores for each pair' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const rows = screen.getAllByTestId('agreement-pair');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('GPT-6 and Claude');
    expect(rows[0]).toHaveTextContent('0.91');
    expect(rows[2]).toHaveAttribute('data-level', 'low');
  });

  it('says when the labels are calibrated for the embedding model', () => {
    renderWithI18n(
      <AgreementSummary status="ready" score={0.86} pairs={[]} calibration={{ calibrated: true, embeddingModel: 'text-embedding-3-small' }} />,
    );
    const note = screen.getByTestId('agreement-calibration');
    expect(note).toHaveAttribute('data-calibrated', 'true');
    expect(note).toHaveTextContent('Calibrated for text-embedding-3-small');
  });

  it('says when the labels are not calibrated', () => {
    renderWithI18n(
      <AgreementSummary status="ready" score={0.86} pairs={[]} calibration={{ calibrated: false, embeddingModel: 'nomic-embed-text' }} />,
      { language: 'fr' },
    );
    const note = screen.getByTestId('agreement-calibration');
    expect(note).toHaveAttribute('data-calibrated', 'false');
    expect(note).toHaveTextContent('Non calibré');
    expect(note).toHaveTextContent('nomic-embed-text');
  });

  it('shows progress while answers arrive', () => {
    renderWithI18n(<AgreementSummary status="pending" progress={{ done: 2, total: 3 }} />);
    expect(screen.getByTestId('agreement-summary')).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('agreement-pending')).toHaveTextContent('2 of 3 answers so far.');
    expect(screen.queryByTestId('agreement-level')).not.toBeInTheDocument();
  });

  it('reserves the space of the finished summary while pending', () => {
    renderWithI18n(<AgreementSummary status="pending" progress={{ done: 1, total: 4 }} />, { language: 'fr' });
    expect(screen.getByTestId('agreement-pending')).toHaveTextContent("1 réponse sur 4 pour l'instant.");
    const skeleton = screen.getByTestId('agreement-pending-skeleton');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton.querySelectorAll('[data-skeleton="pair"]')).toHaveLength(6);
    expect(screen.getByTestId('agreement-calibration-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('agreement-level')).not.toBeInTheDocument();
  });

  it('explains how to get a score when no embedding model is set', () => {
    renderWithI18n(<AgreementSummary status="unavailable" />);
    expect(screen.getByTestId('agreement-unavailable')).toHaveTextContent('No agreement score');
  });

  it('offers to open settings when no embedding model is set', () => {
    const onOpenSettings = vi.fn();
    renderWithI18n(<AgreementSummary status="unavailable" onOpenSettings={onOpenSettings} />);
    expect(screen.getByTestId('agreement-unavailable')).toHaveAttribute('data-reason', 'noEmbeddings');
    fireEvent.click(screen.getByTestId('agreement-open-settings'));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('shows the command that installs a local embedding model', () => {
    renderWithI18n(<AgreementSummary status="unavailable" command="ollama pull nomic-embed-text" />);
    expect(screen.getByTestId('agreement-command')).toHaveTextContent('ollama pull nomic-embed-text');
    expect(screen.getByTestId('agreement-unavailable')).toHaveTextContent('Your Ollama server has no embedding model');
  });

  it('says when the answers could not be scored', () => {
    renderWithI18n(<AgreementSummary status="unavailable" reason="error" onOpenSettings={() => undefined} />);
    const block = screen.getByTestId('agreement-unavailable');
    expect(block).toHaveAttribute('data-reason', 'error');
    expect(block).toHaveTextContent('could not be scored');
    expect(screen.queryByTestId('agreement-open-settings')).not.toBeInTheDocument();
  });

  it('says when there are too few answers to compare', () => {
    renderWithI18n(<AgreementSummary status="unavailable" reason="tooFewAnswers" />);
    expect(screen.getByTestId('agreement-unavailable')).toHaveTextContent('at least 2 answers');
  });

  it('names the answers left out of the score', () => {
    renderWithI18n(<AgreementSummary status="ready" score={0.9} pairs={pairs.slice(0, 1)} excluded={['Gemini']} />);
    expect(screen.getByTestId('agreement-excluded')).toHaveTextContent('Gemini');
  });
});
