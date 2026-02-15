import { Command } from 'commander';
import { analyzeBenchmarkRuns } from '../lib/analysis.js';
import { createMarkdownReport } from '../lib/report.js';
import { readJsonFile, writeJsonFile, writeTextFile } from '../lib/io.js';
import type { PromptRunResult } from '../types.js';

interface AnalyzeCommandOptions {
  report: string;
  charts?: string;
  bootstrapIterations?: string;
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
    .option('--charts <dir>', 'Directory for chart-ready JSON output files')
    .option(
      '--bootstrap-iterations <count>',
      'Paired bootstrap iterations for confidence intervals.',
      '10000',
    )
    .action(async (results: string, options: AnalyzeCommandOptions) => {
      const parsed = await readJsonFile<ResultFileWithRuns>(results);
      if (!parsed || !Array.isArray(parsed.runs)) {
        throw new Error(`Result file does not contain a valid "runs" array: ${results}`);
      }
      const bootstrapIterations = Number.parseInt(
        options.bootstrapIterations ?? '10000',
        10,
      );
      if (!Number.isInteger(bootstrapIterations) || bootstrapIterations <= 0) {
        throw new Error(
          `Invalid bootstrap iteration count "${options.bootstrapIterations}".`,
        );
      }

      const analysis = analyzeBenchmarkRuns(parsed.runs, { bootstrapIterations });
      const markdown = createMarkdownReport(results, analysis);
      await writeTextFile(options.report, markdown);
      if (options.charts) {
        await writeJsonFile(
          `${options.charts}/accuracy-lift-by-difficulty.json`,
          analysis.charts.accuracyLiftByDifficulty,
        );
        await writeJsonFile(
          `${options.charts}/agreement-calibration.json`,
          analysis.charts.agreementCalibration,
        );
        await writeJsonFile(
          `${options.charts}/model-diversity-heatmap.json`,
          analysis.charts.modelDiversityHeatmap,
        );
        await writeJsonFile(
          `${options.charts}/cost-vs-accuracy-frontier.json`,
          analysis.charts.costVsAccuracyFrontier,
        );
        await writeJsonFile(
          `${options.charts}/right-answer-always-there.json`,
          analysis.charts.rightAnswerAlwaysThere,
        );
      }

      process.stdout.write(`Report generated: ${options.report}\n`);
      if (options.charts) {
        process.stdout.write(`Chart JSON written to ${options.charts}\n`);
      }
    });

  return command;
}
