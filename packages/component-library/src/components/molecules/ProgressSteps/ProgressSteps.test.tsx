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
    const promptStep = screen.getByTestId('progress-step-circle-prompt');
    expect(promptStep).toHaveAttribute('data-active', 'true');
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
    render(<ProgressSteps currentStep="ensemble" />);
    expect(screen.getByTestId('progress-step-connector-0')).toBeInTheDocument();
    expect(screen.getByTestId('progress-step-connector-1')).toBeInTheDocument();
    expect(screen.getByTestId('progress-step-connector-2')).toBeInTheDocument();
  });

  it('marks completed steps with data-completed attribute', () => {
    render(<ProgressSteps currentStep="prompt" />);
    const configCircle = screen.getByTestId('progress-step-circle-config');
    const ensembleCircle = screen.getByTestId('progress-step-circle-ensemble');
    expect(configCircle).toHaveAttribute('data-completed', 'true');
    expect(ensembleCircle).toHaveAttribute('data-completed', 'true');
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

    expect(screen.getByTestId('progress-step-container-config').tagName).toBe('BUTTON');
    expect(screen.getByTestId('progress-step-container-ensemble').tagName).toBe('BUTTON');
    expect(screen.getByTestId('progress-step-container-prompt').tagName).toBe('DIV');
    expect(screen.getByTestId('progress-step-container-review').tagName).toBe('DIV');
  });

  it('calls onStepClick when clicking a completed step button', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();

    render(<ProgressSteps currentStep="review" onStepClick={onStepClick} />);

    await user.click(screen.getByTestId('progress-step-container-config'));
    expect(onStepClick).toHaveBeenCalledWith('config');
  });

  it('does not render step buttons when onStepClick is not provided', () => {
    render(<ProgressSteps currentStep="review" />);

    expect(screen.getByTestId('progress-step-container-config').tagName).toBe('DIV');
    expect(screen.getByTestId('progress-step-container-ensemble').tagName).toBe('DIV');
    expect(screen.getByTestId('progress-step-container-prompt').tagName).toBe('DIV');
  });

  describe('tooltips', () => {
    it('renders tooltip text for each step', () => {
      render(<ProgressSteps currentStep="config" />);

      expect(screen.getByTestId('progress-step-tooltip-config')).toHaveTextContent(
        'Configure your API keys and select operating mode'
      );
      expect(screen.getByTestId('progress-step-tooltip-ensemble')).toHaveTextContent(
        'Select 2-6 AI models to compare'
      );
      expect(screen.getByTestId('progress-step-tooltip-prompt')).toHaveTextContent(
        'Enter your question or prompt'
      );
      expect(screen.getByTestId('progress-step-tooltip-review')).toHaveTextContent(
        'View and compare AI responses'
      );
    });

    it('renders tooltips with role="tooltip"', () => {
      render(<ProgressSteps currentStep="config" />);

      const tooltips = screen.getAllByRole('tooltip');
      expect(tooltips).toHaveLength(4);
    });

    it('associates tooltips with step containers via aria-describedby', () => {
      render(<ProgressSteps currentStep="config" />);

      const configContainer = screen.getByTestId('progress-step-container-config');
      const configTooltip = screen.getByTestId('progress-step-tooltip-config');

      expect(configContainer).toHaveAttribute('aria-describedby', configTooltip.id);
    });

    it('associates tooltips with clickable step buttons via aria-describedby', () => {
      render(<ProgressSteps currentStep="prompt" onStepClick={() => {}} />);

      const configButton = screen.getByTestId('progress-step-container-config');
      const configTooltip = screen.getByTestId('progress-step-tooltip-config');

      expect(configButton.tagName).toBe('BUTTON');
      expect(configButton).toHaveAttribute('aria-describedby', configTooltip.id);
    });
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

    it('displays current step label with active state in English', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'en' });

      const configLabel = screen.getByText('Config');
      expect(configLabel).toHaveAttribute('data-step-state', 'active');
    });

    it('displays current step label with active state in French', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'fr' });

      const configLabel = screen.getByText('Config');
      expect(configLabel).toHaveAttribute('data-step-state', 'active');
    });

    it('displays completed step labels in English when on review step', () => {
      renderWithI18n(<ProgressSteps currentStep="review" />, { language: 'en' });

      expect(screen.getByText('Config')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Ensemble')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Prompt')).toHaveAttribute('data-step-state', 'completed');
    });

    it('displays completed step labels in French when on review step', () => {
      renderWithI18n(<ProgressSteps currentStep="review" />, { language: 'fr' });

      expect(screen.getByText('Config')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Ensemble')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Invite')).toHaveAttribute('data-step-state', 'completed');
    });

    it('displays English labels correctly for prompt step', () => {
      renderWithI18n(<ProgressSteps currentStep="prompt" />, { language: 'en' });

      expect(screen.getByText('Config')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Ensemble')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Prompt')).toHaveAttribute('data-step-state', 'active');
      expect(screen.getByText('Review')).toHaveAttribute('data-step-state', 'upcoming');
    });

    it('displays French labels correctly for prompt step', () => {
      renderWithI18n(<ProgressSteps currentStep="prompt" />, { language: 'fr' });

      expect(screen.getByText('Config')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Ensemble')).toHaveAttribute('data-step-state', 'completed');
      expect(screen.getByText('Invite')).toHaveAttribute('data-step-state', 'active');
      expect(screen.getByText('Révision')).toHaveAttribute('data-step-state', 'upcoming');
    });

    it('renders English tooltip text', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'en' });

      expect(screen.getByTestId('progress-step-tooltip-config')).toHaveTextContent(
        'Configure your API keys and select operating mode'
      );
      expect(screen.getByTestId('progress-step-tooltip-ensemble')).toHaveTextContent(
        'Select 2-6 AI models to compare'
      );
    });

    it('renders French tooltip text', () => {
      renderWithI18n(<ProgressSteps currentStep="config" />, { language: 'fr' });

      expect(screen.getByTestId('progress-step-tooltip-config')).toHaveTextContent(
        'Configurez vos clés API et sélectionnez le mode de fonctionnement'
      );
      expect(screen.getByTestId('progress-step-tooltip-ensemble')).toHaveTextContent(
        'Sélectionnez 2 à 6 modèles IA à comparer'
      );
    });
  });
});
