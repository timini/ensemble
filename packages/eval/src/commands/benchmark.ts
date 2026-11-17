import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import {
  assertValidResumedOutput,
  createBenchmarkFile,
} from './benchmarkOutput.js';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { parseStrategies } from '../lib/consensus.js';
import {
  assertIndependentJudge,
  createEvaluatorForDataset,
  datasetNeedsJudge,
  type JudgeConfig,
} from '../lib/evaluators.js';
import { fileExists, readJsonFile } from '../lib/io.js';
import { endpointsOf, formatModelSpec, parseModelSpec, parseModelSpecs, sameModel } from '../lib/modelSpecs.js';
import { registerProviders } from '../lib/providers.js';
import { BenchmarkRunner } from '../lib/benchmarkRunner.js';
import { DEFAULT_OPTION_SEED, prepareQuestions, type AnswerProtocol } from '../lib/methodology.js';
import {
  DEFAULT_SAMPLE_FREE, DEFAULT_SAMPLE_MOCK, QUESTION_SEED, resolveSampleSize, sampleSizeWarning,
} from '../lib/evalDefaults.js';
import type { BenchmarkResultsFile, EvalMode, ModelSpec } from '../types.js';

const PROTOCOLS: AnswerProtocol[] = ['structured', 'legacy'];

interface BenchmarkCommandOptions {
  models: string[];
  strategies?: string[];
  sample?: string;
  output: string;
  judge?: string;
  allowSameJudge?: boolean;
  protocol: string;
  optionSeed: string;
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
    .option(
      '--sample <count>',
      `Number of prompts to evaluate (default ${DEFAULT_SAMPLE_FREE} in free mode, ${DEFAULT_SAMPLE_MOCK} in mock mode).`,
    )
    .requiredOption('--output <file>', 'Output JSON file')
    .option('--resume', 'Resume from an existing output file if present')
    .option(
      '--summarizer <provider:model>',
      'Optional explicit summarizer model (provider:model). Defaults to first successful response model.',
    )
    .option(
      '--judge <spec>',
      'Judge model for datasets that still need one (simpleqa, hle). Must differ from the --models.',
    )
    .option('--allow-same-judge', 'Allow a judge that is also one of the --models (biased; off by default).')
    .option(
      '--protocol <protocol>',
      'Answer protocol: structured (shuffled options, structured final answers, mechanical scoring) or legacy.',
      'structured',
    )
    .option('--option-seed <seed>', 'Seed for shuffling multiple-choice options.', String(DEFAULT_OPTION_SEED))
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
      const modelStrings = models.map(formatModelSpec);
      const strategies = parseStrategies(options.strategies ?? ['standard']);
      const summarizer = options.summarizer
        ? parseModelSpec(options.summarizer)
        : null;
      const judgeSpec = options.judge ? parseModelSpec(options.judge) : null;
      const protocol = options.protocol as AnswerProtocol;
      if (!PROTOCOLS.includes(protocol)) {
        throw new Error(`Invalid protocol "${options.protocol}". Expected one of: ${PROTOCOLS.join(', ')}.`);
      }
      const optionSeed = Number.parseInt(options.optionSeed, 10);
      if (!Number.isInteger(optionSeed)) {
        throw new Error(`Invalid option seed "${options.optionSeed}".`);
      }

      const sampleCount = resolveSampleSize(options.sample, options.mode);
      const warning = sampleSizeWarning(sampleCount, options.mode);
      if (warning) process.stderr.write(`Warning: ${warning}\n`);
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

      const loaded = await loadBenchmarkQuestions(dataset, {
        sample: sampleCount,
        seed: QUESTION_SEED,
        ...(options.skipDownload ? { skipDownload: true } : {}),
        ...(options.forceDownload ? { forceDownload: true } : {}),
      });
      const datasetName = loaded.datasetName;
      const questions = prepareQuestions(datasetName, loaded.questions, { protocol, optionSeed });
      let output: BenchmarkResultsFile = createBenchmarkFile(
        dataset,
        options.mode,
        modelStrings,
        strategies,
        questions.length,
      );
      if (output) {
        output.answerProtocol = protocol;
        if (protocol === 'structured') output.optionSeed = optionSeed;
      }

      if (options.resume && (await fileExists(options.output))) {
        const parsed = await readJsonFile<unknown>(options.output);
        assertValidResumedOutput(options.output, parsed, {
          dataset,
          mode: options.mode,
          models: modelStrings,
          strategies,
          sampleSize: questions.length,
        });
        const resumedProtocol = parsed.answerProtocol ?? 'legacy';
        if (resumedProtocol !== protocol) {
          throw new Error(
            `Cannot resume ${options.output}: it was run with the ${resumedProtocol} protocol, not ${protocol}.`,
          );
        }
        output = parsed;
      }

      const judge = datasetName && datasetNeedsJudge(datasetName, protocol)
        ? chooseJudge(judgeSpec, summarizer, models, Boolean(options.allowSameJudge))
        : null;

      const allSpecs = [...models, summarizer, judge];
      const endpoints = endpointsOf(allSpecs);
      const registry = new ProviderRegistry();
      registerProviders(
        registry,
        allSpecs.filter((spec): spec is ModelSpec => spec !== null).map((spec) => spec.provider),
        options.mode,
        endpoints,
      );

      const judgeConfig: JudgeConfig | undefined = judge
        ? { provider: registry.getProvider(judge.provider, options.mode), model: judge.model }
        : undefined;
      const evaluator = createEvaluatorForDataset(datasetName, judgeConfig, { protocol });

      const runner = new BenchmarkRunner({
        mode: options.mode,
        registry,
        models,
        strategies,
        evaluator,
        summarizer,
        requestDelayMs,
        temperature,
        protocol,
        endpoints,
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

/**
 * The judge for datasets that still need one: --judge, or else the
 * summarizer when it is not one of the generators. A judge that is also a
 * generator is refused unless --allow-same-judge is set.
 */
function chooseJudge(
  judge: ModelSpec | null,
  summarizer: ModelSpec | null,
  models: ModelSpec[],
  allowSameModel: boolean,
): ModelSpec {
  const candidate = judge ?? (summarizer && !models.some((m) => sameModel(m, summarizer)) ? summarizer : null);
  if (!candidate) {
    if (allowSameModel) return summarizer ?? models[0];
    throw new Error(
      'This dataset needs an LLM judge. Pass --judge with a model that is not one of the --models.',
    );
  }
  assertIndependentJudge(candidate, models, { allowSameModel });
  return candidate;
}
