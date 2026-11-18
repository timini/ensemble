import { Command } from 'commander';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { evaluateResponses } from '../lib/evaluation.js';
import {
  assertIndependentJudge, createEvaluatorForDataset, datasetNeedsJudge, type JudgeConfig,
} from '../lib/evaluators.js';
import { writeJsonFile } from '../lib/io.js';
import { endpointsOf, parseModelSpec } from '../lib/modelSpecs.js';
import { prepareQuestions } from '../lib/methodology.js';
import {
  DEFAULT_SAMPLE_FREE, DEFAULT_SAMPLE_MOCK, QUESTION_SEED, resolveSampleSize, sampleSizeWarning,
} from '../lib/evalDefaults.js';
import { registerProviders } from '../lib/providers.js';
import { EnsembleRunner } from '../lib/ensembleRunner.js';
import { buildSelfConsistencyResult } from '../lib/selfConsistency.js';
import type { BaselineResultsFile, EvalMode, PromptRunResult } from '../types.js';

interface BaselineCommandOptions {
  model: string;
  samples?: string;
  judge?: string;
  allowSameJudge?: boolean;
  output: string;
  mode: EvalMode;
  requestDelayMs?: string;
  selfConsistencyRuns?: string;
  temperature?: string;
  skipDownload?: boolean;
  forceDownload?: boolean;
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
    .option(
      '--samples <count>',
      `Number of prompts to evaluate (default ${DEFAULT_SAMPLE_FREE} in free mode, ${DEFAULT_SAMPLE_MOCK} in mock mode).`,
    )
    .option('--judge <spec>', 'Judge model for datasets that still need one (simpleqa, hle).')
    .option('--allow-same-judge', 'Allow the judge to be the model under test (biased; off by default).')
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
    .action(async (dataset: string, options: BaselineCommandOptions) => {
      const modelSpec = parseModelSpec(options.model);
      const sampleCount = resolveSampleSize(options.samples, options.mode);
      const warning = sampleSizeWarning(sampleCount, options.mode);
      if (warning) process.stderr.write(`Warning: ${warning}\n`);
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
      const questions = prepareQuestions(datasetName, loaded.questions, { protocol: 'structured' });

      // A judge is only needed for free-text datasets, and must not be the model under test.
      const needsJudge = datasetName !== null && datasetNeedsJudge(datasetName, 'structured');
      const judgeSpec = needsJudge && options.judge ? parseModelSpec(options.judge) : null;
      if (needsJudge) {
        if (!judgeSpec && !options.allowSameJudge) {
          throw new Error(`${datasetName} needs an LLM judge. Pass --judge with a model other than --model.`);
        }
        assertIndependentJudge(judgeSpec ?? modelSpec, [modelSpec], { allowSameModel: options.allowSameJudge });
      }

      const endpoints = endpointsOf([modelSpec, judgeSpec]);
      const registry = new ProviderRegistry();
      registerProviders(
        registry,
        judgeSpec ? [modelSpec.provider, judgeSpec.provider] : [modelSpec.provider],
        options.mode,
        endpoints,
      );

      let judgeConfig: JudgeConfig | undefined;
      if (needsJudge) {
        const spec = judgeSpec ?? modelSpec;
        judgeConfig = { provider: registry.getProvider(spec.provider, options.mode), model: spec.model };
      }
      const evaluator = createEvaluatorForDataset(datasetName, judgeConfig, { protocol: 'structured' });
      const ensembleRunner = new EnsembleRunner(registry, options.mode, {
        requestDelayMs,
        temperature,
        endpoints,
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
          question.answer ? { answer: question.answer } : {},
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
          category: question.category,
          difficulty: question.difficulty,
          responses,
          consensus: {},
          evaluation,
          answerProtocol: 'structured',
          ...(question.optionPermutation
            ? { optionPermutation: question.optionPermutation, optionSeed: question.optionSeed }
            : {}),
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
