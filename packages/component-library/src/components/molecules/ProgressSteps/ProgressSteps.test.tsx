import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const promptStep = screen.getByTestId('workflow-step-prompt');
    expect(promptStep).toHaveClass('bg-primary');
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
    const completedSteps = container.querySelectorAll('.bg-success');
    expect(completedSteps.length).toBeGreaterThan(0);
  });

  it('uses fixed-width label containers for horizontal centering', () => {
    render(<ProgressSteps currentStep="config" />);
    const ensembleLabel = screen.getByText('Ensemble');
    const promptLabel = screen.getByText('Prompt');

    expect(ensembleLabel).toHaveClass('inline-block', 'w-12', 'text-center');
    expect(promptLabel).toHaveClass('inline-block', 'w-12', 'text-center');
  });

  it('renders completed steps as clickable buttons when onStepClick is provided', () => {
    render(<ProgressSteps currentStep="prompt" onStepClick={() => {}} />);

    expect(screen.getByTestId('progress-step-config').tagName).toBe('BUTTON');
    expect(screen.getByTestId('progress-step-ensemble').tagName).toBe('BUTTON');
    expect(screen.getByTestId('progress-step-prompt').tagName).toBe('DIV');
    expect(screen.getByTestId('progress-step-review').tagName).toBe('DIV');
  });

  it('calls onStepClick when clicking a completed step button', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();

    render(<ProgressSteps currentStep="review" onStepClick={onStepClick} />);

    await user.click(screen.getByTestId('progress-step-config'));
    expect(onStepClick).toHaveBeenCalledWith('config');
  });

  it('does not render step buttons when onStepClick is not provided', () => {
    render(<ProgressSteps currentStep="review" />);

    expect(screen.getByTestId('progress-step-config').tagName).toBe('DIV');
    expect(screen.getByTestId('progress-step-ensemble').tagName).toBe('DIV');
    expect(screen.getByTestId('progress-step-prompt').tagName).toBe('DIV');
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

      expect(screen.getByText('Config')).toBeInTheDocument();
      expect(screen.getByText('Ensemble')).toBeInTheDocument();
      expect(screen.getByText('Invite')).toBeInTheDocument();
      expect(screen.getByText('Révision')).toBeInTheDocument();
    });

    it('displays current step label in English when on config step', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'en' });

      const configLabel = screen.getByText('Config');
      expect(configLabel).toHaveClass('text-primary');
    });

    it('displays current step label in French when on config step', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'fr' });

      const configLabel = screen.getByText('Config');
      expect(configLabel).toHaveClass('text-primary');
    });

    it('displays completed step labels in English when on review step', () => {
      renderWithI18n(<ProgressSteps currentStep="review" />, { language: 'en' });

      expect(screen.getByText('Config')).toHaveClass('text-success');
      expect(screen.getByText('Ensemble')).toHaveClass('text-success');
      expect(screen.getByText('Prompt')).toHaveClass('text-success');
    });

    it('displays completed step labels in French when on review step', () => {
      renderWithI18n(<ProgressSteps currentStep="review" />, { language: 'fr' });

      expect(screen.getByText('Config')).toHaveClass('text-success');
      expect(screen.getByText('Ensemble')).toHaveClass('text-success');
      expect(screen.getByText('Invite')).toHaveClass('text-success');
    });

    it('displays English labels correctly for prompt step', () => {
      renderWithI18n(<ProgressSteps currentStep="prompt" />, { language: 'en' });

      expect(screen.getByText('Config')).toHaveClass('text-success');
      expect(screen.getByText('Ensemble')).toHaveClass('text-success');
      expect(screen.getByText('Prompt')).toHaveClass('text-primary');
      expect(screen.getByText('Review')).toHaveClass('text-muted-foreground');
    });

    it('displays French labels correctly for prompt step', () => {
      renderWithI18n(<ProgressSteps currentStep="prompt" />, { language: 'fr' });

      expect(screen.getByText('Config')).toHaveClass('text-success');
      expect(screen.getByText('Ensemble')).toHaveClass('text-success');
      expect(screen.getByText('Invite')).toHaveClass('text-primary');
      expect(screen.getByText('Révision')).toHaveClass('text-muted-foreground');
    });
  });
});
