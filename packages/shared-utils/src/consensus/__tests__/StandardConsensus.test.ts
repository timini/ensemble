
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { buildStandardConsensusPrompt, StandardConsensus } from '../StandardConsensus';
import type { ConsensusModelResponse } from '../types';
import type { AIProvider } from '../../../providers/types';

describe('StandardConsensus', () => {
  let mockSummarizerProvider: AIProvider;
  let strategy: StandardConsensus;

  const mockResponses: ConsensusModelResponse[] = [
    { modelId: 'model-a', modelName: 'Model A', content: 'Response A content' },
    { modelId: 'model-b', modelName: 'Model B', content: 'Response B content' },
  ];

  beforeEach(() => {
    mockSummarizerProvider = {
      streamResponse: vi.fn(),
      generateEmbeddings: vi.fn(),
      validateApiKey: vi.fn(),
      listAvailableModels: vi.fn(),
      listAvailableTextModels: vi.fn(),
    } as unknown as AIProvider;

    strategy = new StandardConsensus(mockSummarizerProvider, 'summarizer-model-id');
  });

  it('runs ranking then synthesis and returns summary text', async () => {
    (mockSummarizerProvider.streamResponse as Mock).mockImplementation(
      async (
        prompt: string,
        _model: string,
        _onChunk: (chunk: string) => void,
        onComplete: (full: string, time: number, tokens?: number) => void,
      ) => {
        if (prompt.includes('Output exactly one of:')) {
          onComplete('WINNER: model-a', 25, 5);
          return Promise.resolve();
        }
        onComplete('Standard Summary', 100, 10);
        return Promise.resolve();
      },
    );

    const summary = await strategy.generateConsensus(mockResponses, 999, 'Test Prompt');

    expect(summary).toBe('Standard Summary');

    const calls = (mockSummarizerProvider.streamResponse as Mock).mock.calls;
    expect(calls.length).toBe(2);

    const judgePrompt = calls[0][0];
    const synthesisPrompt = calls[1][0];

    expect(judgePrompt).toContain('Output exactly one of:');
    expect(judgePrompt).toContain('WINNER: model-a');
    expect(judgePrompt).toContain('WINNER: model-b');

    expect(synthesisPrompt).toContain('Model A');
    expect(synthesisPrompt).toContain('Model B');
    expect(synthesisPrompt).toContain('Model ID: model-a');
    expect(synthesisPrompt).toContain('Model ID: model-b');
    expect(synthesisPrompt).toContain('Test Prompt');
    expect(synthesisPrompt).toContain('Preserve required output constraints');
    expect(synthesisPrompt).toContain('No markdown formatting');
  });

  it('builds a prompt with synthesis and output rules', () => {
    const prompt = buildStandardConsensusPrompt('Solve 2+2', mockResponses);

    expect(prompt).toContain('Instructions');
    expect(prompt).toContain('Output rules');
    expect(prompt).toContain('Return ONLY the final user answer text');
    expect(prompt).toContain('output exactly that format and nothing else');
  });
});
