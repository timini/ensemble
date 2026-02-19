import { describe, expect, it } from 'vitest';
import {
    buildFallbackRankings,
    buildMajorityRankingPrompt,
    buildMajoritySynthesisPrompt,
    parseMajorityVotingOutput,
} from '../majorityVotingUtils';
import type { ConsensusModelResponse } from '@ensemble-ai/consensus-core';

describe('majorityVotingUtils', () => {
    const responses: ConsensusModelResponse[] = [
        { modelId: 'model-a', modelName: 'Model A', content: 'Response A' },
        { modelId: 'model-b', modelName: 'Model B', content: 'Response B' },
        { modelId: 'model-c', modelName: 'Model C', content: 'Response C' },
    ];

    it('builds ranking prompt with source responses and original prompt', () => {
        const prompt = buildMajorityRankingPrompt(responses, 'What is the answer?');

        expect(prompt).toContain('Original Question: What is the answer?');
        expect(prompt).toContain('Model ID: model-a');
        expect(prompt).toContain('Model Name: Model B');
        expect(prompt).toContain('Response:\nResponse C');
    });

    it('builds synthesis prompt with majority anchor and ranked text', () => {
        const prompt = buildMajoritySynthesisPrompt({
            prompt: 'Original prompt',
            rankedResponseText: '1. model-a\n2. model-b',
            majorityModel: 'model-a',
        });

        expect(prompt).toContain('Original Question: Original prompt');
        expect(prompt).toContain('Treat the model with ID "model-a" as the majority anchor.');
        expect(prompt).toContain('1. model-a\n2. model-b');
    });

    it('parses ranking JSON, clamps scores, and fills missing models', () => {
        const parsed = parseMajorityVotingOutput(
            JSON.stringify({
                rankings: [
                    { modelId: 'model-b', alignmentScore: 120 },
                    { modelId: 'model-a', alignmentScore: -5 },
                    { modelId: 'unknown-model', alignmentScore: 99 },
                    { modelId: 'model-b', alignmentScore: 50 },
                ],
            }),
            responses
        );

        expect(parsed).not.toBeNull();
        expect(parsed).toHaveLength(3);
        expect(parsed?.[0]).toEqual({ modelId: 'model-b', eloScore: 100, rank: 1 });
        expect(parsed?.map((entry) => entry.modelId)).toEqual([
            'model-b',
            'model-a',
            'model-c',
        ]);
        expect(parsed?.find((entry) => entry.modelId === 'model-c')?.eloScore).toBe(0);
    });

    it('parses fenced JSON output and returns null for invalid output', () => {
        const fenced = '```json\n{"rankings":[{"modelId":"model-a","alignmentScore":88}]}\n```';

        expect(parseMajorityVotingOutput(fenced, responses)?.[0]).toMatchObject({
            modelId: 'model-a',
            eloScore: 88,
            rank: 1,
        });
        expect(parseMajorityVotingOutput('not json', responses)).toBeNull();
    });

    it('builds deterministic fallback rankings in input order', () => {
        expect(buildFallbackRankings(responses)).toEqual([
            { modelId: 'model-a', eloScore: 0, rank: 1 },
            { modelId: 'model-b', eloScore: 0, rank: 2 },
            { modelId: 'model-c', eloScore: 0, rank: 3 },
        ]);
    });
});
