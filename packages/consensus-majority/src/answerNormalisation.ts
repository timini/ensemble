/**
 * Normalisation of short final answers, so that answers written in different
 * ways ("42", "42.0", "$42") count as the same vote.
 */

/** Phrases with more words than this are long-form, not a short answer. */
export const MAX_SHORT_ANSWER_WORDS = 12;

const YES = new Set(['yes', 'true', 'correct', 'oui', 'vrai']);
const NO = new Set(['no', 'false', 'incorrect', 'non', 'faux']);
const ARTICLES = /^(the|a|an|le|la|les|l)\s+/;
const LETTER = /^(?:(?:option|answer|choice|réponse)\s*:?\s*)?\(?([a-z])\)?$/i;
const NUMBER = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(?:%|[a-z]+(?:\s[a-z]+)?)?$/i;
const FRACTION = /^([-+]?\d+)\s*\/\s*(\d+)$/;

function stripDecoration(value: string): string {
    return value
        .normalize('NFKC')
        .replace(/[*_`]+/g, '')
        .trim()
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
        .trim()
        .replace(/[.!?;:,]+$/, '')
        .trim();
}

function canonicalNumber(value: number): string {
    return `num:${String(Number(value.toPrecision(12)))}`;
}

function parseNumber(value: string): string | null {
    const cleaned = value
        .replace(/[−–]/g, '-')
        .replace(/[$€£¥]/g, '')
        .replace(/(\d),(?=\d{3}(?:\D|$))/g, '$1')
        .trim();
    const fraction = FRACTION.exec(cleaned);
    if (fraction) {
        const denominator = Number(fraction[2]);
        return denominator === 0 ? null : canonicalNumber(Number(fraction[1]) / denominator);
    }
    const match = NUMBER.exec(cleaned);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? canonicalNumber(parsed) : null;
}

function normalisePhrase(value: string): string | null {
    const words = value
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(ARTICLES, '');
    if (!words) return null;
    if (words.split(' ').length > MAX_SHORT_ANSWER_WORDS) return null;
    return `text:${words}`;
}

/**
 * Turn a short final answer into a key that equal answers share.
 *
 * - yes/no (also true/false, oui/non) become `yes` or `no`
 * - option letters ("B", "(b)", "Option B") become `letter:B`
 * - numbers ("1,000", "$42", "42 km", "1/2") become `num:<value>`; units are
 *   ignored
 * - anything else becomes a lower-case phrase without punctuation, accents or
 *   a leading article
 *
 * @returns the key, or null when the answer is empty or long-form
 */
export function normaliseShortAnswer(raw: string): string | null {
    const value = stripDecoration(raw);
    if (!value) return null;

    const lower = value.toLowerCase();
    if (YES.has(lower)) return 'yes';
    if (NO.has(lower)) return 'no';

    const letter = LETTER.exec(value);
    if (letter) return `letter:${letter[1]!.toUpperCase()}`;

    return parseNumber(value) ?? normalisePhrase(value);
}
