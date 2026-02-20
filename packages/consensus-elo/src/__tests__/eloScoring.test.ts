import { describe, it, expect } from 'vitest';
import {
    INITIAL_ELO,
    K_FACTOR_HIGH,
    K_FACTOR_LOW,
    effectiveKFactor,
    expectedScore,
    updateElo,
} from '../eloScoring';

describe('eloScoring', () => {
    describe('effectiveKFactor', () => {
        it('should return K_FACTOR_HIGH for HIGH confidence', () => {
            expect(effectiveKFactor('HIGH')).toBe(K_FACTOR_HIGH);
            expect(effectiveKFactor('HIGH')).toBe(32);
        });

        it('should return K_FACTOR_LOW for LOW confidence', () => {
            expect(effectiveKFactor('LOW')).toBe(K_FACTOR_LOW);
            expect(effectiveKFactor('LOW')).toBe(16);
        });

        it('should return 2x the value for HIGH vs LOW', () => {
            expect(effectiveKFactor('HIGH')).toBe(2 * effectiveKFactor('LOW'));
        });
    });

    describe('expectedScore', () => {
        it('should return 0.5 for equal ratings', () => {
            expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 10);
        });

        it('should return higher expected score for higher-rated player', () => {
            const exp = expectedScore(1400, 1200);
            expect(exp).toBeGreaterThan(0.5);
            expect(exp).toBeLessThan(1);
        });

        it('should return lower expected score for lower-rated player', () => {
            const exp = expectedScore(1200, 1400);
            expect(exp).toBeLessThan(0.5);
            expect(exp).toBeGreaterThan(0);
        });

        it('should sum to 1 for any pair of ratings', () => {
            const expA = expectedScore(1300, 1100);
            const expB = expectedScore(1100, 1300);
            expect(expA + expB).toBeCloseTo(1, 10);
        });

        it('should handle extreme rating differences without overflow', () => {
            // 10000 point difference — without clamping, 10^(10000/400) = 10^25 = Infinity
            const exp = expectedScore(0, 10000);
            expect(exp).toBeGreaterThan(0);
            expect(exp).toBeLessThan(1);
            expect(Number.isFinite(exp)).toBe(true);
        });

        it('should return near-1 for massively favored player', () => {
            const exp = expectedScore(10000, 0);
            expect(exp).toBeGreaterThan(0.99);
            expect(Number.isFinite(exp)).toBe(true);
        });
    });

    describe('updateElo', () => {
        it('should produce no change for equal ratings and a tie', () => {
            const scores = new Map([['a', 1200], ['b', 1200]]);
            updateElo(scores, 'a', 'b', null, 'HIGH');

            expect(scores.get('a')).toBeCloseTo(1200, 5);
            expect(scores.get('b')).toBeCloseTo(1200, 5);
        });

        it('should increase winner rating and decrease loser rating by equal amounts', () => {
            const scores = new Map([['a', 1200], ['b', 1200]]);
            updateElo(scores, 'a', 'b', 'a', 'HIGH');

            const deltaA = scores.get('a')! - 1200;
            const deltaB = scores.get('b')! - 1200;

            expect(deltaA).toBeGreaterThan(0);
            expect(deltaB).toBeLessThan(0);
            // Zero-sum: gains = losses
            expect(deltaA + deltaB).toBeCloseTo(0, 10);
        });

        it('should produce 2x the delta for HIGH vs LOW confidence', () => {
            const scoresHigh = new Map([['a', 1200], ['b', 1200]]);
            updateElo(scoresHigh, 'a', 'b', 'a', 'HIGH');
            const deltaHigh = scoresHigh.get('a')! - 1200;

            const scoresLow = new Map([['a', 1200], ['b', 1200]]);
            updateElo(scoresLow, 'a', 'b', 'a', 'LOW');
            const deltaLow = scoresLow.get('a')! - 1200;

            expect(deltaHigh).toBeCloseTo(2 * deltaLow, 5);
        });

        it('should push unequal ratings toward each other on a tie', () => {
            const scores = new Map([['a', 1400], ['b', 1000]]);
            updateElo(scores, 'a', 'b', null, 'HIGH');

            // a was higher and tied, so a should decrease
            expect(scores.get('a')!).toBeLessThan(1400);
            // b was lower and tied, so b should increase
            expect(scores.get('b')!).toBeGreaterThan(1000);
        });

        it('should work correctly when player B wins', () => {
            const scores = new Map([['a', 1200], ['b', 1200]]);
            updateElo(scores, 'a', 'b', 'b', 'HIGH');

            expect(scores.get('b')!).toBeGreaterThan(1200);
            expect(scores.get('a')!).toBeLessThan(1200);
        });

        it('should use INITIAL_ELO constant value of 1200', () => {
            expect(INITIAL_ELO).toBe(1200);
        });

        it('should throw when player ID is not in the scores map', () => {
            const scores = new Map([['a', 1200]]);
            expect(() => updateElo(scores, 'a', 'missing', 'a', 'HIGH'))
                .toThrow('Missing ELO score for player: missing');
        });
    });
});
