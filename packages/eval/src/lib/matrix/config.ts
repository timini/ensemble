/**
 * The benchmark matrix config (packages/eval/bench/matrix.json): which
 * datasets, which open models, which ensemble strategies and which premium
 * reference. See docs/BENCHMARKS.md.
 */
import { resolveBenchmarkDatasetName } from '../benchmarkDatasetShared.js';
import { parseStrategies } from '../consensus.js';
import { parseModelSpec } from '../modelSpecs.js';
import type { AnswerProtocol } from '../methodology.js';
import type { BenchmarkDatasetName, ModelSpec, StrategyName } from '../../types.js';

export interface MatrixModel {
  /** Short id used in file names and configuration ids (`qwen`). */
  id: string;
  /** Display name (`Qwen3.5 9B`). */
  label: string;
  /** Model spec as written in the config (`openrouter:qwen/qwen3.5-9b`). */
  spec: string;
  parsed: ModelSpec;
  /**
   * OpenRouter host preferences for this model, sent as OpenRouter's
   * `provider` object (`{ "ignore": ["SomeHost"] }`, `{ "order": [...],
   * "allow_fallbacks": false }`). Used to avoid a host that returns empty
   * replies once the logs name it.
   */
  routing?: Record<string, unknown>;
}

export interface MatrixConfig {
  name: string;
  description: string;
  datasets: BenchmarkDatasetName[];
  sample: number;
  questionSeed: number;
  optionSeed: number;
  protocol: AnswerProtocol;
  temperature: number;
  /** The open models, each run alone and together as the ensemble. */
  models: MatrixModel[];
  /** Model that writes the standard consensus (one of `models`). */
  summarizer: MatrixModel;
  ensembleStrategies: StrategyName[];
  /** Premium model run once as a reference and cached. */
  reference: MatrixModel;
  budgetUsd: number;
  /**
   * Hard cap for one question, from when it gets a slot, retries and
   * consensus included. Model calls must end by this limit minus
   * consensusTimeoutMs and summarizer calls by the limit itself; a retry
   * that could not finish in time is not started, and a call still running
   * at its deadline is aborted and counts as wrong. Answers that came back
   * are kept. It must fit at least one model call and one summarizer call.
   */
  questionTimeoutMs: number;
  /** Limit for one model call; the request is aborted when it passes and the call is retried. */
  callTimeoutMs: number;
  /** Limit for one summarizer call (the standard consensus); aborted and retried like model calls. */
  consensusTimeoutMs: number;
  /** Retries per call for transient failures (network, 429, 5xx, timeouts, empty replies), within questionTimeoutMs. */
  maxRetries: number;
  /**
   * Ask OpenRouter to route structured calls only to hosts that honour
   * response_format (`provider.require_parameters`). Default true. Runs made
   * before 2026-11-17 evening did not send it; repair those with it off so
   * every entry of a run is routed the same way.
   */
  requireParameters: boolean;
}

export interface MatrixOverrides {
  sample?: number;
  datasets?: string[];
  requireParameters?: boolean;
}

type Raw = Record<string, unknown>;

function str(raw: Raw, key: string, fallback?: string): string {
  const value = raw[key] ?? fallback;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Matrix config: "${key}" must be a string.`);
  return value.trim();
}

function int(raw: Raw, key: string, fallback?: number, min = 0): number {
  const value = raw[key] ?? fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw new Error(`Matrix config: "${key}" must be an integer of at least ${min}.`);
  }
  return value;
}

function model(raw: unknown, where: string): MatrixModel {
  if (!raw || typeof raw !== 'object') throw new Error(`Matrix config: ${where} must be an object.`);
  const entry = raw as Raw;
  const spec = str(entry, 'spec');
  const routing = entry.routing;
  if (routing !== undefined && (!routing || typeof routing !== 'object' || Array.isArray(routing))) {
    throw new Error(`Matrix config: ${where}.routing must be an object (OpenRouter provider preferences).`);
  }
  return {
    id: str(entry, 'id'),
    label: str(entry, 'label'),
    spec,
    parsed: parseModelSpec(spec),
    ...(routing ? { routing: routing as Record<string, unknown> } : {}),
  };
}

function datasets(values: unknown): BenchmarkDatasetName[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Matrix config: "datasets" must be a non-empty list.');
  }
  return values.map((value) => {
    const name = typeof value === 'string' ? resolveBenchmarkDatasetName(value) : null;
    if (!name) throw new Error(`Matrix config: unknown dataset "${String(value)}".`);
    return name;
  });
}

/** Validate a parsed matrix.json, with command-line overrides applied. */
export function parseMatrixConfig(raw: unknown, overrides: MatrixOverrides = {}): MatrixConfig {
  if (!raw || typeof raw !== 'object') throw new Error('Matrix config must be a JSON object.');
  const config = raw as Raw;

  if (!Array.isArray(config.models) || config.models.length < 2) {
    throw new Error('Matrix config: "models" needs at least two models.');
  }
  const models = config.models.map((entry, i) => model(entry, `models[${i}]`));
  if (new Set(models.map((m) => m.id)).size !== models.length) {
    throw new Error('Matrix config: model ids must be unique.');
  }
  const summarizerId = str(config, 'summarizer', models[0]!.id);
  const summarizer = models.find((m) => m.id === summarizerId);
  if (!summarizer) throw new Error(`Matrix config: summarizer "${summarizerId}" is not one of the models.`);

  const protocol = str(config, 'protocol', 'structured');
  if (protocol !== 'structured' && protocol !== 'legacy') {
    throw new Error(`Matrix config: protocol must be structured or legacy, not "${protocol}".`);
  }
  const temperature = config.temperature ?? 0;
  if (typeof temperature !== 'number') throw new Error('Matrix config: "temperature" must be a number.');
  const strategies = config.ensembleStrategies;
  const budget = config.budgetUsd ?? 20;
  if (typeof budget !== 'number' || budget <= 0) throw new Error('Matrix config: "budgetUsd" must be positive.');

  const sample = overrides.sample ?? config.sample;
  if (typeof sample !== 'number' || !Number.isInteger(sample) || sample < 1) {
    throw new Error('Matrix config: "sample" must be a positive integer.');
  }

  return {
    name: str(config, 'name'),
    description: typeof config.description === 'string' ? config.description : '',
    datasets: datasets(overrides.datasets ?? config.datasets),
    sample,
    questionSeed: int(config, 'questionSeed', 42),
    optionSeed: int(config, 'optionSeed', 1729),
    protocol,
    temperature,
    models,
    summarizer,
    ensembleStrategies: parseStrategies(Array.isArray(strategies) ? strategies.map(String) : ['majority', 'standard']),
    reference: model(config.reference, 'reference'),
    budgetUsd: budget,
    ...timeouts(config),
    requireParameters: requireParameters(config, overrides),
  };
}

function requireParameters(config: Raw, overrides: MatrixOverrides): boolean {
  if (overrides.requireParameters !== undefined) return overrides.requireParameters;
  const value = config.requireParameters ?? true;
  if (typeof value !== 'boolean') throw new Error('Matrix config: "requireParameters" must be true or false.');
  return value;
}

function timeouts(config: Raw): Pick<MatrixConfig, 'questionTimeoutMs' | 'callTimeoutMs' | 'consensusTimeoutMs' | 'maxRetries'> {
  const callTimeoutMs = int(config, 'callTimeoutMs', 180_000, 1);
  const consensusTimeoutMs = int(config, 'consensusTimeoutMs', 300_000, 1);
  const questionTimeoutMs = int(config, 'questionTimeoutMs', 900_000, 1);
  if (questionTimeoutMs < callTimeoutMs + consensusTimeoutMs) {
    throw new Error(
      'Matrix config: "questionTimeoutMs" must be at least callTimeoutMs plus consensusTimeoutMs, '
      + 'or a question has no room for one model call and one summary. Retries fit in what is left.',
    );
  }
  return { questionTimeoutMs, callTimeoutMs, consensusTimeoutMs, maxRetries: int(config, 'maxRetries', 4, 0) };
}

/** Key of a model in a run's evaluation results (`openai-compatible:openrouter/qwen/qwen3.5-9b`). */
export function resultKeyOf(model: Pick<MatrixModel, 'parsed'>): string {
  return `${model.parsed.provider}:${model.parsed.model}`;
}
