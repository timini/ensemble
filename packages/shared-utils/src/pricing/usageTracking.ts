import type { AIProvider } from '../providers/types';
import { usageFromText, type CallUsage } from './runCost';

/**
 * Wrap a provider so that every completed text call is reported to `record`
 * with its token usage. Usage comes from the provider when it reports it and
 * is estimated from prompt and output length otherwise (marked `estimated`).
 *
 * Consensus strategies take an AIProvider, so passing them a wrapped
 * provider captures the usage of every consensus call without changing the
 * strategy packages.
 */
export function withUsageTracking(
  provider: AIProvider,
  providerName: string,
  record: (call: CallUsage) => void,
): AIProvider {
  return {
    streamResponse(prompt, model, onChunk, onComplete, onError, options) {
      return provider.streamResponse(
        prompt,
        model,
        onChunk,
        (fullResponse, responseTime, tokenCount, usage) => {
          record({
            provider: providerName,
            modelId: model,
            ...(usage ?? usageFromText(prompt, fullResponse)),
            source: usage ? 'reported' : 'estimated',
          });
          onComplete(fullResponse, responseTime, tokenCount, usage);
        },
        onError,
        options,
      );
    },
    async generateStructured(prompt, model, schema, options) {
      const result = await provider.generateStructured<never>(prompt, model, schema, options);
      record({
        provider: providerName,
        modelId: model,
        ...(result.usage ?? usageFromText(prompt, result.raw)),
        source: result.usage ? 'reported' : 'estimated',
      });
      return result;
    },
    generateEmbeddings: (text) => provider.generateEmbeddings(text),
    validateApiKey: (apiKey) => provider.validateApiKey(apiKey),
    listAvailableModels: () => provider.listAvailableModels(),
    listAvailableTextModels: () => provider.listAvailableTextModels(),
  };
}
