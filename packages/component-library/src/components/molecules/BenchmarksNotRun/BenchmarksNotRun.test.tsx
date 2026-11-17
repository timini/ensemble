import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { BenchmarksNotRun } from './BenchmarksNotRun';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const command = 'npm run bench:matrix --workspace=packages/eval';

describe('BenchmarksNotRun', () => {
  it('says plainly that no results exist', () => {
    renderWithI18n(<BenchmarksNotRun command={command} estimate={null} />);
    expect(screen.getByTestId('benchmarks-not-run')).toHaveTextContent('Benchmarks not run yet');
    expect(screen.getByTestId('benchmarks-not-run')).toHaveTextContent('No measured results are published.');
    expect(screen.queryByTestId('benchmarks-not-run-estimate')).not.toBeInTheDocument();
  });

  it('shows the cost estimate of a full run', () => {
    renderWithI18n(
      <BenchmarksNotRun command={command} estimate={{ lowUsd: 2.183, highUsd: 18.27, calls: 3990 }} />,
    );
    expect(screen.getByTestId('benchmarks-not-run-estimate')).toHaveTextContent(
      'Estimated cost of a full run: $2.18 to $18.27 for 3990 model calls.',
    );
  });

  it('shows the command to run the matrix', () => {
    renderWithI18n(<BenchmarksNotRun command={command} estimate={null} />);
    expect(screen.getByTestId('benchmarks-not-run-command-command')).toHaveTextContent(command);
  });

  it('translates into French', () => {
    renderWithI18n(<BenchmarksNotRun command={command} estimate={null} />, { language: 'fr' });
    expect(screen.getByTestId('benchmarks-not-run')).toHaveTextContent('Benchmarks pas encore lancés');
  });
});
