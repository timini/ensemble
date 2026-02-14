import type { ModelModality, ProviderName } from '@ensemble-ai/shared-utils/providers';

const ALLOWED_MODALITIES: readonly ModelModality[] = ['text', 'image', 'audio', 'video'];

export function normalizeModelModalities(
  modalities: readonly string[] | undefined,
): ModelModality[] {
  const normalized = (modalities ?? [])
    .map((modality) => modality.trim().toLowerCase())
    .filter((modality): modality is ModelModality =>
      ALLOWED_MODALITIES.includes(modality as ModelModality),
    );

  const deduped = Array.from(new Set(normalized));
  if (deduped.length === 0) {
    return ['text'];
  }

  const withText = deduped.includes('text') ? deduped : ['text', ...deduped];
  return ALLOWED_MODALITIES.filter((modality) => withText.includes(modality));
}

export function inferModelModalities(
  provider: ProviderName,
  modelId: string,
): ModelModality[] {
  const identifier = modelId.toLowerCase();
  const inferred = ['text'] as ModelModality[];

  if (supportsImage(provider, identifier)) {
    inferred.push('image');
  }
  if (identifier.includes('audio')) {
    inferred.push('audio');
  }
  if (identifier.includes('video')) {
    inferred.push('video');
  }

  return normalizeModelModalities(inferred);
}

function supportsImage(provider: ProviderName, identifier: string): boolean {
  if (provider === 'openai') {
    return (
      identifier.includes('gpt-4o') ||
      identifier.includes('gpt-4-turbo') ||
      identifier.includes('gpt-4.1') ||
      identifier.includes('vision')
    );
  }

  if (provider === 'anthropic') {
    return identifier.startsWith('claude-3');
  }

  if (provider === 'google') {
    return identifier.startsWith('gemini-');
  }

  if (provider === 'xai') {
    return identifier.includes('vision') || identifier.includes('image');
  }

  return false;
}
