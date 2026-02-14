import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { generateConsensus, parseStrategies } from '../lib/consensus.js';
import { loadDatasetPrompts } from '../lib/dataset.js';
import { fileExists, readJsonFile, writeJsonFile } from '../lib/io.js';
import { parseModelSpec, parseModelSpecs } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { runPromptWithModels } from '../lib/runPrompt.js';
import type {
  BenchmarkResultsFile,
  EvalMode,
  PromptRunResult,
  StrategyName,
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

interface ResumeValidationOptions {
  dataset: string;
  mode: EvalMode;
  models: string[];
  strategies: StrategyName[];
  sampleSize: number;
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}

function assertValidResumedOutput(
  outputPath: string,
  parsed: unknown,
  options: ResumeValidationOptions,
): asserts parsed is BenchmarkResultsFile {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(
      `Resumed file "${outputPath}" does not contain a valid "runs" array.`,
    );
  }

  const candidate = parsed as Partial<BenchmarkResultsFile>;
  if (!Array.isArray(candidate.runs)) {
    throw new Error(
      `Resumed file "${outputPath}" does not contain a valid "runs" array.`,
    );
  }

  const mismatches: string[] = [];
  if (candidate.dataset !== options.dataset) {
    mismatches.push(
      `dataset (file: ${candidate.dataset}, new: ${options.dataset})`,
    );
  }
  if (candidate.mode !== options.mode) {
    mismatches.push(`mode (file: ${candidate.mode}, new: ${options.mode})`);
  }
  if (
    !Array.isArray(candidate.models) ||
    JSON.stringify(sorted(candidate.models)) !== JSON.stringify(sorted(options.models))
  ) {
    mismatches.push('models');
  }
  if (
    !Array.isArray(candidate.strategies) ||
    JSON.stringify(sorted(candidate.strategies)) !==
      JSON.stringify(sorted(options.strategies))
  ) {
    mismatches.push('strategies');
  }
  if (candidate.sampleSize !== options.sampleSize) {
    mismatches.push(
      `sampleSize (file: ${candidate.sampleSize}, new: ${options.sampleSize})`,
    );
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Cannot resume benchmark with different parameters: ${mismatches.join('; ')}`,
    );
  }
}

function createBenchmarkFile(
  dataset: string,
  mode: EvalMode,
  models: string[],
  strategies: StrategyName[],
  sampleSize: number,
): BenchmarkResultsFile {
  const now = new Date().toISOString();
  return {
    type: 'benchmark',
    dataset,
    mode,
    models,
    strategies,
    sampleSize,
    createdAt: now,
    updatedAt: now,
    runs: [],
  };
}

export function createBenchmarkCommand(): Command {
  const command = new Command('benchmark');
  command
    .description('Run benchmark prompts across multiple models and consensus strategies.')
    .argument('<dataset>', 'Path to dataset JSON (array of prompts or {prompt} objects)')
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

      const prompts = await loadDatasetPrompts(dataset);
      const sampledPrompts = prompts.slice(0, sampleCount);

      let output: BenchmarkResultsFile = createBenchmarkFile(
        dataset,
        options.mode,
        modelStrings,
        strategies,
        sampledPrompts.length,
      );

      if (options.resume && (await fileExists(options.output))) {
        const parsed = await readJsonFile<unknown>(options.output);
        assertValidResumedOutput(options.output, parsed, {
          dataset,
          mode: options.mode,
          models: modelStrings,
          strategies,
          sampleSize: sampledPrompts.length,
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

      for (const prompt of sampledPrompts) {
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

        const run: PromptRunResult = { prompt, responses, consensus };
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
