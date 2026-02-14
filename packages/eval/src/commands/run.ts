import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { parseStrategies, generateConsensus } from '../lib/consensus.js';
import { writeJsonFile } from '../lib/io.js';
import { parseModelSpecs } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { runPromptWithModels } from '../lib/runPrompt.js';
import type { EvalMode, PromptRunResult } from '../types.js';

interface RunCommandOptions {
  models: string[];
  strategy?: string[];
  mode: EvalMode;
  output?: string;
}

export function createRunCommand(): Command {
  const command = new Command('run');
  command
    .description('Run one prompt against multiple models and optional consensus strategies.')
    .argument('<prompt>', 'Prompt to run')
    .requiredOption(
      '--models <models...>',
      'Model specs in provider:model format (e.g. openai:gpt-4o). Supports comma-separated values.',
    )
    .option(
      '--strategy <strategies...>',
      'Consensus strategies (standard, elo). Supports comma-separated values.',
    )
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'mock')
    .option('--output <file>', 'Write full run output as JSON')
    .action(async (prompt: string, options: RunCommandOptions) => {
      const models = parseModelSpecs(options.models);
      const strategies = parseStrategies(options.strategy ?? ['standard']);
      const mode = options.mode;

      const registry = ProviderRegistry.getInstance();
      registerProviders(
        registry,
        models.map((model) => model.provider),
        mode,
      );

      const responses = await runPromptWithModels(registry, mode, prompt, models);
      const firstSuccessful = responses.find((response) => !response.error);
      const consensus = firstSuccessful
        ? await generateConsensus(
            strategies,
            prompt,
            responses,
            registry.getProvider(firstSuccessful.provider, mode),
            firstSuccessful.model,
          )
        : {};

      const result: PromptRunResult = { prompt, responses, consensus };

      if (options.output) {
        await writeJsonFile(options.output, result);
      }

      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    });

  return command;
}
