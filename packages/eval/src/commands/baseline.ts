import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { writeJsonFile } from '../lib/io.js';
import { parseModelSpec } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { runPromptWithModels } from '../lib/runPrompt.js';
import type { BaselineResultsFile, EvalMode, PromptRunResult } from '../types.js';

interface BaselineCommandOptions {
  model: string;
  samples: string;
  output: string;
  mode: EvalMode;
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
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'mock')
    .action(async (dataset: string, options: BaselineCommandOptions) => {
      const modelSpec = parseModelSpec(options.model);
      const sampleCount = Number.parseInt(options.samples, 10);
      if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
        throw new Error(`Invalid sample count "${options.samples}".`);
      }

      const { datasetName, questions } = await loadBenchmarkQuestions(dataset, {
        sample: sampleCount,
      });
      const evaluator = createEvaluatorForDataset(datasetName);

      const registry = new ProviderRegistry();
      registerProviders(registry, [modelSpec.provider], options.mode);

      const runs: PromptRunResult[] = [];
      for (const question of questions) {
        const responses = await runPromptWithModels(
          registry,
          options.mode,
          question.prompt,
          [modelSpec],
        );

        const evaluation =
          evaluator && question.groundTruth.length > 0
            ? (() => {
                const response = responses[0];
                if (!response || response.error) {
                  return {
                    evaluator: evaluator.name,
                    groundTruth: question.groundTruth,
                    accuracy: 0,
                    results: {},
                  };
                }

                const key = `${response.provider}:${response.model}`;
                const result = evaluator.evaluate(response.content, question.groundTruth);
                return {
                  evaluator: evaluator.name,
                  groundTruth: question.groundTruth,
                  accuracy: result.correct ? 1 : 0,
                  results: { [key]: result },
                };
              })()
            : undefined;

        runs.push({
          questionId: question.id,
          prompt: question.prompt,
          groundTruth: question.groundTruth || undefined,
          responses,
          consensus: {},
          evaluation,
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
