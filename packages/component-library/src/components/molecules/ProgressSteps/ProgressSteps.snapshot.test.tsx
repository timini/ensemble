import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProgressSteps } from './ProgressSteps';

describe('ProgressSteps Snapshots', () => {
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
