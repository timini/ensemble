import type { ConsensusModelResponse, JsonSchema } from '@ensemble-ai/consensus-core';
import { normaliseShortAnswer } from './answerNormalisation';

/** The kind of final answer the extraction call found in a response. */
export type ShortAnswerKind =
    | 'number'
    | 'letter'
    | 'yes_no'
    | 'short_phrase'
    | 'long_form'
    | 'none';

const SHORT_KINDS: ReadonlySet<string> = new Set(['number', 'letter', 'yes_no', 'short_phrase']);

/** One model's extracted final answer, or null when it gave no short answer. */
export interface ExtractedAnswer {
    modelId: string;
    modelName: string;
    answer: string | null;
}

/** Votes for one normalised answer. */
export interface MajorityTally {
    /** The answer as the first model that gave it wrote it. */
    answer: string;
    /** Normalised key shared by every vote in this tally. */
    normalised: string;
    votes: number;
    modelIds: string[];
}

/**
 * - `winner`: one answer has more votes than any other (at least 2).
 * - `tie`: two or more answers share the most votes.
 * - `no-short-answers`: fewer than half the responses (or fewer than 2) had
 *   a short answer to count.
 */
export type MajorityVoteStatus = 'winner' | 'tie' | 'no-short-answers';

export interface MajorityVoteResult {
    status: MajorityVoteStatus;
    winner: MajorityTally | null;
    /** Tallies sharing the top count when the status is `tie`. */
    tied: MajorityTally[];
    /** Every tally, most votes first. */
    tallies: MajorityTally[];
    totalResponses: number;
    /** Models whose response had no short answer. */
    abstentions: string[];
}

/** Strict schema for the batched extraction call. */
export const ANSWER_EXTRACTION_SCHEMA: JsonSchema = {
    name: 'final_answers',
    schema: {
        type: 'object',
        properties: {
            answers: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        kind: {
                            type: 'string',
                            enum: ['number', 'letter', 'yes_no', 'short_phrase', 'long_form', 'none'],
                        },
                        answer: { type: 'string' },
                    },
                    required: ['id', 'kind', 'answer'],
                    additionalProperties: false,
                },
            },
        },
        required: ['answers'],
        additionalProperties: false,
    },
};

const responseLabel = (index: number) => `R${index + 1}`;

/** Prompt asking the summarizer for each response's final answer in one call. */
export function buildAnswerExtractionPrompt(
    responses: ConsensusModelResponse[],
    question: string,
): string {
    const body = responses
        .map((response, index) => `[${responseLabel(index)}]\n${response.content}`)
        .join('\n\n---\n\n');

    return `
Extract the final answer from each response to the question below. Do not judge which answer is correct.

Question: ${question}

Responses:
${body}

For each response, return its id (R1, R2, ...), the kind of final answer and the answer itself:
- number: a single number, written as digits (for example "42" or "3.5")
- letter: a multiple-choice option letter (for example "B")
- yes_no: "yes" or "no"
- short_phrase: a name or phrase of a few words
- long_form: an explanation, list or essay with no single short final answer
- none: the response gives no answer
Use an empty answer for long_form and none. Include every response exactly once.
    `.trim();
}

/**
 * Map the extraction output back to the responses. Responses the output
 * leaves out, or marks as long_form or none, get a null answer.
 *
 * @returns null when the output holds no answers at all
 */
export function parseAnswerExtraction(
    parsed: unknown,
    responses: ConsensusModelResponse[],
): ExtractedAnswer[] | null {
    const answers = (parsed as { answers?: unknown } | null)?.answers;
    if (!Array.isArray(answers) || answers.length === 0) return null;

    const byId = new Map<string, string>();
    for (const item of answers as { id?: unknown; kind?: unknown; answer?: unknown }[]) {
        if (typeof item?.id !== 'string' || typeof item.answer !== 'string') continue;
        if (typeof item.kind !== 'string' || !SHORT_KINDS.has(item.kind)) continue;
        if (!byId.has(item.id) && item.answer.trim()) byId.set(item.id, item.answer.trim());
    }

    return responses.map((response, index) => ({
        modelId: response.modelId,
        modelName: response.modelName,
        answer: byId.get(responseLabel(index)) ?? null,
    }));
}

/**
 * The consensus text for a winning tally. A numeric answer returns its
 * canonical value ("1/2" gives "0.5", "1,000" gives "1000") so that scorers
 * read the number the vote counted, not the first model's wording.
 */
export function winningAnswerText(tally: MajorityTally): string {
    return tally.normalised.startsWith('num:') ? tally.normalised.slice(4) : tally.answer;
}

/** Count normalised votes and decide the winner, a tie, or no short answers. */
export function tallyVotes(ballots: ExtractedAnswer[]): MajorityVoteResult {
    const tallies = new Map<string, MajorityTally>();
    const abstentions: string[] = [];

    for (const ballot of ballots) {
        const key = ballot.answer === null ? null : normaliseShortAnswer(ballot.answer);
        if (key === null || ballot.answer === null) {
            abstentions.push(ballot.modelId);
            continue;
        }
        const tally = tallies.get(key);
        if (tally) {
            tally.votes += 1;
            tally.modelIds.push(ballot.modelId);
        } else {
            tallies.set(key, {
                answer: ballot.answer,
                normalised: key,
                votes: 1,
                modelIds: [ballot.modelId],
            });
        }
    }

    // Stable sort keeps first-seen order among equal counts.
    const sorted = [...tallies.values()].sort((a, b) => b.votes - a.votes);
    const voters = ballots.length - abstentions.length;
    const base = { tallies: sorted, totalResponses: ballots.length, abstentions };

    if (voters < 2 || voters * 2 < ballots.length) {
        return { ...base, status: 'no-short-answers', winner: null, tied: [] };
    }
    const top = sorted[0]!;
    const tied = sorted.filter((tally) => tally.votes === top.votes);
    if (tied.length > 1) {
        return { ...base, status: 'tie', winner: null, tied };
    }
    return { ...base, status: 'winner', winner: top, tied: [] };
}
