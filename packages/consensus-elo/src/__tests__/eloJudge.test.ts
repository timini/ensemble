import { describe, it, expect, vi, type Mock } from 'vitest';
import type { AIProvider, ConsensusModelResponse } from '@ensemble-ai/consensus-core';
import {
    buildJudgePrompt,
    parseJudgeResponse,
    judgePairWithSwap,
} from '../eloJudge';
import { mapReversedOutcome, resolveSwappedOutcomes } from '../eloTypes';

describe('eloJudge', () => {
    describe('buildJudgePrompt', () => {
        it('should include chain-of-thought instruction', () => {
            const prompt = buildJudgePrompt('content A', 'content B', 'What is 2+2?');
            expect(prompt).toContain('briefly explain your reasoning');
            expect(prompt).toContain('Then output your decision');
        });

        it('should place content in correct positions', () => {
            const prompt = buildJudgePrompt('alpha response', 'beta response', 'question');
            expect(prompt).toContain('Model A:\nalpha response');
            expect(prompt).toContain('Model B:\nbeta response');
        });

        it('should include the original question', () => {
            const prompt = buildJudgePrompt('a', 'b', 'What is the capital of France?');
            expect(prompt).toContain('What is the capital of France?');
        });

        it('should include decision rules and output format', () => {
            const prompt = buildJudgePrompt('a', 'b', 'q');
            expect(prompt).toContain('Decision rules:');
            expect(prompt).toContain('WINNER: A');
            expect(prompt).toContain('WINNER: B');
            expect(prompt).toContain('WINNER: TIE');
        });
    });

    describe('parseJudgeResponse', () => {
        it('should parse WINNER: A', () => {
            const result = parseJudgeResponse('WINNER: A');
            expect(result.outcome).toBe('A');
        });

        it('should parse WINNER: B', () => {
            const result = parseJudgeResponse('WINNER: B');
            expect(result.outcome).toBe('B');
        });

        it('should parse WINNER: TIE', () => {
            const result = parseJudgeResponse('WINNER: TIE');
            expect(result.outcome).toBe('TIE');
        });

        it('should return ERROR for unrecognized output', () => {
            const result = parseJudgeResponse('I cannot decide');
            expect(result.outcome).toBe('ERROR');
            expect(result.reasoning).toBe('');
        });

        it('should extract reasoning before WINNER line', () => {
            const response = 'Model A provides a more accurate calculation.\nWINNER: A';
            const result = parseJudgeResponse(response);
            expect(result.outcome).toBe('A');
            expect(result.reasoning).toBe('Model A provides a more accurate calculation.');
        });

        it('should handle case-insensitive matching', () => {
            const result = parseJudgeResponse('winner: a');
            expect(result.outcome).toBe('A');
        });

        it('should handle reasoning with multiple lines', () => {
            const response = 'First line of reasoning.\nSecond line.\nWINNER: B';
            const result = parseJudgeResponse(response);
            expect(result.outcome).toBe('B');
            expect(result.reasoning).toContain('First line of reasoning.');
            expect(result.reasoning).toContain('Second line.');
        });

        it('should use the LAST WINNER: line when reasoning mentions the verdict format', () => {
            // Chain-of-thought may reference "WINNER: A" as part of reasoning
            const response = 'I initially thought WINNER: A but on reflection B is better.\nWINNER: B';
            const result = parseJudgeResponse(response);
            expect(result.outcome).toBe('B');
            expect(result.reasoning).toContain('I initially thought WINNER: A');
        });

        it('should return ERROR when no WINNER: line exists at all', () => {
            const result = parseJudgeResponse('Both responses are good but I cannot decide.');
            expect(result.outcome).toBe('ERROR');
            expect(result.reasoning).toBe('');
        });
    });

    describe('mapReversedOutcome', () => {
        it('should swap A to B', () => {
            expect(mapReversedOutcome('A')).toBe('B');
        });

        it('should swap B to A', () => {
            expect(mapReversedOutcome('B')).toBe('A');
        });

        it('should preserve TIE', () => {
            expect(mapReversedOutcome('TIE')).toBe('TIE');
        });

        it('should preserve ERROR', () => {
            expect(mapReversedOutcome('ERROR')).toBe('ERROR');
        });
    });

    describe('resolveSwappedOutcomes', () => {
        it('should return HIGH confidence when both agree on winner A', () => {
            const result = resolveSwappedOutcomes('A', 'A');
            expect(result).toEqual({ winner: 'A', confidence: 'HIGH' });
        });

        it('should return HIGH confidence when both agree on winner B', () => {
            const result = resolveSwappedOutcomes('B', 'B');
            expect(result).toEqual({ winner: 'B', confidence: 'HIGH' });
        });

        it('should return HIGH confidence for double TIE', () => {
            const result = resolveSwappedOutcomes('TIE', 'TIE');
            expect(result).toEqual({ winner: 'TIE', confidence: 'HIGH' });
        });

        it('should return LOW-confidence TIE for contradictory winners (A vs B)', () => {
            const result = resolveSwappedOutcomes('A', 'B');
            expect(result).toEqual({ winner: 'TIE', confidence: 'LOW' });
        });

        it('should return LOW-confidence winner when one says winner and other says TIE', () => {
            expect(resolveSwappedOutcomes('A', 'TIE')).toEqual({ winner: 'A', confidence: 'LOW' });
            expect(resolveSwappedOutcomes('TIE', 'B')).toEqual({ winner: 'B', confidence: 'LOW' });
        });

        it('should return null for double error', () => {
            expect(resolveSwappedOutcomes('ERROR', 'ERROR')).toBeNull();
        });

        it('should use valid result at LOW confidence when one errors', () => {
            expect(resolveSwappedOutcomes('ERROR', 'A')).toEqual({ winner: 'A', confidence: 'LOW' });
            expect(resolveSwappedOutcomes('B', 'ERROR')).toEqual({ winner: 'B', confidence: 'LOW' });
            expect(resolveSwappedOutcomes('ERROR', 'TIE')).toEqual({ winner: 'TIE', confidence: 'LOW' });
        });
    });

    describe('judgePairWithSwap', () => {
        const modelA: ConsensusModelResponse = { modelId: 'model-a', modelName: 'Model A', content: 'Alpha answer' };
        const modelB: ConsensusModelResponse = { modelId: 'model-b', modelName: 'Model B', content: 'Beta answer' };

        function createMockProvider(responses: string[]): AIProvider {
            let callIndex = 0;
            return {
                streamResponse: vi.fn(async (
                    _prompt: string,
                    _model: string,
                    _onChunk: (chunk: string) => void,
                    onComplete: (full: string, time: number, tokens?: number) => void,
                ) => {
                    onComplete(responses[callIndex++] ?? 'ERROR', 100, 10);
                }),
                generateEmbeddings: vi.fn(),
                validateApiKey: vi.fn(),
                listAvailableModels: vi.fn(),
                listAvailableTextModels: vi.fn(),
            } as unknown as AIProvider;
        }

        it('should make exactly 2 judge calls per pair', async () => {
            const provider = createMockProvider(['WINNER: A', 'WINNER: B']);
            await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'question');
            expect(provider.streamResponse).toHaveBeenCalledTimes(2);
        });

        it('should swap content positions in the two calls', async () => {
            const capturedPrompts: string[] = [];
            const provider = {
                streamResponse: vi.fn(async (
                    prompt: string,
                    _model: string,
                    _onChunk: (chunk: string) => void,
                    onComplete: (full: string, time: number, tokens?: number) => void,
                ) => {
                    capturedPrompts.push(prompt);
                    onComplete('WINNER: TIE', 100, 10);
                }),
                generateEmbeddings: vi.fn(),
                validateApiKey: vi.fn(),
                listAvailableModels: vi.fn(),
                listAvailableTextModels: vi.fn(),
            } as unknown as AIProvider;

            await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'question');

            expect(capturedPrompts).toHaveLength(2);
            // Forward: Alpha in A position, Beta in B position
            expect(capturedPrompts[0]).toContain('Model A:\nAlpha answer');
            expect(capturedPrompts[0]).toContain('Model B:\nBeta answer');
            // Reversed: Beta in A position, Alpha in B position
            expect(capturedPrompts[1]).toContain('Model A:\nBeta answer');
            expect(capturedPrompts[1]).toContain('Model B:\nAlpha answer');
        });

        it('should not include model IDs or model names in judge prompts', async () => {
            const namedA: ConsensusModelResponse = { modelId: 'gpt-4o', modelName: 'GPT-4o', content: 'Alpha answer' };
            const namedB: ConsensusModelResponse = { modelId: 'claude-3', modelName: 'Claude 3', content: 'Beta answer' };
            const capturedPrompts: string[] = [];
            const provider = {
                streamResponse: vi.fn(async (
                    prompt: string,
                    _model: string,
                    _onChunk: (chunk: string) => void,
                    onComplete: (full: string, time: number, tokens?: number) => void,
                ) => {
                    capturedPrompts.push(prompt);
                    onComplete('WINNER: TIE', 100, 10);
                }),
                generateEmbeddings: vi.fn(),
                validateApiKey: vi.fn(),
                listAvailableModels: vi.fn(),
                listAvailableTextModels: vi.fn(),
            } as unknown as AIProvider;

            await judgePairWithSwap(provider, 'judge-model', namedA, namedB, 'question');

            for (const prompt of capturedPrompts) {
                // Real model IDs/names must not leak into the judge prompt
                expect(prompt).not.toContain('gpt-4o');
                expect(prompt).not.toContain('GPT-4o');
                expect(prompt).not.toContain('claude-3');
                expect(prompt).not.toContain('Claude 3');
                // Anonymous labels "Model A:" and "Model B:" are expected and correct
                expect(prompt).toContain('Model A:');
                expect(prompt).toContain('Model B:');
            }
        });

        it('should return high-confidence winner for consistent judgments', async () => {
            // Forward: A wins, Reversed: B wins (B is in A position) -> mapped back = A wins
            const provider = createMockProvider(['WINNER: A', 'WINNER: B']);
            const result = await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'q');

            expect(result.winnerId).toBe('model-a');
            expect(result.confidence).toBe('HIGH');
        });

        it('should return low-confidence TIE for contradictory judgments', async () => {
            // Forward: A wins, Reversed: A wins (but A position is now B) -> mapped back = B wins
            // So forward=A, reversed(mapped)=B -> contradictory -> TIE LOW
            const provider = createMockProvider(['WINNER: A', 'WINNER: A']);
            const result = await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'q');

            expect(result.winnerId).toBeNull();
            expect(result.confidence).toBe('LOW');
        });

        it('should return high-confidence TIE for double TIE', async () => {
            const provider = createMockProvider(['WINNER: TIE', 'WINNER: TIE']);
            const result = await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'q');

            expect(result.winnerId).toBeNull();
            expect(result.confidence).toBe('HIGH');
        });

        it('should return low-confidence winner when one says TIE', async () => {
            // Forward: A wins, Reversed: TIE -> mapped TIE stays TIE
            // forward=A, reversed=TIE -> A at LOW confidence
            const provider = createMockProvider(['WINNER: A', 'WINNER: TIE']);
            const result = await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'q');

            expect(result.winnerId).toBe('model-a');
            expect(result.confidence).toBe('LOW');
        });

        it('should return undefined confidence for double error', async () => {
            const provider = createMockProvider(['garbage', 'garbage']);
            const result = await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'q');

            expect(result.winnerId).toBeNull();
            expect(result.confidence).toBeUndefined();
        });

        it('should use valid result at LOW confidence when one call errors', async () => {
            const provider = createMockProvider(['garbage', 'WINNER: B']);
            const result = await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'q');

            // Reversed says B wins -> mapped back = A wins
            // Forward errored, reversed valid -> use reversed at LOW
            expect(result.winnerId).toBe('model-a');
            expect(result.confidence).toBe('LOW');
        });

        it('should capture reasoning from both judge calls', async () => {
            const provider = createMockProvider([
                'A is more precise.\nWINNER: A',
                'B has better support.\nWINNER: B',
            ]);
            const result = await judgePairWithSwap(provider, 'judge-model', modelA, modelB, 'q');

            expect(result.reasoning).toBeDefined();
            expect(result.reasoning!.forward).toContain('A is more precise.');
            expect(result.reasoning!.reversed).toContain('B has better support.');
        });
    });
});
