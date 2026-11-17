import { describe, expect, it, vi } from 'vitest';
import type { AIProvider, ConsensusModelResponse } from '@ensemble-ai/consensus-core';
import { MajorityVotingConsensus } from '../MajorityVotingConsensus';

const responses: ConsensusModelResponse[] = [
    { modelId: 'm1', modelName: 'Model 1', content: 'Six times seven is 42.' },
    { modelId: 'm2', modelName: 'Model 2', content: 'The answer is 42.0' },
    { modelId: 'm3', modelName: 'Model 3', content: 'I think it is 41.' },
];

type Extracted = { id: string; kind: string; answer: string }[];

function provider(options: {
    extracted?: Extracted;
    structuredError?: Error;
    noStructured?: boolean;
}): AIProvider & { streamResponse: ReturnType<typeof vi.fn>; generateStructured: ReturnType<typeof vi.fn> } {
    const streamResponse = vi.fn(
        async (
            prompt: string,
            _model: string,
            _onChunk: (chunk: string) => void,
            onComplete: (full: string, time: number) => void,
        ) => {
            if (prompt.includes('majority alignment')) {
                onComplete(
                    JSON.stringify({
                        rankings: responses.map((r, i) => ({ modelId: r.modelId, alignmentScore: 90 - i })),
                    }),
                    10,
                );
            } else {
                onComplete('LLM synthesis', 10);
            }
        },
    );
    const generateStructured = vi.fn(async () => {
        if (options.structuredError) throw options.structuredError;
        const parsed = { answers: options.extracted ?? [] };
        return { parsed, raw: JSON.stringify(parsed), responseTimeMs: 5 };
    });
    return {
        streamResponse,
        generateStructured: options.noStructured ? undefined : generateStructured,
        generateEmbeddings: vi.fn(),
        validateApiKey: vi.fn(),
        listAvailableModels: vi.fn(),
        listAvailableTextModels: vi.fn(),
    } as never;
}

describe('MajorityVotingConsensus mechanical vote', () => {
    it('returns the winning short answer with one structured call and no LLM ranking', async () => {
        const p = provider({
            extracted: [
                { id: 'R1', kind: 'number', answer: '42' },
                { id: 'R2', kind: 'number', answer: '42.0' },
                { id: 'R3', kind: 'number', answer: '41' },
            ],
        });
        const strategy = new MajorityVotingConsensus(p, 'summarizer');

        const outcome = await strategy.runConsensus(responses, 0, 'What is 6 x 7?');

        expect(outcome.method).toBe('vote');
        expect(outcome.text).toBe('42');
        expect(outcome.vote?.status).toBe('winner');
        expect(outcome.vote?.winner).toMatchObject({ votes: 2, modelIds: ['m1', 'm2'] });
        expect(p.generateStructured).toHaveBeenCalledTimes(1);
        expect(p.generateStructured.mock.calls[0]![1]).toBe('summarizer');
        expect(p.streamResponse).not.toHaveBeenCalled();
    });

    it('generateConsensus returns the vote winner as text', async () => {
        const p = provider({
            extracted: [
                { id: 'R1', kind: 'letter', answer: 'B' },
                { id: 'R2', kind: 'letter', answer: '(B)' },
                { id: 'R3', kind: 'letter', answer: 'C' },
            ],
        });
        const strategy = new MajorityVotingConsensus(p, 'summarizer');

        await expect(strategy.generateConsensus(responses, 0, 'Pick one')).resolves.toBe('B');
    });

    it('falls back to the LLM method on a tie and still reports the vote', async () => {
        const p = provider({
            extracted: [
                { id: 'R1', kind: 'yes_no', answer: 'Yes' },
                { id: 'R2', kind: 'yes_no', answer: 'No' },
                { id: 'R3', kind: 'long_form', answer: '' },
            ],
        });
        const strategy = new MajorityVotingConsensus(p, 'summarizer');

        const outcome = await strategy.runConsensus(responses, 0, 'Is it?');

        expect(outcome.method).toBe('llm');
        expect(outcome.fallbackReason).toBe('tie');
        expect(outcome.text).toBe('LLM synthesis');
        expect(outcome.vote?.status).toBe('tie');
        expect(p.streamResponse).toHaveBeenCalledTimes(2);
    });

    it('falls back to the LLM method when the answers are long-form', async () => {
        const p = provider({
            extracted: responses.map((_, i) => ({ id: `R${i + 1}`, kind: 'long_form', answer: '' })),
        });
        const strategy = new MajorityVotingConsensus(p, 'summarizer');

        const outcome = await strategy.runConsensus(responses, 0, 'Explain');

        expect(outcome).toMatchObject({ method: 'llm', fallbackReason: 'long-form', text: 'LLM synthesis' });
        expect(outcome.vote?.status).toBe('no-short-answers');
    });

    it('falls back to the LLM method when extraction fails', async () => {
        const p = provider({ structuredError: new Error('400 bad schema') });
        const strategy = new MajorityVotingConsensus(p, 'summarizer');

        const outcome = await strategy.runConsensus(responses, 0, 'Q');

        expect(outcome).toMatchObject({
            method: 'llm',
            fallbackReason: 'extraction-failed',
            text: 'LLM synthesis',
            vote: null,
        });
    });

    it('falls back when extraction returns nothing usable', async () => {
        const p = provider({ extracted: [] });
        const outcome = await new MajorityVotingConsensus(p, 's').runConsensus(responses, 0, 'Q');
        expect(outcome).toMatchObject({ method: 'llm', fallbackReason: 'extraction-failed' });
    });

    it('falls back when the provider has no structured output', async () => {
        const p = provider({ noStructured: true });
        const outcome = await new MajorityVotingConsensus(p, 's').runConsensus(responses, 0, 'Q');
        expect(outcome).toMatchObject({ method: 'llm', fallbackReason: 'extraction-failed' });
    });
});
