import { describe, expect, it } from 'vitest';
import { MockProviderClient } from '../clients/mock/MockProviderClient';
import { createProviderClient } from '../factories/createProviderClient';
import { OpenAICompatibleEndpointsClient } from '../clients/openaiCompatible/OpenAICompatibleEndpointsClient';
import { parseEndpointModelId } from '../clients/openaiCompatible/endpointPresets';

describe('openai-compatible provider', () => {
  it('has mock models qualified with a local endpoint id', () => {
    const models = new MockProviderClient({ providerFilter: 'openai-compatible' }).listAvailableModels();
    expect(models.length).toBeGreaterThanOrEqual(3);
    for (const model of models) {
      expect(model.provider).toBe('openai-compatible');
      expect(parseEndpointModelId(model.id)?.endpointId).toBe('ollama');
    }
  });

  it('creates the endpoints client in Free mode', () => {
    const client = createProviderClient({ provider: 'openai-compatible', mode: 'free', getEndpoints: () => [] });
    expect(client).toBeInstanceOf(OpenAICompatibleEndpointsClient);
  });

  it('needs getEndpoints in Free mode', () => {
    expect(() =>
      createProviderClient({ provider: 'openai-compatible', mode: 'free', getApiKey: () => null }),
    ).toThrow(/getEndpoints/);
  });

  it('creates a mock client in mock mode', () => {
    expect(createProviderClient({ provider: 'openai-compatible', mode: 'mock' })).toBeInstanceOf(MockProviderClient);
  });
});
