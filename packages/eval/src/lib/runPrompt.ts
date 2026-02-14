import type {
  AIProvider,
  ProviderRegistry,
} from '@ensemble-ai/shared-utils/providers';
import type { EvalMode, ModelSpec, ProviderResponse } from '../types.js';

async function streamModelResponse(
  client: AIProvider,
  prompt: string,
  model: string,
): Promise<Pick<ProviderResponse, 'content' | 'responseTimeMs' | 'tokenCount' | 'error'>> {
  return new Promise((resolve) => {
    let content = '';

    void client.streamResponse(
      prompt,
      model,
      (chunk) => {
        content += chunk;
      },
      (fullResponse, responseTime, tokenCount) => {
        resolve({
          content: fullResponse || content,
          responseTimeMs: responseTime,
          tokenCount,
        });
      },
      (error) => {
        resolve({
          content,
          responseTimeMs: 0,
          error: error.message,
        });
      },
    );
  });
}

export async function runPromptWithModels(
  registry: ProviderRegistry,
  mode: EvalMode,
  prompt: string,
  models: ModelSpec[],
): Promise<ProviderResponse[]> {
  const tasks = models.map(async ({ provider, model }) => {
    const client = registry.getProvider(provider, mode);
    const result = await streamModelResponse(client, prompt, model);

    return {
      provider,
      model,
      ...result,
    } satisfies ProviderResponse;
  });

  return Promise.all(tasks);
}
