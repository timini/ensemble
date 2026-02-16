import { Command } from 'commander';
import { buildComparisonResult } from '../lib/compareBuilder.js';
import type { ResultFileWithRuns } from '../lib/compareBuilder.js';
import { readJsonFile, writeTextFile } from '../lib/io.js';
import { createRegressionReport } from '../lib/regressionReport.js';

interface CompareCommandOptions {
  report?: string;
  threshold?: string;
}

export { buildComparisonResult } from '../lib/compareBuilder.js';

export function createCompareCommand(): Command {
  const command = new Command('compare');
  command
    .description(
      'Compare two benchmark result files and generate a regression report.',
    )
    .argument('<current>', 'Path to current benchmark results JSON')
    .argument('<baseline>', 'Path to baseline benchmark results JSON')
    .option('--report <path>', 'Path to write the Markdown report (default: stdout)')
    .option(
      '--threshold <value>',
      'p-value significance threshold',
      '0.05',
    )
    .action(async (currentPath: string, baselinePath: string, options: CompareCommandOptions) => {
      const threshold = Number.parseFloat(options.threshold ?? '0.05');
      if (Number.isNaN(threshold) || threshold <= 0 || threshold > 1) {
        throw new Error(`Invalid threshold "${options.threshold}". Must be between 0 and 1.`);
      }

      let current: ResultFileWithRuns;
      try {
        current = await readJsonFile<ResultFileWithRuns>(currentPath);
      } catch (err) {
        throw new Error(`Failed to load current results from "${currentPath}": ${(err as Error).message}`);
      }

      let baseline: ResultFileWithRuns;
      try {
        baseline = await readJsonFile<ResultFileWithRuns>(baselinePath);
      } catch (err) {
        throw new Error(`Failed to load baseline results from "${baselinePath}": ${(err as Error).message}`);
      }

      if (!Array.isArray(current.runs)) {
        throw new Error(`Current results file does not contain a valid "runs" array: ${currentPath}`);
      }
      if (!Array.isArray(baseline.runs)) {
        throw new Error(`Baseline results file does not contain a valid "runs" array: ${baselinePath}`);
      }

      const result = buildComparisonResult(baseline, current, { threshold });
      const report = createRegressionReport(result);

      if (options.report) {
        await writeTextFile(options.report, report);
        process.stdout.write(`Regression report written to ${options.report}\n`);
      } else {
        process.stdout.write(report);
        process.stdout.write('\n');
      }
    });

  return command;
}
