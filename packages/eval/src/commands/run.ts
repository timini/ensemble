import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { parseStrategies, generateConsensus } from '../lib/consensus.js';
import { writeJsonFile } from '../lib/io.js';
import { parseModelSpec, parseModelSpecs } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { EnsembleRunner } from '../lib/ensembleRunner.js';
import type { EvalMode, PromptRunResult } from '../types.js';

interface RunCommandOptions {
  models: string[];
  strategy?: string[];
  mode: EvalMode;
  output?: string;
  summarizer?: string;
  requestDelayMs?: string;
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
      'Consensus strategies (standard, elo, majority). Supports comma-separated values.',
    )
    .option(
      '--summarizer <provider:model>',
      'Optional explicit summarizer model (provider:model). Defaults to first successful response model.',
    )
    .option(
      '--request-delay-ms <ms>',
      'Optional delay in milliseconds between starting model calls.',
      '0',
    )
    .option('--mode <mode>', 'Provider mode to use (mock or free)', 'mock')
    .option('--output <file>', 'Write full run output as JSON')
    .action(async (prompt: string, options: RunCommandOptions) => {
      const models = parseModelSpecs(options.models);
      const strategies = parseStrategies(options.strategy ?? ['standard']);
      const mode = options.mode;
      const summarizer = options.summarizer
        ? parseModelSpec(options.summarizer)
        : null;
      const requestDelayMs = Number.parseInt(options.requestDelayMs ?? '0', 10);
      if (!Number.isInteger(requestDelayMs) || requestDelayMs < 0) {
        throw new Error(`Invalid request delay "${options.requestDelayMs}".`);
      }

      const registry = new ProviderRegistry();
      registerProviders(
        registry,
        [
          ...models.map((model) => model.provider),
          ...(summarizer ? [summarizer.provider] : []),
        ],
        mode,
      );

      const runner = new EnsembleRunner(registry, mode, { requestDelayMs });
      const responses = await runner.runPrompt(prompt, models);
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
            registry.getProvider(summarizerTarget.provider, mode),
            summarizerTarget.model,
          )
        : {};

      const result: PromptRunResult = { prompt, responses, consensus };

      if (options.output) {
        await writeJsonFile(options.output, result);
        process.stdout.write(`Run completed. Output written to ${options.output}\n`);
        return;
      }

      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    });

  return command;
}
