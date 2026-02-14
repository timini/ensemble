import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { loadDatasetPrompts } from '../lib/dataset.js';
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
    .argument('<dataset>', 'Path to dataset JSON (array of prompts or {prompt} objects)')
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

      const prompts = await loadDatasetPrompts(dataset);
      const sampledPrompts = prompts.slice(0, sampleCount);

      const registry = ProviderRegistry.getInstance();
      registerProviders(registry, [modelSpec.provider], options.mode);

      const runs: PromptRunResult[] = [];
      for (const prompt of sampledPrompts) {
        const responses = await runPromptWithModels(
          registry,
          options.mode,
          prompt,
          [modelSpec],
        );
        runs.push({ prompt, responses, consensus: {} });
      }

      const now = new Date().toISOString();
      const output: BaselineResultsFile = {
        type: 'baseline',
        dataset,
        mode: options.mode,
        model: options.model,
        sampleSize: sampledPrompts.length,
        createdAt: now,
        updatedAt: now,
        runs,
      };

      await writeJsonFile(options.output, output);
      process.stdout.write(
        `Baseline completed. Evaluated ${sampledPrompts.length} prompt(s). Output: ${options.output}\n`,
      );
    });

  return command;
}
