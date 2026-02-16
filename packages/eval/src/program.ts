import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createBaselineCommand } from './commands/baseline.js';
import { createBenchmarkCommand } from './commands/benchmark.js';
import { createCiEvalCommand } from './commands/ciEval.js';
import { createRunCommand } from './commands/run.js';

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
  program.addCommand(createRunCommand());

  return program;
}
