import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreeOpenAIClient } from './FreeOpenAIClient.js';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    openAiRetrieve: vi.fn(),
    openAiList: vi.fn(),
    openAiChatCreate: vi.fn(),
  },
}));

vi.mock('openai', () => ({
  default: class {
    models = { retrieve: mocks.openAiRetrieve, list: mocks.openAiList };
    chat = { completions: { create: mocks.openAiChatCreate } };
  },
}));

describe('FreeOpenAIClient model filtering', () => {
  beforeEach(() => {
    mocks.openAiList.mockReset();
  });

  it('includes standard chat models', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o' },
        { id: 'gpt-4o-mini' },
        { id: 'gpt-4-turbo' },
        { id: 'gpt-4.1' },
        { id: 'gpt-4.1-mini' },
        { id: 'gpt-4.1-nano' },
        { id: 'gpt-3.5-turbo' },
        { id: 'gpt-5' },
        { id: 'gpt-5-mini' },
        { id: 'gpt-5.2' },
        { id: 'o1-preview' },
        { id: 'o1-mini' },
        { id: 'o3-mini' },
      ],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();

    expect(models).toEqual([
      'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4.1', 'gpt-4.1-mini',
      'gpt-4.1-nano', 'gpt-3.5-turbo', 'gpt-5', 'gpt-5-mini', 'gpt-5.2',
      'o1-preview', 'o1-mini', 'o3-mini',
    ]);
  });

  it('excludes Responses API models (codex)', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o' },
        { id: 'gpt-5-codex' },
        { id: 'gpt-5.1-codex' },
        { id: 'gpt-5.1-codex-max' },
        { id: 'gpt-5.1-codex-mini' },
        { id: 'gpt-5.2-codex' },
      ],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual(['gpt-4o']);
  });

  it('excludes -pro models (Responses API only)', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o' },
        { id: 'gpt-5-pro' },
        { id: 'gpt-5-pro-2025-10-06' },
        { id: 'gpt-5.2-pro' },
        { id: 'gpt-5.2-pro-2025-12-11' },
        { id: 'o1-pro' },
        { id: 'o1-pro-2025-03-19' },
        { id: 'o3-pro' },
        { id: 'o3-pro-2025-06-10' },
      ],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual(['gpt-4o']);
  });

  it('excludes realtime, transcribe, image, and deep-research models', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o' },
        { id: 'gpt-4o-realtime-preview' },
        { id: 'gpt-4o-realtime-preview-2024-12-17' },
        { id: 'gpt-4o-transcribe' },
        { id: 'gpt-4o-mini-transcribe-2025-03-20' },
        { id: 'gpt-image-1' },
        { id: 'gpt-image-1-mini' },
        { id: 'gpt-realtime' },
        { id: 'gpt-realtime-mini' },
        { id: 'o3-deep-research' },
        { id: 'o3-deep-research-2025-06-26' },
      ],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual(['gpt-4o']);
  });

  it('excludes instruct and legacy completions models', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o' },
        { id: 'gpt-3.5-turbo-instruct' },
        { id: 'gpt-3.5-turbo-instruct-0914' },
        { id: 'davinci-002' },
        { id: 'babbage-002' },
      ],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual(['gpt-4o']);
  });

  it('excludes non-text models (audio, tts, dall-e, whisper, embedding)', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o' },
        { id: 'gpt-4o-audio-preview' },
        { id: 'whisper-1' },
        { id: 'dall-e-3' },
        { id: 'tts-1-hd' },
        { id: 'text-embedding-3-small' },
      ],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual(['gpt-4o']);
  });

  it('includes search-preview models (chat compatible)', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [
        { id: 'gpt-4o-search-preview' },
        { id: 'gpt-4o-mini-search-preview-2025-03-11' },
        { id: 'gpt-5-search-api' },
      ],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual([
      'gpt-4o-search-preview',
      'gpt-4o-mini-search-preview-2025-03-11',
      'gpt-5-search-api',
    ]);
  });

  it('handles empty list and null IDs', async () => {
    mocks.openAiList.mockResolvedValueOnce({
      data: [{ id: null }, { id: undefined }, { id: '' }, { id: 'gpt-4o' }],
    });

    const client = new FreeOpenAIClient('openai', () => 'sk-test');
    const models = await client.listAvailableTextModels();
    expect(models).toEqual(['gpt-4o']);
  });
});
