import type { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import type { EvalMode, ModelSpec, ProviderResponse } from '../types.js';
import { EnsembleRunner } from './ensembleRunner.js';

export async function runPromptWithModels(
  registry: ProviderRegistry,
  mode: EvalMode,
  prompt: string,
  models: ModelSpec[],
  options?: { requestDelayMs?: number },
): Promise<ProviderResponse[]> {
  const runner = new EnsembleRunner(registry, mode, options);
  return runner.runPrompt(prompt, models);
}
