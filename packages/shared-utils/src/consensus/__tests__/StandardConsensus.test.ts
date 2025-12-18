
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { StandardConsensus } from '../StandardConsensus';
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

    it('should generate summary using all responses', async () => {
        (mockSummarizerProvider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('Standard Summary', 100, 10);
            return Promise.resolve();
        });

        const summary = await strategy.generateConsensus(mockResponses, 999, 'Test Prompt');

        expect(summary).toBe('Standard Summary');

        const calls = (mockSummarizerProvider.streamResponse as Mock).mock.calls;
        const promptArg = calls[0][0];

        expect(promptArg).toContain('Model A');
        expect(promptArg).toContain('Model B');
        expect(promptArg).toContain('Test Prompt');
    });
});
