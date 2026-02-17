import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createBaselineCommand } from './commands/baseline.js';
import { createBenchmarkCommand } from './commands/benchmark.js';
import { createCiEvalCommand } from './commands/ciEval.js';
import { createCompareCommand } from './commands/compare.js';
import { createQuickEvalCommand } from './commands/quickEval.js';
import { createRunCommand } from './commands/run.js';
import { createUpdateBaselineCommand } from './commands/updateBaseline.js';

export function createProgram(): Command {
  const program = new Command();
  program
    .name('ensemble-eval')
    .description(
      'Command-line evaluation scaffold for running provider benchmarks and consensus analysis.',
    )
    .version('0.1.0');

  program.addCommand(createBenchmarkCommand());
  program.addCommand(createBaselineCommand());
  program.addCommand(createAnalyzeCommand());
  program.addCommand(createCiEvalCommand());
  program.addCommand(createCompareCommand());
  program.addCommand(createQuickEvalCommand());
  program.addCommand(createRunCommand());
  program.addCommand(createUpdateBaselineCommand());

  return program;
}
