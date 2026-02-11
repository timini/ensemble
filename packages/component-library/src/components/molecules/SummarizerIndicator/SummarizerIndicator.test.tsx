import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummarizerIndicator } from './SummarizerIndicator';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('SummarizerIndicator', () => {
  describe('rendering', () => {
    it('renders the component', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      expect(screen.getByTestId('summarizer-indicator')).toBeInTheDocument();
    });

    it('renders the model name', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
    });

    it('renders the "Summarizer Model:" label', () => {
      render(<SummarizerIndicator modelName="GPT-4" />);
      expect(screen.getByText('Summarizer Model:')).toBeInTheDocument();
    });

    it('renders the Zap icon', () => {
      const { container } = render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" className="custom-class" />);
      const indicator = screen.getByTestId('summarizer-indicator');
      expect(indicator).toHaveClass('custom-class');
    });

    it('applies default styling classes', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      const indicator = screen.getByTestId('summarizer-indicator');
      expect(indicator).toHaveClass('bg-warning/10', 'border-warning/30', 'rounded-lg');
    });
  });

  describe('different model names', () => {
    it('renders Claude 3 Opus', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
    });

    it('renders GPT-4 Turbo', () => {
      render(<SummarizerIndicator modelName="GPT-4 Turbo" />);
      expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument();
    });

    it('renders Gemini Pro', () => {
      render(<SummarizerIndicator modelName="Gemini Pro" />);
      expect(screen.getByText('Gemini Pro')).toBeInTheDocument();
    });

    it('renders custom model name', () => {
      render(<SummarizerIndicator modelName="Custom Model v2.0" />);
      expect(screen.getByText('Custom Model v2.0')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('renders as a div element', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      const indicator = screen.getByTestId('summarizer-indicator');
      expect(indicator.tagName).toBe('DIV');
    });

    it('forwards ref to div element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SummarizerIndicator modelName="Claude 3 Opus" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveAttribute('data-testid', 'summarizer-indicator');
    });
  });

  describe('layout', () => {
    it('uses flexbox layout', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      const indicator = screen.getByTestId('summarizer-indicator');
      expect(indicator).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('has proper padding', () => {
      render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      const indicator = screen.getByTestId('summarizer-indicator');
      expect(indicator).toHaveClass('px-6', 'py-4');
    });
  });

  describe('styling', () => {
    it('has warning color scheme', () => {
      const { container } = render(<SummarizerIndicator modelName="Claude 3 Opus" />);
      const indicator = screen.getByTestId('summarizer-indicator');

      // Background and border
      expect(indicator).toHaveClass('bg-warning/10', 'border-warning/30');

      // Icon color
      const iconWrapper = container.querySelector('[class*="text-warning"]');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('merges custom className with default classes', () => {
      render(
        <SummarizerIndicator
          modelName="Claude 3 Opus"
          className="mt-4 shadow-lg"
        />
      );
      const indicator = screen.getByTestId('summarizer-indicator');
      expect(indicator).toHaveClass('bg-warning/10', 'border-warning/30', 'mt-4', 'shadow-lg');
    });
  });

  describe('internationalization', () => {
    it('renders label in English', () => {
      renderWithI18n(<SummarizerIndicator modelName="Claude 3 Opus" />, { language: 'en' });
      expect(screen.getByText('Summarizer Model:')).toBeInTheDocument();
    });

    it('renders label in French', () => {
      renderWithI18n(<SummarizerIndicator modelName="Claude 3 Opus" />, { language: 'fr' });
      expect(screen.getByText('Modèle de synthèse :')).toBeInTheDocument();
    });

    it('renders model name in English locale', () => {
      renderWithI18n(<SummarizerIndicator modelName="GPT-4 Turbo" />, { language: 'en' });
      expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument();
    });

    it('renders model name in French locale', () => {
      renderWithI18n(<SummarizerIndicator modelName="GPT-4 Turbo" />, { language: 'fr' });
      expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument();
    });
  });
});
