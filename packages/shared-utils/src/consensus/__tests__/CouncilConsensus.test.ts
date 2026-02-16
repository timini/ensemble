import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CouncilConsensus } from '../CouncilConsensus';
import type { ConsensusModelResponse } from '../types';
import type { AIProvider } from '../../providers/types';
import type { CouncilParticipant } from '../councilTypes';

function createMockProvider(): AIProvider {
    return {
        streamResponse: vi.fn(),
        generateEmbeddings: vi.fn(),
        validateApiKey: vi.fn(),
        listAvailableModels: vi.fn(),
        listAvailableTextModels: vi.fn(),
    } as unknown as AIProvider;
}

function createMockParticipants(providers?: AIProvider[]): CouncilParticipant[] {
    const p = providers ?? [createMockProvider(), createMockProvider(), createMockProvider()];
    return [
        { modelId: 'model-a', modelName: 'Model A', provider: p[0]!, modelApiId: 'model-a-api' },
        { modelId: 'model-b', modelName: 'Model B', provider: p[1]!, modelApiId: 'model-b-api' },
        { modelId: 'model-c', modelName: 'Model C', provider: p[2]!, modelApiId: 'model-c-api' },
    ];
}

const mockResponses: ConsensusModelResponse[] = [
    { modelId: 'model-a', modelName: 'Model A', content: 'Response A: AI is machine intelligence.' },
    { modelId: 'model-b', modelName: 'Model B', content: 'Response B: AI mimics human cognition.' },
    { modelId: 'model-c', modelName: 'Model C', content: 'Response C: AI processes data intelligently.' },
];

/** Sets up all participant providers to return deterministic text */
function setupDeterministicProviders(participants: CouncilParticipant[], summarizerProvider: AIProvider) {
    for (const p of participants) {
        (p.provider.streamResponse as Mock).mockImplementation(async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            // Critique round: return a critique
            if (prompt.includes('critical reviewer')) {
                onComplete('This response has some strengths but lacks detail on key aspects.', 100, 10);
                return;
            }
            // Rebuttal round: return a rebuttal
            if (prompt.includes('defending your original response')) {
                onComplete('I stand by my response because it addresses the core question accurately.', 100, 10);
                return;
            }
            // Judgment round: return valid vote JSON
            if (prompt.includes('judge evaluating')) {
                onComplete('{"isValid": true, "reasoning": "Position is sound."}', 100, 10);
                return;
            }
            // ELO judging round: prefer Model A
            if (prompt.includes('impartial judge')) {
                if (prompt.includes('Model A')) {
                    onComplete('Winner: Model A', 100, 10);
                } else {
                    onComplete('Winner: Model B', 100, 10);
                }
                return;
            }
            // Default
            onComplete('Default response', 100, 10);
        });
    }

    // Summarizer returns a final summary
    (summarizerProvider.streamResponse as Mock).mockImplementation(async (
        _prompt: string,
        _model: string,
        _onChunk: (chunk: string) => void,
        onComplete: (full: string, time: number, tokens?: number) => void
    ) => {
        onComplete('Council consensus: AI is a broad field encompassing machine intelligence.', 100, 10);
    });
}

describe('CouncilConsensus', () => {
    let participants: CouncilParticipant[];
    let summarizerProvider: AIProvider;
    let strategy: CouncilConsensus;

    beforeEach(() => {
        participants = createMockParticipants();
        summarizerProvider = createMockProvider();
        strategy = new CouncilConsensus({
            participants,
            summarizerProvider,
            summarizerModelId: 'summarizer-model',
        });
    });

    describe('minimum responses validation', () => {
        it('should throw error if fewer than 3 responses are provided', async () => {
            const twoResponses = mockResponses.slice(0, 2);
            await expect(
                strategy.generateConsensus(twoResponses, 3, 'What is AI?')
            ).rejects.toThrow('At least 3 responses are required for council consensus');
        });

        it('should throw error for rankResponses with fewer than 3 responses', async () => {
            const twoResponses = mockResponses.slice(0, 2);
            await expect(
                strategy.rankResponses(twoResponses, 'What is AI?')
            ).rejects.toThrow('At least 3 responses are required for council consensus');
        });
    });

    describe('full pipeline', () => {
        beforeEach(() => {
            setupDeterministicProviders(participants, summarizerProvider);
        });

        it('should complete the full debate pipeline and return a summary', async () => {
            const result = await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            expect(result).toBe('Council consensus: AI is a broad field encompassing machine intelligence.');
        });

        it('should produce a valid debate tree', async () => {
            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            const tree = strategy.getLastDebateTree();

            expect(tree).not.toBeNull();
            expect(tree!.originalPrompt).toBe('What is AI?');
            expect(tree!.branches).toHaveLength(3);
            expect(tree!.metadata.totalModels).toBe(3);
        });

        it('should populate critiques on each branch', async () => {
            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            const tree = strategy.getLastDebateTree();

            // Each branch should have N-1 = 2 critiques (from the other two models)
            for (const branch of tree!.branches) {
                expect(branch.critiques).toHaveLength(2);
            }
        });

        it('should populate rebuttals on each branch', async () => {
            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            const tree = strategy.getLastDebateTree();

            for (const branch of tree!.branches) {
                expect(branch.rebuttal).not.toBeNull();
                expect(branch.rebuttal!.content).toContain('I stand by my response');
            }
        });

        it('should populate votes on each branch', async () => {
            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            const tree = strategy.getLastDebateTree();

            // Each branch gets N = 3 votes (all models vote on each branch)
            for (const branch of tree!.branches) {
                expect(branch.votes).toHaveLength(3);
            }
        });

        it('should make correct number of provider calls', async () => {
            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');

            // For 3 models:
            // Critiques: N*(N-1) = 6
            // Rebuttals: N = 3
            // Judgments: N*N = 9
            // ELO pairings for valid branches: up to V*(V-1)/2
            // Summary: 1
            // Total minimum (if all valid, 3 ELO pairs): 6 + 3 + 9 + 3 + 1 = 22
            // Verify at least critique + rebuttal + judgment calls happened
            let totalCalls = 0;
            for (const p of participants) {
                totalCalls += (p.provider.streamResponse as Mock).mock.calls.length;
            }
            totalCalls += (summarizerProvider.streamResponse as Mock).mock.calls.length;

            // At minimum: 6 critiques + 3 rebuttals + 9 judgments + 1 summary = 19
            // (ELO calls use participants' providers too)
            expect(totalCalls).toBeGreaterThanOrEqual(19);
        });

        it('should return rankings via rankResponses', async () => {
            const rankings = await strategy.rankResponses(mockResponses, 'What is AI?');

            expect(rankings).toHaveLength(3);
            expect(rankings[0]!.rank).toBe(1);
            expect(rankings[1]!.rank).toBe(2);
            expect(rankings[2]!.rank).toBe(3);
            // Rankings should have eloScore
            for (const r of rankings) {
                expect(typeof r.eloScore).toBe('number');
            }
        });
    });

    describe('partial failure', () => {
        it('should complete pipeline when one provider throws during critique', async () => {
            // Provider A throws, B and C work
            (participants[0]!.provider.streamResponse as Mock).mockImplementation(async (
                _prompt: string,
                _model: string,
                _onChunk: (chunk: string) => void,
                _onComplete: (full: string, time: number, tokens?: number) => void,
                onError: (err: Error) => void
            ) => {
                onError(new Error('Rate limit exceeded'));
            });

            for (const p of participants.slice(1)) {
                (p.provider.streamResponse as Mock).mockImplementation(async (
                    prompt: string,
                    _model: string,
                    _onChunk: (chunk: string) => void,
                    onComplete: (full: string, time: number, tokens?: number) => void
                ) => {
                    if (prompt.includes('critical reviewer')) {
                        onComplete('Good critique.', 100, 10);
                        return;
                    }
                    if (prompt.includes('defending your original response')) {
                        onComplete('Valid rebuttal.', 100, 10);
                        return;
                    }
                    if (prompt.includes('judge evaluating')) {
                        onComplete('{"isValid": true, "reasoning": "OK"}', 100, 10);
                        return;
                    }
                    if (prompt.includes('impartial judge')) {
                        onComplete('Winner: Model B', 100, 10);
                        return;
                    }
                    onComplete('Default', 100, 10);
                });
            }

            (summarizerProvider.streamResponse as Mock).mockImplementation(async (
                _prompt: string,
                _model: string,
                _onChunk: (chunk: string) => void,
                onComplete: (full: string, time: number, tokens?: number) => void
            ) => {
                onComplete('Partial consensus result.', 100, 10);
            });

            const result = await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            expect(result).toBe('Partial consensus result.');
        });
    });

    describe('all branches invalid fallback', () => {
        it('should keep all branches when all votes are invalid', async () => {
            for (const p of participants) {
                (p.provider.streamResponse as Mock).mockImplementation(async (
                    prompt: string,
                    _model: string,
                    _onChunk: (chunk: string) => void,
                    onComplete: (full: string, time: number, tokens?: number) => void
                ) => {
                    if (prompt.includes('critical reviewer')) {
                        onComplete('Major flaws found.', 100, 10);
                        return;
                    }
                    if (prompt.includes('defending your original response')) {
                        onComplete('I concede the points raised.', 100, 10);
                        return;
                    }
                    if (prompt.includes('judge evaluating')) {
                        // All votes are invalid
                        onComplete('{"isValid": false, "reasoning": "Fundamentally flawed."}', 100, 10);
                        return;
                    }
                    if (prompt.includes('impartial judge')) {
                        onComplete('Winner: Model A', 100, 10);
                        return;
                    }
                    onComplete('Default', 100, 10);
                });
            }

            (summarizerProvider.streamResponse as Mock).mockImplementation(async (
                _prompt: string,
                _model: string,
                _onChunk: (chunk: string) => void,
                onComplete: (full: string, time: number, tokens?: number) => void
            ) => {
                onComplete('Fallback consensus.', 100, 10);
            });

            const result = await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            expect(result).toBe('Fallback consensus.');

            const tree = strategy.getLastDebateTree();
            // All branches should be kept as valid in fallback
            expect(tree!.validBranches).toHaveLength(3);
        });
    });

    describe('progress callback', () => {
        it('should call progress callback with correct round names', async () => {
            const onProgress = vi.fn();
            strategy = new CouncilConsensus({
                participants,
                summarizerProvider,
                summarizerModelId: 'summarizer-model',
                onProgress,
            });

            setupDeterministicProviders(participants, summarizerProvider);

            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');

            const rounds = onProgress.mock.calls.map(
                (call: [{ round: string }]) => call[0].round
            );

            expect(rounds).toContain('critique');
            expect(rounds).toContain('rebuttal');
            expect(rounds).toContain('judgment');
            expect(rounds).toContain('elo');
            expect(rounds).toContain('summary');
        });
    });

    describe('generateConsensusWithDebateTree', () => {
        it('should return the full debate tree directly', async () => {
            setupDeterministicProviders(participants, summarizerProvider);

            const tree = await strategy.generateConsensusWithDebateTree(mockResponses, 3, 'What is AI?');

            expect(tree.originalPrompt).toBe('What is AI?');
            expect(tree.summary).toBe('Council consensus: AI is a broad field encompassing machine intelligence.');
            expect(tree.branches).toHaveLength(3);
            expect(tree.metadata.durationMs).toBeGreaterThanOrEqual(0);
        });
    });
});
