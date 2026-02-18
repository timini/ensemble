import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import {
  assertValidResumedOutput,
  createBenchmarkFile,
} from './benchmarkOutput.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { parseStrategies } from '../lib/consensus.js';
import { createEvaluatorForDataset, type JudgeConfig } from '../lib/evaluators.js';
import { fileExists, readJsonFile } from '../lib/io.js';
import { parseModelSpec, parseModelSpecs } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import type { BenchmarkResultsFile, EvalMode } from '../types.js';

interface BenchmarkCommandOptions {
  models: string[];
  strategies?: string[];
  sample: string;
  output: string;
  resume?: boolean;
  mode: EvalMode;
  summarizer?: string;
  requestDelayMs?: string;
  temperature?: string;
  skipDownload?: boolean;
  forceDownload?: boolean;
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
      'Consensus strategies (standard, elo, majority). Supports comma-separated values.',
    )
    .option('--sample <count>', 'Number of prompts to evaluate.', '10')
    .requiredOption('--output <file>', 'Output JSON file')
    .option('--resume', 'Resume from an existing output file if present')
    .option(
      '--summarizer <provider:model>',
      'Optional explicit summarizer model (provider:model). Defaults to first successful response model.',
    )
    .option(
      '--request-delay-ms <ms>',
      'Optional delay in milliseconds between starting model calls.',
      '0',
    )
    .option(
      '--temperature <value>',
      'Temperature for model responses (e.g. 0 for deterministic).',
    )
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'mock')
    .option(
      '--skip-download',
      'Error if dataset is not cached (do not attempt network access). Useful for CI.',
    )
    .option(
      '--force-download',
      'Re-download dataset even if cache exists.',
    )
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
      const requestDelayMs = Number.parseInt(options.requestDelayMs ?? '0', 10);
      if (!Number.isInteger(requestDelayMs) || requestDelayMs < 0) {
        throw new Error(`Invalid request delay "${options.requestDelayMs}".`);
      }
      const temperature = options.temperature !== undefined
        ? Number.parseFloat(options.temperature)
        : undefined;
      if (temperature !== undefined && Number.isNaN(temperature)) {
        throw new Error(`Invalid temperature "${options.temperature}".`);
      }

      const { datasetName, questions } = await loadBenchmarkQuestions(dataset, {
        sample: sampleCount,
        skipDownload: options.skipDownload,
        forceDownload: options.forceDownload,
      });
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

      const registry = new ProviderRegistry();
      registerProviders(
        registry,
        [
          ...models.map((model) => model.provider),
          ...(summarizer ? [summarizer.provider] : []),
        ],
        options.mode,
      );

      let judgeConfig: JudgeConfig | undefined;
      const judgeSpec = summarizer ?? models[0];
      if (judgeSpec) {
        try {
          judgeConfig = {
            provider: registry.getProvider(judgeSpec.provider, options.mode),
            model: judgeSpec.model,
          };
        } catch {
          // Judge unavailable
        }
      }
      const evaluator = createEvaluatorForDataset(datasetName, judgeConfig);

      const runner = new BenchmarkRunner({
        mode: options.mode,
        registry,
        models,
        strategies,
        evaluator,
        summarizer,
        requestDelayMs,
        temperature,
      });
      await runner.run({
        questions,
        outputPath: options.output,
        output,
        onProgress: (progress) => {
          const status = progress.skipped ? 'skipped' : 'done';
          process.stdout.write(
            `[${progress.completed}/${progress.total}] ${progress.questionId} ${status}\n`,
          );
        },
      });

      process.stdout.write(
        `Benchmark completed. ${output.runs.length} prompt(s) written to ${options.output}\n`,
      );
    });

  return command;
}
