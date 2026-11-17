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
  questionTimeoutMs: number;
}

export interface MatrixOverrides {
  sample?: number;
  datasets?: string[];
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
  return { id: str(entry, 'id'), label: str(entry, 'label'), spec, parsed: parseModelSpec(spec) };
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
    questionTimeoutMs: int(config, 'questionTimeoutMs', 300_000, 1),
  };
}

/** Key of a model in a run's evaluation results (`openai-compatible:openrouter/qwen/qwen3.5-9b`). */
export function resultKeyOf(model: Pick<MatrixModel, 'parsed'>): string {
  return `${model.parsed.provider}:${model.parsed.model}`;
}
