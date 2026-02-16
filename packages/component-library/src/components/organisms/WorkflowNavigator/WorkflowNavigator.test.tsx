import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowNavigator } from './WorkflowNavigator';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('WorkflowNavigator', () => {
  describe('rendering', () => {
    it('renders only continue button for config step', () => {
      render(
        <WorkflowNavigator
          currentStep="config"
          continueLabel="Continue"
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByText('Continue')).toBeInTheDocument();
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('renders back and continue buttons for middle steps', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('renders both buttons for review step', () => {
      render(
        <WorkflowNavigator
          currentStep="review"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Go Back"
          continueLabel="Move Forward"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      expect(screen.getByText('Go Back')).toBeInTheDocument();
      expect(screen.getByText('Move Forward')).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('disables continue button when continueDisabled is true', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          continueDisabled={true}
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeDisabled();
    });

    it('enables continue button by default', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const continueButton = screen.getByText('Continue');
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('button styling', () => {
    it('applies outline variant to back button', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const backButton = screen.getByText('Back');
      expect(backButton).toHaveAttribute('data-variant', 'outline');
    });

    it('applies primary variant to continue button', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const continueButton = screen.getByText('Continue');
      expect(continueButton).toHaveAttribute('data-variant', 'default');
    });
  });

  describe('user interactions', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();

      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={onBack}
          onContinue={vi.fn()}
        />
      );

      await user.click(screen.getByText('Back'));
      expect(onBack).toHaveBeenCalledOnce();
    });

    it('calls onContinue when continue button is clicked', async () => {
      const user = userEvent.setup();
      const onContinue = vi.fn();

      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={onContinue}
        />
      );

      await user.click(screen.getByText('Continue'));
      expect(onContinue).toHaveBeenCalledOnce();
    });

    it('does not call onContinue when disabled', async () => {
      const user = userEvent.setup();
      const onContinue = vi.fn();

      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          continueDisabled={true}
          onBack={vi.fn()}
          onContinue={onContinue}
        />
      );

      await user.click(screen.getByText('Continue'));
      expect(onContinue).not.toHaveBeenCalled();
    });
  });

  describe('layout', () => {
    it('uses flex justify-between layout', () => {
      const { container } = render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const nav = container.querySelector('[data-testid="workflow-navigator"]');
      expect(nav).toBeInTheDocument();
    });

    it('renders when only continue button', () => {
      const { container } = render(
        <WorkflowNavigator
          currentStep="config"
          continueLabel="Continue"
          onContinue={vi.fn()}
        />
      );

      const nav = container.querySelector('[data-testid="workflow-navigator"]');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has navigation role', () => {
      const { container } = render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('back button has button role', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const backButton = screen.getByText('Back');
      expect(backButton.tagName).toBe('BUTTON');
    });

    it('continue button has button role', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const continueButton = screen.getByText('Continue');
      expect(continueButton.tagName).toBe('BUTTON');
    });
  });

  describe('composition', () => {
    it('uses Button component for back button', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const backButton = screen.getByText('Back');
      expect(backButton).toBeInTheDocument();
    });

    it('uses Button component for continue button', () => {
      render(
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back"
          continueLabel="Continue"
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      );

      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English button label', () => {
      renderWithI18n(
        <WorkflowNavigator
          currentStep="config"
          continueLabel="Continue"
          onContinue={vi.fn()}
        />,
        { language: 'en' }
      );
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('renders French button label', () => {
      renderWithI18n(
        <WorkflowNavigator
          currentStep="config"
          continueLabel="Continuer"
          onContinue={vi.fn()}
        />,
        { language: 'fr' }
      );
      expect(screen.getByText('Continuer')).toBeInTheDocument();
    });
  });
});
