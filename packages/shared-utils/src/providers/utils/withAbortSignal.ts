import type { AIProvider } from '../types';

/**
 * Wrap a provider so that every call carries `signal`. Consensus strategies
 * take an AIProvider and know nothing of cancellation, so passing them a
 * wrapped provider lets a run be stopped without changing the strategy
 * packages.
 */
export function withAbortSignal(provider: AIProvider, signal: AbortSignal): AIProvider {
  return {
    streamResponse: (prompt, model, onChunk, onComplete, onError, options) =>
      provider.streamResponse(prompt, model, onChunk, onComplete, onError, { ...options, signal }),
    generateStructured: (prompt, model, schema, options) =>
      provider.generateStructured(prompt, model, schema, { ...options, signal }),
    generateEmbeddings: (text, options) => provider.generateEmbeddings(text, { ...options, signal }),
    validateApiKey: (apiKey) => provider.validateApiKey(apiKey),
    listAvailableModels: () => provider.listAvailableModels(),
    listAvailableTextModels: () => provider.listAvailableTextModels(),
  };
}
