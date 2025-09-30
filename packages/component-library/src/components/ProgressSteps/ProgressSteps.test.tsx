import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressSteps } from './ProgressSteps';

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
});
