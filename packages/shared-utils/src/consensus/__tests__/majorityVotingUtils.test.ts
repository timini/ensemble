import { describe, expect, it } from 'vitest';
import {
    buildFallbackRankings,
    buildMajorityRankingPrompt,
    buildMajoritySynthesisPrompt,
    parseMajorityVotingOutput,
} from '../majorityVotingUtils';
import type { ConsensusModelResponse } from '../types';

describe('majorityVotingUtils', () => {
    const responses: ConsensusModelResponse[] = [
        { modelId: 'model-a', modelName: 'Model A', content: 'Response A' },
        { modelId: 'model-b', modelName: 'Model B', content: 'Response B' },
        { modelId: 'model-c', modelName: 'Model C', content: 'Response C' },
    ];

    it('builds anonymous ranking prompt with source responses and original prompt', () => {
        const { prompt, idMap } = buildMajorityRankingPrompt(responses, 'What is the answer?');

        expect(prompt).toContain('Original Question: What is the answer?');
        expect(prompt).toContain('Response ID: Response-1');
        expect(prompt).toContain('Response ID: Response-2');
        expect(prompt).toContain('Response ID: Response-3');
        // Should NOT contain real model IDs
        expect(prompt).not.toContain('Model ID: model-a');
        expect(prompt).not.toContain('Model Name: Model B');
        expect(prompt).toContain('Response:\nResponse C');
        // idMap should map anonymous IDs back to real IDs
        expect(idMap.get('Response-1')).toBe('model-a');
        expect(idMap.get('Response-2')).toBe('model-b');
        expect(idMap.get('Response-3')).toBe('model-c');
    });

    it('builds synthesis prompt with positional weighting instead of model identity', () => {
        const prompt = buildMajoritySynthesisPrompt({
            prompt: 'Original prompt',
            rankedResponseText: '1. response-1\n2. response-2',
        });

        expect(prompt).toContain('Original Question: Original prompt');
        expect(prompt).toContain('Weight the first response most heavily');
        expect(prompt).not.toContain('majority anchor');
        expect(prompt).toContain('1. response-1\n2. response-2');
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

    it('resolves anonymous IDs back to real IDs via idMap', () => {
        const idMap = new Map<string, string>([
            ['Response-1', 'model-a'],
            ['Response-2', 'model-b'],
            ['Response-3', 'model-c'],
        ]);
        const parsed = parseMajorityVotingOutput(
            JSON.stringify({
                rankings: [
                    { modelId: 'Response-2', alignmentScore: 90 },
                    { modelId: 'Response-1', alignmentScore: 70 },
                    { modelId: 'Response-3', alignmentScore: 50 },
                ],
            }),
            responses,
            idMap
        );

        expect(parsed).not.toBeNull();
        expect(parsed).toHaveLength(3);
        expect(parsed?.map((entry) => entry.modelId)).toEqual(['model-b', 'model-a', 'model-c']);
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
