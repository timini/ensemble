import { describe, expect, it } from 'vitest';
import { normaliseShortAnswer } from '../answerNormalisation';

describe('normaliseShortAnswer', () => {
    describe('numbers', () => {
        it.each([
            ['42', '42.0'],
            ['42', '42.'],
            ['1,000', '1000'],
            ['$1,250.50', '1250.5'],
            ['0.5', '1/2'],
            ['-3', '−3'],
            ['42 km', '42'],
            ['50%', '50'],
            ['**42**', '42'],
            ['1e3', '1000'],
            ['2 million', '2,000,000'],
            ['1.5 billion dollars', '1500000000'],
            ['5k', '5000'],
        ])('treats %s and %s as the same answer', (a, b) => {
            expect(normaliseShortAnswer(a)).not.toBeNull();
            expect(normaliseShortAnswer(a)).toBe(normaliseShortAnswer(b));
        });

        it('keeps different numbers apart', () => {
            expect(normaliseShortAnswer('42')).not.toBe(normaliseShortAnswer('43'));
            expect(normaliseShortAnswer('0.1')).not.toBe(normaliseShortAnswer('0.10001'));
        });

        it('does not ignore scale words as units', () => {
            expect(normaliseShortAnswer('1 million')).toBe('num:1000000');
            expect(normaliseShortAnswer('1 million')).not.toBe(normaliseShortAnswer('1 billion'));
            expect(normaliseShortAnswer('1 million')).not.toBe(normaliseShortAnswer('1'));
        });
    });

    describe('option letters', () => {
        it.each(['B', 'b', '(B)', 'B.', 'B)', 'Option B', 'answer: b', '"B"'])(
            'reads %s as option B',
            (value) => {
                expect(normaliseShortAnswer(value)).toBe(normaliseShortAnswer('B'));
            },
        );

        it('keeps different letters apart', () => {
            expect(normaliseShortAnswer('A')).not.toBe(normaliseShortAnswer('B'));
        });
    });

    describe('yes and no', () => {
        it.each(['Yes', 'yes.', 'YES!', 'True', 'oui'])('reads %s as yes', (value) => {
            expect(normaliseShortAnswer(value)).toBe('yes');
        });

        it.each(['No', 'no.', 'False', 'non'])('reads %s as no', (value) => {
            expect(normaliseShortAnswer(value)).toBe('no');
        });
    });

    describe('short phrases', () => {
        it('ignores case, punctuation, extra spaces and a leading article', () => {
            expect(normaliseShortAnswer('The  Eiffel Tower.')).toBe(
                normaliseShortAnswer('eiffel tower'),
            );
        });

        it('ignores accents', () => {
            expect(normaliseShortAnswer('Montréal')).toBe(normaliseShortAnswer('montreal'));
        });

        it('keeps different phrases apart', () => {
            expect(normaliseShortAnswer('Paris')).not.toBe(normaliseShortAnswer('Lyon'));
        });

        it('does not confuse a phrase with a number or a letter', () => {
            expect(normaliseShortAnswer('forty two')).not.toBe(normaliseShortAnswer('42'));
            expect(normaliseShortAnswer('Bee')).not.toBe(normaliseShortAnswer('B'));
        });
    });

    it.each(['', '   ', '...'])('returns null for an empty answer (%j)', (value) => {
        expect(normaliseShortAnswer(value)).toBeNull();
    });

    it('returns null for long-form text', () => {
        const long =
            'The answer depends on several factors including the climate, the soil and how much water the plants get each week';
        expect(normaliseShortAnswer(long)).toBeNull();
    });
});
