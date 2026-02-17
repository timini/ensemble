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
        (p.provider.streamResponse as Mock).mockImplementation((
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number, tokens?: number) => void
        ) => {
            if (prompt.includes('factual accuracy reviewer')) {
                onComplete('FACTUAL ASSESSMENT: correct\nISSUES: none\nVERDICT: keep', 100, 10);
                return Promise.resolve();
            }
            if (prompt.includes('defending your original response')) {
                onComplete('I stand by my response because it addresses the core question accurately.', 100, 10);
                return Promise.resolve();
            }
            if (prompt.includes('judge evaluating')) {
                onComplete('{"isValid": true, "reasoning": "Position is sound."}', 100, 10);
                return Promise.resolve();
            }
            if (prompt.includes('impartial evaluator')) {
                // Council ELO now uses anonymous labels (Response A/B → WINNER: A/B)
                onComplete('WINNER: A', 100, 10);
                return Promise.resolve();
            }
            onComplete('Default response', 100, 10);
            return Promise.resolve();
        });
    }

    (summarizerProvider.streamResponse as Mock).mockImplementation((
        _prompt: string,
        _model: string,
        _onChunk: (chunk: string) => void,
        onComplete: (full: string, time: number, tokens?: number) => void
    ) => {
        onComplete('Council consensus: AI is a broad field encompassing machine intelligence.', 100, 10);
        return Promise.resolve();
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

        it('should not include self-votes on branches', async () => {
            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            const tree = strategy.getLastDebateTree();

            // Each branch gets N-1 = 2 votes (models do not vote on their own branch)
            for (const branch of tree!.branches) {
                expect(branch.votes).toHaveLength(2);
                const selfVote = branch.votes.find((v) => v.voterModelId === branch.modelId);
                expect(selfVote).toBeUndefined();
            }
        });

        it('should make correct number of provider calls', async () => {
            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');

            // For 3 models:
            // Critiques: N*(N-1) = 6
            // Rebuttals: N = 3
            // Judgments: N*(N-1) = 6 (no self-votes)
            // ELO pairings: V*(V-1)/2 = 3
            // Summary: 1
            // Total: 6 + 3 + 6 + 3 + 1 = 19
            let totalCalls = 0;
            for (const p of participants) {
                totalCalls += (p.provider.streamResponse as Mock).mock.calls.length;
            }
            totalCalls += (summarizerProvider.streamResponse as Mock).mock.calls.length;

            expect(totalCalls).toBeGreaterThanOrEqual(19);
        });

        it('should return rankings via rankResponses', async () => {
            const rankings = await strategy.rankResponses(mockResponses, 'What is AI?');

            expect(rankings).toHaveLength(3);
            expect(rankings[0]!.rank).toBe(1);
            expect(rankings[1]!.rank).toBe(2);
            expect(rankings[2]!.rank).toBe(3);
            for (const r of rankings) {
                expect(typeof r.eloScore).toBe('number');
            }
        });
    });

    describe('partial failure', () => {
        it('should complete pipeline when one provider throws during critique', async () => {
            (participants[0]!.provider.streamResponse as Mock).mockImplementation((
                _prompt: string,
                _model: string,
                _onChunk: (chunk: string) => void,
                _onComplete: (full: string, time: number, tokens?: number) => void,
                onError: (err: Error) => void
            ) => {
                onError(new Error('Rate limit exceeded'));
                return Promise.resolve();
            });

            for (const p of participants.slice(1)) {
                (p.provider.streamResponse as Mock).mockImplementation((
                    prompt: string,
                    _model: string,
                    _onChunk: (chunk: string) => void,
                    onComplete: (full: string, time: number, tokens?: number) => void
                ) => {
                    if (prompt.includes('factual accuracy reviewer')) {
                        onComplete('Good critique.', 100, 10);
                        return Promise.resolve();
                    }
                    if (prompt.includes('defending your original response')) {
                        onComplete('Valid rebuttal.', 100, 10);
                        return Promise.resolve();
                    }
                    if (prompt.includes('judge evaluating')) {
                        onComplete('{"isValid": true, "reasoning": "OK"}', 100, 10);
                        return Promise.resolve();
                    }
                    if (prompt.includes('impartial evaluator')) {
                        onComplete('WINNER: A', 100, 10);
                        return Promise.resolve();
                    }
                    onComplete('Default', 100, 10);
                    return Promise.resolve();
                });
            }

            (summarizerProvider.streamResponse as Mock).mockImplementation((
                _prompt: string,
                _model: string,
                _onChunk: (chunk: string) => void,
                onComplete: (full: string, time: number, tokens?: number) => void
            ) => {
                onComplete('Partial consensus result.', 100, 10);
                return Promise.resolve();
            });

            const result = await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            expect(result).toBe('Partial consensus result.');
        });
    });

    describe('all branches invalid fallback', () => {
        it('should keep all branches when all votes are invalid', async () => {
            for (const p of participants) {
                (p.provider.streamResponse as Mock).mockImplementation((
                    prompt: string,
                    _model: string,
                    _onChunk: (chunk: string) => void,
                    onComplete: (full: string, time: number, tokens?: number) => void
                ) => {
                    if (prompt.includes('factual accuracy reviewer')) {
                        onComplete('Major flaws found.', 100, 10);
                        return Promise.resolve();
                    }
                    if (prompt.includes('defending your original response')) {
                        onComplete('I concede the points raised.', 100, 10);
                        return Promise.resolve();
                    }
                    if (prompt.includes('judge evaluating')) {
                        onComplete('{"isValid": false, "reasoning": "Fundamentally flawed."}', 100, 10);
                        return Promise.resolve();
                    }
                    if (prompt.includes('impartial evaluator')) {
                        onComplete('WINNER: A', 100, 10);
                        return Promise.resolve();
                    }
                    onComplete('Default', 100, 10);
                    return Promise.resolve();
                });
            }

            (summarizerProvider.streamResponse as Mock).mockImplementation((
                _prompt: string,
                _model: string,
                _onChunk: (chunk: string) => void,
                onComplete: (full: string, time: number, tokens?: number) => void
            ) => {
                onComplete('Fallback consensus.', 100, 10);
                return Promise.resolve();
            });

            const result = await strategy.generateConsensus(mockResponses, 3, 'What is AI?');
            expect(result).toBe('Fallback consensus.');

            const tree = strategy.getLastDebateTree();
            // All branches should be kept as valid in fallback
            expect(tree!.validBranches).toHaveLength(3);
            // Original branches should retain isValid: false
            for (const branch of tree!.branches) {
                expect(branch.isValid).toBe(false);
            }
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

    describe('ELO judge rotation', () => {
        it('should rotate judges across ELO pairings', async () => {
            setupDeterministicProviders(participants, summarizerProvider);

            await strategy.generateConsensus(mockResponses, 3, 'What is AI?');

            // With 3 valid branches, there are 3 ELO pairings
            // Judges should rotate: participant[0], participant[1], participant[2]
            // Check that more than one participant handled ELO judging calls
            const eloCallCounts = participants.map((p) => {
                const calls = (p.provider.streamResponse as Mock).mock.calls;
                return calls.filter((c: string[]) => c[0].includes('impartial evaluator')).length;
            });
            const participantsUsedForElo = eloCallCounts.filter((c) => c > 0).length;
            expect(participantsUsedForElo).toBeGreaterThan(1);
        });
    });
});
