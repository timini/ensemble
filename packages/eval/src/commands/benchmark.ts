import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import {
  assertValidResumedOutput,
  createBenchmarkFile,
} from './benchmarkOutput.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { generateConsensus, parseStrategies } from '../lib/consensus.js';
import { evaluateResponses } from '../lib/evaluation.js';
import { createEvaluatorForDataset } from '../lib/evaluators.js';
import { fileExists, readJsonFile, writeJsonFile } from '../lib/io.js';
import { parseModelSpec, parseModelSpecs } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { runPromptWithModels } from '../lib/runPrompt.js';
import type {
  BenchmarkResultsFile,
  EvalMode,
  PromptRunResult,
} from '../types.js';

interface BenchmarkCommandOptions {
  models: string[];
  strategies?: string[];
  sample: string;
  output: string;
  resume?: boolean;
  mode: EvalMode;
  summarizer?: string;
}

export function createBenchmarkCommand(): Command {
  const command = new Command('benchmark');
  command
    .description('Run benchmark prompts across multiple models and consensus strategies.')
    .argument(
      '<dataset>',
      'Dataset alias (gsm8k, truthfulqa, gpqa) or path to dataset JSON (array of prompts or {prompt} objects)',
    )
    .requiredOption(
      '--models <models...>',
      'Model specs in provider:model format. Supports comma-separated values.',
    )
    .option(
      '--strategies <strategies...>',
      'Consensus strategies (standard, elo). Supports comma-separated values.',
    )
    .option('--sample <count>', 'Number of prompts to evaluate.', '10')
    .requiredOption('--output <file>', 'Output JSON file')
    .option('--resume', 'Resume from an existing output file if present')
    .option(
      '--summarizer <provider:model>',
      'Optional explicit summarizer model (provider:model). Defaults to first successful response model.',
    )
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'mock')
    .action(async (dataset: string, options: BenchmarkCommandOptions) => {
      const models = parseModelSpecs(options.models);
      const modelStrings = models.map((model) => `${model.provider}:${model.model}`);
      const strategies = parseStrategies(options.strategies ?? ['standard']);
      const summarizer = options.summarizer
        ? parseModelSpec(options.summarizer)
        : null;

      const sampleCount = Number.parseInt(options.sample, 10);
      if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
        throw new Error(`Invalid sample count "${options.sample}".`);
      }

      const { datasetName, questions } = await loadBenchmarkQuestions(dataset, {
        sample: sampleCount,
      });
      const evaluator = createEvaluatorForDataset(datasetName);

      let output: BenchmarkResultsFile = createBenchmarkFile(
        dataset,
        options.mode,
        modelStrings,
        strategies,
        questions.length,
      );

      if (options.resume && (await fileExists(options.output))) {
        const parsed = await readJsonFile<unknown>(options.output);
        assertValidResumedOutput(options.output, parsed, {
          dataset,
          mode: options.mode,
          models: modelStrings,
          strategies,
          sampleSize: questions.length,
        });
        output = parsed;
      }

      const completedPrompts = new Set(output.runs.map((run) => run.prompt));
      const registry = new ProviderRegistry();
      registerProviders(
        registry,
        [
          ...models.map((model) => model.provider),
          ...(summarizer ? [summarizer.provider] : []),
        ],
        options.mode,
      );

      for (const question of questions) {
        const prompt = question.prompt;
        if (completedPrompts.has(prompt)) {
          continue;
        }

        const responses = await runPromptWithModels(
          registry,
          options.mode,
          prompt,
          models,
        );

        const firstSuccessful = responses.find((response) => !response.error);
        const summarizerTarget = summarizer
          ? summarizer
          : firstSuccessful
            ? { provider: firstSuccessful.provider, model: firstSuccessful.model }
            : null;
        const consensus = summarizerTarget
          ? await generateConsensus(
              strategies,
              prompt,
              responses,
              registry.getProvider(summarizerTarget.provider, options.mode),
              summarizerTarget.model,
            )
          : {};

        const evaluation = await evaluateResponses(
          evaluator,
          responses,
          question.groundTruth,
          question.prompt,
        );

        const run: PromptRunResult = {
          questionId: question.id,
          prompt,
          groundTruth: question.groundTruth,
          responses,
          consensus,
          evaluation,
        };
        output.runs.push(run);
        output.updatedAt = new Date().toISOString();
        await writeJsonFile(options.output, output);
      }

      process.stdout.write(
        `Benchmark completed. ${output.runs.length} prompt(s) written to ${options.output}\n`,
      );
    });

  return command;
}
