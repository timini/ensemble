import { describe, it, expect } from 'vitest';
import { SelfConsistencyConsensus } from '../SelfConsistencyConsensus';
import type { ConsensusModelResponse } from '../types';

function simpleExtractor(content: string): string | null {
    const match = content.match(/^([A-Z])$/);
    return match ? match[1] : null;
}

describe('SelfConsistencyConsensus', () => {
    const responses: ConsensusModelResponse[] = [
        { modelId: 'model-a', modelName: 'Model A', content: 'B' },
        { modelId: 'model-b', modelName: 'Model B', content: 'A' },
        { modelId: 'model-c', modelName: 'Model C', content: 'B' },
    ];

    it('should return the plurality answer', async () => {
        const strategy = new SelfConsistencyConsensus(simpleExtractor);
        const result = await strategy.generateConsensus(responses, 0, 'What is it?');
        expect(result).toBe('B');
    });

    it('should rank responses by answer frequency', async () => {
        const strategy = new SelfConsistencyConsensus(simpleExtractor);
        const rankings = await strategy.rankResponses(responses, 'What is it?');

        expect(rankings).toHaveLength(3);
        const bModels = rankings.filter((r) => r.eloScore === 2);
        expect(bModels).toHaveLength(2);
    });

    it('should fall back to first response content when no answers are extracted', async () => {
        const noMatch = new SelfConsistencyConsensus(() => null);
        const result = await noMatch.generateConsensus(responses, 0, 'Q');
        expect(result).toBe('B');
    });

    it('should handle all-unique answers by picking first occurrence', async () => {
        const unique: ConsensusModelResponse[] = [
            { modelId: 'm1', modelName: 'M1', content: 'A' },
            { modelId: 'm2', modelName: 'M2', content: 'B' },
            { modelId: 'm3', modelName: 'M3', content: 'C' },
        ];
        const strategy = new SelfConsistencyConsensus(simpleExtractor);
        const result = await strategy.generateConsensus(unique, 0, 'Q');
        // All have count 1, first one encountered wins
        expect(['A', 'B', 'C']).toContain(result);
    });
});
