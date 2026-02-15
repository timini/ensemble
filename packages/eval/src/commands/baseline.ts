import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { evaluateResponses } from '../lib/evaluation.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { writeJsonFile } from '../lib/io.js';
import { parseModelSpec } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { EnsembleRunner } from '../lib/ensembleRunner.js';
import { buildSelfConsistencyResult } from '../lib/selfConsistency.js';
import type { BaselineResultsFile, EvalMode, PromptRunResult } from '../types.js';

interface BaselineCommandOptions {
  model: string;
  samples: string;
  output: string;
  mode: EvalMode;
  requestDelayMs?: string;
  selfConsistencyRuns?: string;
}

export function createBaselineCommand(): Command {
  const command = new Command('baseline');
  command
    .description('Run a baseline benchmark for one model against a dataset.')
    .argument(
      '<dataset>',
      'Dataset alias (gsm8k, truthfulqa, gpqa) or path to dataset JSON (array of prompts or {prompt} objects)',
    )
    .requiredOption('--model <model>', 'Model spec in provider:model format.')
    .option('--samples <count>', 'Number of prompts to evaluate.', '10')
    .option('--output <file>', 'Output JSON file path.', 'eval-baseline-results.json')
    .option(
      '--self-consistency-runs <count>',
      'Run the same model multiple times and record majority-vote self-consistency.',
      '1',
    )
    .option(
      '--request-delay-ms <ms>',
      'Optional delay in milliseconds between starting model calls.',
      '0',
    )
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'mock')
    .action(async (dataset: string, options: BaselineCommandOptions) => {
      const modelSpec = parseModelSpec(options.model);
      const sampleCount = Number.parseInt(options.samples, 10);
      if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
        throw new Error(`Invalid sample count "${options.samples}".`);
      }
      const selfConsistencyRuns = Number.parseInt(
        options.selfConsistencyRuns ?? '1',
        10,
      );
      if (!Number.isInteger(selfConsistencyRuns) || selfConsistencyRuns <= 0) {
        throw new Error(
          `Invalid self-consistency run count "${options.selfConsistencyRuns}".`,
        );
      }
      const requestDelayMs = Number.parseInt(options.requestDelayMs ?? '0', 10);
      if (!Number.isInteger(requestDelayMs) || requestDelayMs < 0) {
        throw new Error(`Invalid request delay "${options.requestDelayMs}".`);
      }

      const { datasetName, questions } = await loadBenchmarkQuestions(dataset, {
        sample: sampleCount,
      });
      const evaluator = createEvaluatorForDataset(datasetName);

      const registry = new ProviderRegistry();
      registerProviders(registry, [modelSpec.provider], options.mode);
      const ensembleRunner = new EnsembleRunner(registry, options.mode, {
        requestDelayMs,
      });

      const runs: PromptRunResult[] = [];
      const repeatedModelSpecs = Array.from(
        { length: selfConsistencyRuns },
        () => modelSpec,
      );
      for (const question of questions) {
        const responses = await ensembleRunner.runPrompt(
          question.prompt,
          repeatedModelSpecs,
        );

        const evaluation = await evaluateResponses(
          evaluator,
          responses,
          question.groundTruth,
          question.prompt,
        );

        runs.push({
          questionId: question.id,
          prompt: question.prompt,
          groundTruth: question.groundTruth,
          responses,
          consensus: {},
          evaluation,
          selfConsistency: buildSelfConsistencyResult({
            runCount: selfConsistencyRuns,
            responses,
            evaluation,
          }),
        });
      }

      const now = new Date().toISOString();
      const output: BaselineResultsFile = {
        type: 'baseline',
        dataset,
        mode: options.mode,
        model: options.model,
        sampleSize: questions.length,
        createdAt: now,
        updatedAt: now,
        runs,
      };

      await writeJsonFile(options.output, output);
      process.stdout.write(
        `Baseline completed. Evaluated ${questions.length} prompt(s). Output: ${options.output}\n`,
      );
    });

  return command;
}
