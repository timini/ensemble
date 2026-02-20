import type { EvalProvider, ModelSpec } from '../types.js';

const VALID_PROVIDERS: EvalProvider[] = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'];
const VALID_PROVIDER_SET = new Set<EvalProvider>(VALID_PROVIDERS);

export function explodeList(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function parseModelSpec(value: string): ModelSpec {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new Error(
      `Invalid model spec "${value}". Expected "provider:model", e.g. "openai:gpt-4o".`,
    );
  }

  const provider = value.slice(0, separatorIndex).trim() as EvalProvider;
  const model = value.slice(separatorIndex + 1).trim();

  if (!VALID_PROVIDER_SET.has(provider)) {
    throw new Error(
      `Invalid provider "${provider}". Expected one of: ${VALID_PROVIDERS.join(', ')}.`,
    );
  }

  if (!model) {
    throw new Error(`Model ID is missing in model spec "${value}".`);
  }

  return { provider, model };
}

export function parseModelSpecs(values: string[]): ModelSpec[] {
  const items = explodeList(values).map(parseModelSpec);
  if (items.length === 0) {
    throw new Error('At least one model must be provided via --models.');
  }
  return items;
}
