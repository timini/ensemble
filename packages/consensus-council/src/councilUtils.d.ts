import type { Critique, CouncilBranch } from './councilTypes';
/** Builds a prompt instructing a model to critique another model's answer */
export declare function buildCritiquePrompt(originalPrompt: string, targetModelName: string, targetAnswer: string): string;
/** Builds a prompt instructing a model to defend or concede against critiques */
export declare function buildRebuttalPrompt(originalPrompt: string, originalAnswer: string, critiques: Critique[]): string;
/** Builds a prompt instructing a model to vote valid/invalid on a branch as JSON */
export declare function buildJudgmentPrompt(originalPrompt: string, branchModelName: string, answer: string, critiques: Critique[], rebuttal: string | null): string;
/** Builds a prompt to synthesize top-K valid branches into a final answer */
export declare function buildCouncilSummaryPrompt(originalPrompt: string, rankedBranches: CouncilBranch[]): string;
/** Parses a judgment vote JSON from LLM output, with fallback for unparseable output */
export declare function parseJudgmentVote(output: string): {
    isValid: boolean;
    reasoning: string;
};
/** Calculates whether a branch is valid based on vote count and threshold */
export declare function calculateBranchValidity(validVoteCount: number, totalModels: number, threshold: number): {
    validVoteCount: number;
    isValid: boolean;
};
//# sourceMappingURL=councilUtils.d.ts.map