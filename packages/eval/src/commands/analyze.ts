import { Command } from 'commander';
import { createMarkdownReport } from '../lib/report.js';
import { readJsonFile, writeTextFile } from '../lib/io.js';
import type { PromptRunResult } from '../types.js';

interface AnalyzeCommandOptions {
  report: string;
}

interface ResultFileWithRuns {
  runs: PromptRunResult[];
}

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');
  command
    .description('Analyze a JSON result file and generate a Markdown report.')
    .argument('<results>', 'Path to benchmark/baseline JSON output')
    .requiredOption('--report <file>', 'Markdown report output path')
    .action(async (results: string, options: AnalyzeCommandOptions) => {
      const parsed = await readJsonFile<ResultFileWithRuns>(results);
      if (!parsed || !Array.isArray(parsed.runs)) {
        throw new Error(`Result file does not contain a valid "runs" array: ${results}`);
      }

      const markdown = createMarkdownReport(results, parsed.runs);
      await writeTextFile(options.report, markdown);

      process.stdout.write(`Report generated: ${options.report}\n`);
    });

  return command;
}
