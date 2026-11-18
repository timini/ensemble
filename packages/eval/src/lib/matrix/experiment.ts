/**
 * The settings of a matrix run that change its results. A run id resumes
 * only with the same settings, so results measured under one configuration
 * are never published under another. Routing, timeouts and retries are left
 * out: a repair pass may change them, and the manifest records them.
 */
import { parseMatrixConfig, type MatrixConfig, type MatrixModel } from './config.js';

export interface MatrixExperiment {
  questionSeed: number;
  optionSeed: number;
  protocol: string;
  temperature: number;
  summarizer: string;
  models: string[];
  ensembleStrategies: string[];
  reference: string;
}

const specOf = (model: MatrixModel) => model.spec;

/** The result-affecting settings of a parsed config. */
export function experimentOf(config: MatrixConfig): MatrixExperiment {
  return {
    questionSeed: config.questionSeed,
    optionSeed: config.optionSeed,
    protocol: config.protocol,
    temperature: config.temperature,
    summarizer: specOf(config.summarizer),
    models: config.models.map(specOf),
    ensembleStrategies: [...config.ensembleStrategies],
    reference: specOf(config.reference),
  };
}

/**
 * The settings an existing run started with: the recorded experiment, or
 * for a run made before it was recorded, the experiment of its stored
 * config. Null when neither can be read.
 */
export function recordedExperiment(
  manifest: { experiment?: unknown; config?: unknown },
  current: MatrixConfig,
): MatrixExperiment | null {
  if (manifest.experiment && typeof manifest.experiment === 'object') {
    return manifest.experiment as MatrixExperiment;
  }
  if (manifest.config === undefined) return null;
  try {
    return experimentOf(parseMatrixConfig(manifest.config, { sample: current.sample, datasets: current.datasets }));
  } catch {
    return null;
  }
}

/** Names of the settings that differ, in a stable order. */
export function experimentDifferences(before: MatrixExperiment, after: MatrixExperiment): string[] {
  return (Object.keys(after) as (keyof MatrixExperiment)[]).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

/** One line per differing setting: `optionSeed (run: 1729, now: 7)`. */
export function describeDifferences(
  before: MatrixExperiment,
  after: MatrixExperiment,
  fields: string[],
): string {
  return fields
    .map((key) => {
      const k = key as keyof MatrixExperiment;
      return `${key} (run: ${JSON.stringify(before[k])}, now: ${JSON.stringify(after[k])})`;
    })
    .join('; ');
}
