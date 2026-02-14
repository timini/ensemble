import { describe, expect, it } from 'vitest';
import type { Model } from '@/components/organisms/ModelSelectionList';
import type { ModelMetadata } from '@ensemble-ai/shared-utils/providers';
import {
  mapModelMetadataToModels,
  replaceProviderModels,
} from '../providerModels';

describe('provider model utilities', () => {
  it('maps provider metadata to selection models', () => {
    const metadata: ModelMetadata[] = [
      {
        id: 'gemini-2-pro',
        name: 'Gemini 2 Pro',
        provider: 'google',
        contextWindow: 0,
        costPer1kTokens: 0,
      },
      {
        id: 'gemini-2-flash',
        name: 'Gemini 2 Flash',
        provider: 'google',
        contextWindow: 0,
        costPer1kTokens: 0,
      },
    ];

    const result = mapModelMetadataToModels('google', metadata);

    expect(result).toEqual<Model[]>([
      {
        id: 'gemini-2-pro',
        name: 'Gemini 2 Pro',
        provider: 'google',
        modalities: ['text', 'image'],
      },
      {
        id: 'gemini-2-flash',
        name: 'Gemini 2 Flash',
        provider: 'google',
        modalities: ['text', 'image'],
      },
    ]);
  });

  it('uses explicit metadata modalities when provided', () => {
    const metadata: ModelMetadata[] = [
      {
        id: 'gpt-audio-lite',
        name: 'GPT Audio Lite',
        provider: 'openai',
        contextWindow: 0,
        costPer1kTokens: 0,
        modalities: ['text', 'audio'],
      },
    ];

    const result = mapModelMetadataToModels('openai', metadata);

    expect(result).toEqual<Model[]>([
      {
        id: 'gpt-audio-lite',
        name: 'GPT Audio Lite',
        provider: 'openai',
        modalities: ['text', 'audio'],
      },
    ]);
  });

  it('replaces models for a provider while preserving others', () => {
    const base: Model[] = [
      { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o' },
      { id: 'gemini-1.5-flash', provider: 'google', name: 'Gemini 1.5 Flash' },
      { id: 'claude-3-opus', provider: 'anthropic', name: 'Claude 3 Opus' },
    ];
    const overrides: Model[] = [
      { id: 'gemini-2-pro', provider: 'google', name: 'Gemini 2 Pro' },
    ];

    const result = replaceProviderModels(base, 'google', overrides);

    expect(result).toEqual<Model[]>([
      { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o' },
      { id: 'gemini-2-pro', provider: 'google', name: 'Gemini 2 Pro' },
      { id: 'claude-3-opus', provider: 'anthropic', name: 'Claude 3 Opus' },
    ]);
  });
});
