import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { getTierConfig } from '../lib/tierConfig.js';
import { readJsonFile, writeJsonFile, writeTextFile } from '../lib/io.js';
import { registerProviders } from '../lib/providers.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import { RegressionDetector } from '../lib/regression.js';
import { createRegressionReport } from '../lib/regressionReport.js';
import type { GoldenBaselineFile } from '../lib/regressionTypes.js';
import type { EvalMode, EvalProvider } from '../types.js';

interface CiEvalCommandOptions {
  tier: 'ci' | 'post-merge';
  baseline?: string;
  output?: string;
  report: string;
  mode: EvalMode;
}

/**
 * Resolves API key environment variables, preferring TEST_ prefixed variants.
 * Sets the standard env var from the TEST_ variant so that downstream provider
 * registration picks it up.
 */
function resolveApiKeyEnvVars(): void {
  const mappings: Array<[string, string]> = [
    ['TEST_OPENAI_API_KEY', 'OPENAI_API_KEY'],
    ['TEST_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
    ['TEST_GOOGLE_API_KEY', 'GOOGLE_API_KEY'],
    ['TEST_XAI_API_KEY', 'XAI_API_KEY'],
  ];

  for (const [testKey, standardKey] of mappings) {
    const testValue = process.env[testKey];
    if (testValue && testValue.trim().length > 0) {
      process.env[standardKey] = testValue;
    }
  }
}

export function createCiEvalCommand(): Command {
  const command = new Command('ci-eval');
  command
    .description(
      'Run regression evaluation against a golden baseline for CI or post-merge checks.',
    )
    .requiredOption(
      '--tier <tier>',
      'Evaluation tier: "ci" for fast PR gate checks, "post-merge" for thorough nightly runs.',
    )
    .option(
      '--baseline <path>',
      'Path to golden baseline JSON file.',
    )
    .option('--output <path>', 'Path to write raw regression results JSON.')
    .option('--report <path>', 'Path to write Markdown regression report.', 'eval-report.md')
    .option('--mode <mode>', 'Provider mode to use (mock or free).', 'free')
    .action(async (options: CiEvalCommandOptions) => {
      const tier = options.tier;
      const baselinePath = options.baseline ?? `baselines/golden-${tier}.json`;

      // Step 1: Load tier config
      const tierConfig = getTierConfig(tier);

      // Step 2: Resolve API key env vars (prefer TEST_ prefixed)
      resolveApiKeyEnvVars();

      // Step 3: Load golden baseline from file
      process.stderr.write(`Loading baseline from ${baselinePath}...\n`);
      const baseline = await readJsonFile<GoldenBaselineFile>(baselinePath);

      // Step 4: Initialize provider registry with API keys
      const registry = new ProviderRegistry();
      const providerNames: EvalProvider[] = [
        ...tierConfig.models.map((m) => m.provider),
        tierConfig.summarizer.provider,
      ];
      registerProviders(registry, providerNames, options.mode);

      // Step 5: Create BenchmarkRunner with tier config
      const evaluator = createEvaluatorForDataset(tierConfig.datasets[0].name);
      const runner = new BenchmarkRunner({
        mode: options.mode,
        registry,
        models: tierConfig.models,
        strategies: tierConfig.strategies,
        evaluator,
        summarizer: tierConfig.summarizer,
        requestDelayMs: tierConfig.requestDelayMs,
      });

      // Step 6: Create RegressionDetector and run evaluation
      const detector = new RegressionDetector(tierConfig, baseline, runner);
      process.stderr.write(`Running ${tier} regression evaluation...\n`);

      const result = await detector.evaluate({
        onProgress: (progress) => {
          const status = progress.skipped ? 'skipped' : 'done';
          process.stderr.write(
            `[${progress.completed}/${progress.total}] ${progress.questionId} ${status}\n`,
          );
        },
      });

      // Step 7: Generate Markdown report
      const report = createRegressionReport(result);

      // Step 8: Write report to file
      await writeTextFile(options.report, report);
      process.stderr.write(`Report written to ${options.report}\n`);

      // Step 9: Write raw results to file (if --output specified)
      if (options.output) {
        await writeJsonFile(options.output, result);
        process.stderr.write(`Raw results written to ${options.output}\n`);
      }

      // Step 10: Exit with appropriate code
      if (result.passed) {
        process.stderr.write('Regression evaluation PASSED.\n');
        process.exit(0);
      } else {
        process.stderr.write('Regression evaluation FAILED.\n');
        process.exit(1);
      }
    });

  return command;
}
