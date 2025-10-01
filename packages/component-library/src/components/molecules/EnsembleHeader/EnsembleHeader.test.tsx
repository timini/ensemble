import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnsembleHeader } from './EnsembleHeader';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('EnsembleHeader', () => {
  it('renders the header with title', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('The smartest AI is an ensemble.')).toBeInTheDocument();
  });

  it('renders the settings button', () => {
    render(<EnsembleHeader />);
    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<EnsembleHeader />);
    const header = container.firstChild;
    expect(header).toHaveClass('bg-background', 'border-b');
  });

  describe('snapshots', () => {
    it('matches snapshot for default render', () => {
      const { container } = render(<EnsembleHeader />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('internationalization', () => {
    it('renders English translations correctly', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
      expect(screen.getByText('The smartest AI is an ensemble.')).toBeInTheDocument();
    });

    it('renders French translations correctly', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      expect(screen.getByText('IA Ensemble')).toBeInTheDocument();
      expect(screen.getByText("L'IA la plus intelligente est un ensemble.")).toBeInTheDocument();
    });

    it('displays translated title in English', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('Ensemble AI');
    });

    it('displays translated title in French', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('IA Ensemble');
    });

    it('displays translated tagline in English', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      expect(screen.getByText('The smartest AI is an ensemble.')).toHaveClass('text-muted-foreground');
    });

    it('displays translated tagline in French', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      expect(screen.getByText("L'IA la plus intelligente est un ensemble.")).toHaveClass('text-muted-foreground');
    });
  });
});
