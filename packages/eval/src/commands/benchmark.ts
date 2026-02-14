import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { generateConsensus, parseStrategies } from '../lib/consensus.js';
import { loadDatasetPrompts } from '../lib/dataset.js';
import { fileExists, readJsonFile, writeJsonFile } from '../lib/io.js';
import { parseModelSpecs } from '../lib/modelSpecs.js';
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
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'mock')
    .action(async (dataset: string, options: BenchmarkCommandOptions) => {
      const models = parseModelSpecs(options.models);
      const modelStrings = models.map((model) => `${model.provider}:${model.model}`);
      const strategies = parseStrategies(options.strategies ?? ['standard']);

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
        output = await readJsonFile<BenchmarkResultsFile>(options.output);
      }

      const completedPrompts = new Set(output.runs.map((run) => run.prompt));
      const registry = ProviderRegistry.getInstance();
      registerProviders(
        registry,
        models.map((model) => model.provider),
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
        const consensus = firstSuccessful
          ? await generateConsensus(
              strategies,
              prompt,
              responses,
              registry.getProvider(firstSuccessful.provider, options.mode),
              firstSuccessful.model,
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
