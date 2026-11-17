import type { Meta, StoryObj } from '@storybook/react';
import { BenchmarkResultsTable, type BenchmarkResultRow } from './BenchmarkResultsTable';

const meta = {
  title: 'Organisms/BenchmarkResultsTable',
  component: BenchmarkResultsTable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof BenchmarkResultsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Example values for the catalogue only. They are not benchmark results. */
const rows: BenchmarkResultRow[] = [
  { id: 'single:a', kind: 'single', label: 'Open model A', accuracy: 0.71, ciLower: 0.643, ciUpper: 0.769, pValue: null, isBest: true, costUsd: 0.12, costIncomplete: false, failures: 0 },
  { id: 'single:b', kind: 'single', label: 'Open model B', accuracy: 0.6, ciLower: 0.531, ciUpper: 0.665, pValue: 0.004, isBest: false, costUsd: 0.02, costIncomplete: false, failures: 3 },
  { id: 'ensemble:majority', kind: 'ensemble', label: 'Ensemble, mechanical majority', accuracy: 0.735, ciLower: 0.669, ciUpper: 0.792, pValue: 0.41, isBest: false, costUsd: 0.2, costIncomplete: false, failures: 0 },
  { id: 'reference', kind: 'reference', label: 'Premium reference', accuracy: 0.9, ciLower: 0.851, ciUpper: 0.934, pValue: 0.0002, isBest: false, costUsd: 3.1, costIncomplete: true, failures: 1 },
];

/** One dataset with single models, an ensemble and the reference. */
export const Default: Story = {
  args: { title: 'GSM8K', n: 200, rows },
};

/** A dataset where the reference has not been run. */
export const WithoutReference: Story = {
  args: { title: 'GPQA', n: 198, rows: rows.slice(0, 3) },
};

/** Configurations that were not compared with the best single model. */
export const NotTested: Story = {
  args: { title: 'TruthfulQA', n: 10, rows: rows.map((r) => ({ ...r, pValue: null })) },
};
