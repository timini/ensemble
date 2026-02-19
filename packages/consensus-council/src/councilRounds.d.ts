import type { AIProvider } from '@ensemble-ai/consensus-core';
import type { CouncilParticipant, CouncilBranch } from './councilTypes';
export type CompletePromptFn = (provider: AIProvider, modelId: string, prompt: string) => Promise<string>;
export type FindParticipantFn = (modelId: string) => CouncilParticipant | undefined;
/** N*(N-1) parallel critique calls — each model critiques every other model */
export declare function runCritiqueRound(branches: CouncilBranch[], prompt: string, findParticipant: FindParticipantFn, completePrompt: CompletePromptFn): Promise<CouncilBranch[]>;
/** N parallel rebuttal calls — each model responds to critiques of its answer */
export declare function runRebuttalRound(branches: CouncilBranch[], prompt: string, findParticipant: FindParticipantFn, completePrompt: CompletePromptFn): Promise<CouncilBranch[]>;
/** N*(N-1) parallel judgment calls — each model votes on every other model's branch */
export declare function runJudgmentRound(branches: CouncilBranch[], prompt: string, findParticipant: FindParticipantFn, completePrompt: CompletePromptFn, validityThreshold: number): Promise<CouncilBranch[]>;
//# sourceMappingURL=councilRounds.d.ts.map