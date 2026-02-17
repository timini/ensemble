
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
        { modelId: 'model-c', modelName: 'Model C', content: 'Response C content' },
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

    it('should generate summary using all responses when topN is 0', async () => {
        (mockSummarizerProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('Standard Summary', 100, 10);
            return Promise.resolve();
        });

        const summary = await strategy.generateConsensus(mockResponses, 0, 'Test Prompt');

        expect(summary).toBe('Standard Summary');

        const calls = (mockSummarizerProvider.streamResponse as Mock).mock.calls;
        const promptArg = calls[0][0];

        // Should use anonymous labels, not model names
        expect(promptArg).toContain('Response 1:');
        expect(promptArg).toContain('Response 2:');
        expect(promptArg).toContain('Response 3:');
        expect(promptArg).not.toContain('Model: Model A');
        expect(promptArg).not.toContain('Model: Model B');
        expect(promptArg).toContain('Test Prompt');
        // Should include format-preservation instruction
        expect(promptArg).toContain('constrained format');
    });

    it('should respect topN parameter to limit responses', async () => {
        (mockSummarizerProvider.streamResponse as Mock).mockImplementation(async (
            _prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            onComplete('Top-2 Summary', 100, 10);
            return Promise.resolve();
        });

        await strategy.generateConsensus(mockResponses, 2, 'Test Prompt');

        const calls = (mockSummarizerProvider.streamResponse as Mock).mock.calls;
        const promptArg = calls[0][0];

        // Should include only top 2
        expect(promptArg).toContain('Response 1:');
        expect(promptArg).toContain('Response 2:');
        expect(promptArg).not.toContain('Response 3:');
        // Should NOT include model C content
        expect(promptArg).not.toContain('Response C content');
    });
});
