import { describe, it, expect } from 'vitest';
import {
    buildCritiquePrompt,
    buildRebuttalPrompt,
    buildJudgmentPrompt,
    buildCouncilSummaryPrompt,
    parseJudgmentVote,
    calculateBranchValidity,
} from '../councilUtils';
import type { Critique, CouncilBranch } from '../councilTypes';

describe('councilUtils', () => {
    describe('buildCritiquePrompt', () => {
        it('should include the original prompt', () => {
            const result = buildCritiquePrompt('What is AI?', 'GPT-4o', 'AI is machine intelligence.');
            expect(result).toContain('What is AI?');
        });

        it('should include the target model name', () => {
            const result = buildCritiquePrompt('What is AI?', 'GPT-4o', 'AI is machine intelligence.');
            expect(result).toContain('GPT-4o');
        });

        it('should include the target answer', () => {
            const result = buildCritiquePrompt('What is AI?', 'GPT-4o', 'AI is machine intelligence.');
            expect(result).toContain('AI is machine intelligence.');
        });

        it('should instruct the model to find errors in reasoning', () => {
            const result = buildCritiquePrompt('What is AI?', 'GPT-4o', 'AI is machine intelligence.');
            expect(result.toLowerCase()).toMatch(/error|logic|fact/);
        });
    });

    describe('buildRebuttalPrompt', () => {
        const critiques: Critique[] = [
            { criticModelId: 'model-b', targetModelId: 'model-a', content: 'Missing key details about neural networks.' },
            { criticModelId: 'model-c', targetModelId: 'model-a', content: 'Too simplistic explanation.' },
        ];

        it('should include the original prompt', () => {
            const result = buildRebuttalPrompt('What is AI?', 'AI is machine intelligence.', critiques);
            expect(result).toContain('What is AI?');
        });

        it('should include the original answer', () => {
            const result = buildRebuttalPrompt('What is AI?', 'AI is machine intelligence.', critiques);
            expect(result).toContain('AI is machine intelligence.');
        });

        it('should include all critique contents', () => {
            const result = buildRebuttalPrompt('What is AI?', 'AI is machine intelligence.', critiques);
            expect(result).toContain('Missing key details about neural networks.');
            expect(result).toContain('Too simplistic explanation.');
        });
    });

    describe('buildJudgmentPrompt', () => {
        const critiques: Critique[] = [
            { criticModelId: 'model-b', targetModelId: 'model-a', content: 'Lacks depth.' },
        ];
        const rebuttal = 'I provided a concise overview which is appropriate for the question.';

        it('should include the original prompt', () => {
            const result = buildJudgmentPrompt('What is AI?', 'GPT-4o', 'AI is intelligence.', critiques, rebuttal);
            expect(result).toContain('What is AI?');
        });

        it('should include the branch model name', () => {
            const result = buildJudgmentPrompt('What is AI?', 'GPT-4o', 'AI is intelligence.', critiques, rebuttal);
            expect(result).toContain('GPT-4o');
        });

        it('should include the answer, critiques, and rebuttal', () => {
            const result = buildJudgmentPrompt('What is AI?', 'GPT-4o', 'AI is intelligence.', critiques, rebuttal);
            expect(result).toContain('AI is intelligence.');
            expect(result).toContain('Lacks depth.');
            expect(result).toContain('I provided a concise overview');
        });

        it('should instruct output as JSON with isValid and reasoning', () => {
            const result = buildJudgmentPrompt('What is AI?', 'GPT-4o', 'AI is intelligence.', critiques, rebuttal);
            expect(result).toContain('isValid');
            expect(result).toContain('reasoning');
            expect(result.toLowerCase()).toContain('json');
        });
    });

    describe('buildCouncilSummaryPrompt', () => {
        const branches: CouncilBranch[] = [
            {
                modelId: 'model-a',
                modelName: 'GPT-4o',
                initialAnswer: 'AI is machine intelligence.',
                critiques: [],
                rebuttal: null,
                votes: [],
                validVoteCount: 3,
                isValid: true,
                eloScore: 1250,
                rank: 1,
            },
            {
                modelId: 'model-b',
                modelName: 'Claude',
                initialAnswer: 'AI mimics human cognition.',
                critiques: [],
                rebuttal: null,
                votes: [],
                validVoteCount: 3,
                isValid: true,
                eloScore: 1200,
                rank: 2,
            },
        ];

        it('should include the original prompt', () => {
            const result = buildCouncilSummaryPrompt('What is AI?', branches);
            expect(result).toContain('What is AI?');
        });

        it('should include ranked branch answers', () => {
            const result = buildCouncilSummaryPrompt('What is AI?', branches);
            expect(result).toContain('AI is machine intelligence.');
            expect(result).toContain('AI mimics human cognition.');
        });

        it('should include model names and ranks', () => {
            const result = buildCouncilSummaryPrompt('What is AI?', branches);
            expect(result).toContain('GPT-4o');
            expect(result).toContain('Claude');
        });
    });

    describe('parseJudgmentVote', () => {
        it('should parse valid JSON with isValid true', () => {
            const input = '{"isValid": true, "reasoning": "Good answer."}';
            const result = parseJudgmentVote(input);
            expect(result).toEqual({ isValid: true, reasoning: 'Good answer.' });
        });

        it('should parse valid JSON with isValid false', () => {
            const input = '{"isValid": false, "reasoning": "Incorrect facts."}';
            const result = parseJudgmentVote(input);
            expect(result).toEqual({ isValid: false, reasoning: 'Incorrect facts.' });
        });

        it('should parse JSON wrapped in markdown code fences', () => {
            const input = '```json\n{"isValid": true, "reasoning": "Solid response."}\n```';
            const result = parseJudgmentVote(input);
            expect(result).toEqual({ isValid: true, reasoning: 'Solid response.' });
        });

        it('should parse JSON wrapped in plain code fences', () => {
            const input = '```\n{"isValid": false, "reasoning": "Weak argument."}\n```';
            const result = parseJudgmentVote(input);
            expect(result).toEqual({ isValid: false, reasoning: 'Weak argument.' });
        });

        it('should default to valid for lorem ipsum / unparseable output', () => {
            const input = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
            const result = parseJudgmentVote(input);
            expect(result).toEqual({ isValid: true, reasoning: '' });
        });

        it('should default to valid for empty string', () => {
            const result = parseJudgmentVote('');
            expect(result).toEqual({ isValid: true, reasoning: '' });
        });

        it('should handle JSON with extra whitespace', () => {
            const input = '  { "isValid" : true , "reasoning" : "OK" }  ';
            const result = parseJudgmentVote(input);
            expect(result).toEqual({ isValid: true, reasoning: 'OK' });
        });

        it('should handle JSON missing reasoning field', () => {
            const input = '{"isValid": false}';
            const result = parseJudgmentVote(input);
            expect(result).toEqual({ isValid: false, reasoning: '' });
        });
    });

    describe('calculateBranchValidity', () => {
        it('should return valid when votes exceed threshold', () => {
            const result = calculateBranchValidity(3, 4, 0.5);
            expect(result).toEqual({ validVoteCount: 3, isValid: true });
        });

        it('should return invalid when votes are below threshold', () => {
            const result = calculateBranchValidity(1, 4, 0.5);
            expect(result).toEqual({ validVoteCount: 1, isValid: false });
        });

        it('should return valid when votes are exactly at 50% threshold', () => {
            const result = calculateBranchValidity(2, 4, 0.5);
            expect(result).toEqual({ validVoteCount: 2, isValid: true });
        });

        it('should handle zero valid votes', () => {
            const result = calculateBranchValidity(0, 4, 0.5);
            expect(result).toEqual({ validVoteCount: 0, isValid: false });
        });

        it('should handle zero total models', () => {
            const result = calculateBranchValidity(0, 0, 0.5);
            expect(result).toEqual({ validVoteCount: 0, isValid: false });
        });

        it('should work with custom threshold', () => {
            const result = calculateBranchValidity(2, 3, 0.75);
            expect(result).toEqual({ validVoteCount: 2, isValid: false });
        });
    });
});
