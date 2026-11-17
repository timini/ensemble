import { describe, expect, it } from 'vitest';
import type { ConsensusModelResponse } from '@ensemble-ai/consensus-core';
import {
    ANSWER_EXTRACTION_SCHEMA,
    buildAnswerExtractionPrompt,
    parseAnswerExtraction,
    tallyVotes,
    type ExtractedAnswer,
} from '../mechanicalVote';

const responses = (n: number): ConsensusModelResponse[] =>
    Array.from({ length: n }, (_, i) => ({
        modelId: `m${i + 1}`,
        modelName: `Model ${i + 1}`,
        content: `Response ${i + 1}`,
    }));

const ballots = (answers: (string | null)[]): ExtractedAnswer[] =>
    answers.map((answer, i) => ({
        modelId: `m${i + 1}`,
        modelName: `Model ${i + 1}`,
        answer,
    }));

describe('tallyVotes', () => {
    it('picks the numeric answer most models gave, after normalising', () => {
        const vote = tallyVotes(ballots(['42', '42.0', '41', '$42']));

        expect(vote.status).toBe('winner');
        expect(vote.winner).toMatchObject({ answer: '42', votes: 3, modelIds: ['m1', 'm2', 'm4'] });
        expect(vote.tallies.map((t) => t.votes)).toEqual([3, 1]);
        expect(vote.totalResponses).toBe(4);
        expect(vote.abstentions).toEqual([]);
    });

    it('counts option letters written in different ways as one answer', () => {
        const vote = tallyVotes(ballots(['B', '(b)', 'Option C', 'B.']));

        expect(vote.status).toBe('winner');
        expect(vote.winner).toMatchObject({ answer: 'B', votes: 3 });
        expect(vote.tallies[1]).toMatchObject({ answer: 'Option C', votes: 1, modelIds: ['m3'] });
    });

    it('counts yes and no votes', () => {
        const vote = tallyVotes(ballots(['Yes', 'no', 'yes.', 'True', 'No']));

        expect(vote.status).toBe('winner');
        expect(vote.winner).toMatchObject({ answer: 'Yes', votes: 3 });
        expect(vote.tallies[1]).toMatchObject({ votes: 2, modelIds: ['m2', 'm5'] });
    });

    it('reports a tie when two answers share the most votes', () => {
        const vote = tallyVotes(ballots(['A', 'B', 'a', 'b']));

        expect(vote.status).toBe('tie');
        expect(vote.winner).toBeNull();
        expect(vote.tied.map((t) => t.answer)).toEqual(['A', 'B']);
        expect(vote.tied.every((t) => t.votes === 2)).toBe(true);
    });

    it('reports a tie when every model gives a different answer', () => {
        const vote = tallyVotes(ballots(['1', '2', '3']));

        expect(vote.status).toBe('tie');
        expect(vote.tied).toHaveLength(3);
    });

    it('lists models with no short answer as abstentions', () => {
        const vote = tallyVotes(ballots(['Paris', 'paris', null]));

        expect(vote.status).toBe('winner');
        expect(vote.winner).toMatchObject({ votes: 2 });
        expect(vote.abstentions).toEqual(['m3']);
    });

    it('finds no short answers when most models abstain', () => {
        const vote = tallyVotes(ballots(['Paris', null, null]));

        expect(vote.status).toBe('no-short-answers');
        expect(vote.winner).toBeNull();
        expect(vote.abstentions).toEqual(['m2', 'm3']);
    });

    it('treats long-form text as an abstention', () => {
        const long =
            'It depends on the context, the time of year, the local regulations and several other considerations worth discussing';
        const vote = tallyVotes(ballots([long, long, '7']));

        expect(vote.status).toBe('no-short-answers');
    });
});

describe('buildAnswerExtractionPrompt', () => {
    it('labels each response and includes the question', () => {
        const prompt = buildAnswerExtractionPrompt(responses(2), 'What is 6 x 7?');

        expect(prompt).toContain('What is 6 x 7?');
        expect(prompt).toContain('[R1]');
        expect(prompt).toContain('Response 1');
        expect(prompt).toContain('[R2]');
    });
});

describe('ANSWER_EXTRACTION_SCHEMA', () => {
    it('is a strict schema every provider accepts', () => {
        const schema = ANSWER_EXTRACTION_SCHEMA.schema as {
            additionalProperties: boolean;
            required: string[];
            properties: { answers: { items: { required: string[]; additionalProperties: boolean } } };
        };
        expect(schema.additionalProperties).toBe(false);
        expect(schema.required).toEqual(['answers']);
        expect(schema.properties.answers.items.required).toEqual(['id', 'kind', 'answer']);
        expect(schema.properties.answers.items.additionalProperties).toBe(false);
    });
});

describe('parseAnswerExtraction', () => {
    it('maps extracted answers back to models and drops long-form ones', () => {
        const parsed = parseAnswerExtraction(
            {
                answers: [
                    { id: 'R2', kind: 'number', answer: '42' },
                    { id: 'R1', kind: 'number', answer: '42' },
                    { id: 'R3', kind: 'long_form', answer: 'A long essay' },
                ],
            },
            responses(3),
        );

        expect(parsed).toEqual([
            { modelId: 'm1', modelName: 'Model 1', answer: '42' },
            { modelId: 'm2', modelName: 'Model 2', answer: '42' },
            { modelId: 'm3', modelName: 'Model 3', answer: null },
        ]);
    });

    it('treats a missing response as an abstention', () => {
        const parsed = parseAnswerExtraction({ answers: [{ id: 'R1', kind: 'letter', answer: 'C' }] }, responses(2));
        expect(parsed?.[1]).toEqual({ modelId: 'm2', modelName: 'Model 2', answer: null });
    });

    it.each([{}, null, { answers: 'nope' }, { answers: [] }])(
        'returns null when the output has no answers (%j)',
        (value) => {
            expect(parseAnswerExtraction(value, responses(2))).toBeNull();
        },
    );
});
