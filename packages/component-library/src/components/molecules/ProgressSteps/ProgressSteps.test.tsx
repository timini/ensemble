import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressSteps } from './ProgressSteps';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ProgressSteps', () => {
  it('renders all step labels', () => {
    render(<ProgressSteps currentStep="config" />);
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByText('Ensemble')).toBeInTheDocument();
    expect(screen.getByText('Prompt')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('highlights the current step', () => {
    render(<ProgressSteps currentStep="prompt" />);
    const promptStep = screen.getByText('Prompt').parentElement;
    expect(promptStep?.querySelector('.bg-blue-500')).toBeInTheDocument();
  });

  it('shows check marks for completed steps', () => {
    render(<ProgressSteps currentStep="review" />);
    // When on review (step 4), steps 1, 2, and 3 should show check marks
    const checkIcons = screen.getAllByRole('img', { hidden: true });
    expect(checkIcons.length).toBeGreaterThanOrEqual(3);
  });

  it('shows step numbers for upcoming steps', () => {
    render(<ProgressSteps currentStep="config" />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders connector lines between steps', () => {
    const { container } = render(<ProgressSteps currentStep="ensemble" />);
    const connectors = container.querySelectorAll('.w-16.h-0\\.5');
    expect(connectors.length).toBe(3); // 3 connectors for 4 steps
  });

  it('applies correct styling for completed steps', () => {
    const { container } = render(<ProgressSteps currentStep="prompt" />);
    const completedSteps = container.querySelectorAll('.bg-green-500');
    expect(completedSteps.length).toBeGreaterThan(0);
  });

  describe('snapshots', () => {
    it('matches snapshot for config step', () => {
      const { container } = render(<ProgressSteps currentStep="config" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for ensemble step', () => {
      const { container } = render(<ProgressSteps currentStep="ensemble" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for prompt step', () => {
      const { container } = render(<ProgressSteps currentStep="prompt" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for review step', () => {
      const { container } = render(<ProgressSteps currentStep="review" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('internationalization', () => {
    it('renders all step labels in English', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'en' });

      expect(screen.getByText('Config')).toBeInTheDocument();
      expect(screen.getByText('Ensemble')).toBeInTheDocument();
      expect(screen.getByText('Prompt')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('renders all step labels in French', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'fr' });

      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Ensemble')).toBeInTheDocument();
      expect(screen.getByText('Invite')).toBeInTheDocument();
      expect(screen.getByText('Révision')).toBeInTheDocument();
    });

    it('displays current step label in English when on config step', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'en' });

      const configLabel = screen.getByText('Config');
      expect(configLabel).toHaveClass('text-blue-600');
    });

    it('displays current step label in French when on config step', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'fr' });

      const configLabel = screen.getByText('Configuration');
      expect(configLabel).toHaveClass('text-blue-600');
    });

    it('displays completed step labels in English when on review step', () => {
      renderWithI18n(<ProgressSteps currentStep="review" />, { language: 'en' });

      expect(screen.getByText('Config')).toHaveClass('text-green-600');
      expect(screen.getByText('Ensemble')).toHaveClass('text-green-600');
      expect(screen.getByText('Prompt')).toHaveClass('text-green-600');
    });

    it('displays completed step labels in French when on review step', () => {
      renderWithI18n(<ProgressSteps currentStep="review" />, { language: 'fr' });

      expect(screen.getByText('Configuration')).toHaveClass('text-green-600');
      expect(screen.getByText('Ensemble')).toHaveClass('text-green-600');
      expect(screen.getByText('Invite')).toHaveClass('text-green-600');
    });

    it('displays English labels correctly for prompt step', () => {
      renderWithI18n(<ProgressSteps currentStep="prompt" />, { language: 'en' });

      expect(screen.getByText('Config')).toHaveClass('text-green-600');
      expect(screen.getByText('Ensemble')).toHaveClass('text-green-600');
      expect(screen.getByText('Prompt')).toHaveClass('text-blue-600');
      expect(screen.getByText('Review')).toHaveClass('text-muted-foreground');
    });

    it('displays French labels correctly for prompt step', () => {
      renderWithI18n(<ProgressSteps currentStep="prompt" />, { language: 'fr' });

      expect(screen.getByText('Configuration')).toHaveClass('text-green-600');
      expect(screen.getByText('Ensemble')).toHaveClass('text-green-600');
      expect(screen.getByText('Invite')).toHaveClass('text-blue-600');
      expect(screen.getByText('Révision')).toHaveClass('text-muted-foreground');
    });
  });
});
