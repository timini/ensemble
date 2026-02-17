import type { AIProvider } from '../providers/types';

/** Maps a model to its provider client for council participation */
export interface CouncilParticipant {
    modelId: string;
    modelName: string;
    provider: AIProvider;
    modelApiId: string;
}

/** One model critiquing another model's answer */
export interface Critique {
    criticModelId: string;
    targetModelId: string;
    content: string;
}

/** A model's rebuttal responding to critiques of its answer */
export interface Rebuttal {
    authorModelId: string;
    content: string;
}

/** One model's vote on whether a branch is valid. null means abstain (unparseable). */
export interface BranchVote {
    voterModelId: string;
    branchModelId: string;
    isValid: boolean | null;
    reasoning: string;
}

/** Full debate record for one model's position through the council process */
export interface CouncilBranch {
    modelId: string;
    modelName: string;
    initialAnswer: string;
    critiques: Critique[];
    rebuttal: Rebuttal | null;
    votes: BranchVote[];
    validVoteCount: number;
    isValid: boolean;
    eloScore: number;
    rank: number;
}

/** The complete debate record across all models */
export interface CouncilDebateTree {
    originalPrompt: string;
    branches: CouncilBranch[];
    validBranches: CouncilBranch[];
    rankings: CouncilBranch[];
    summary: string;
    metadata: {
        totalModels: number;
        validBranchCount: number;
        validityThreshold: number;
        topK: number;
        durationMs: number;
    };
}

/** Progress callback for future UI status updates */
export interface CouncilProgressEvent {
    round: 'critique' | 'rebuttal' | 'judgment' | 'elo' | 'summary';
    progress: number;
    message: string;
}

export type CouncilProgressCallback = (event: CouncilProgressEvent) => void;
