import type { CouncilParticipant, CouncilBranch } from './councilTypes';
import type { CompletePromptFn } from './councilRounds';
/** Sequential pairwise ELO ranking of valid branches, rotating judges across pairings */
export declare function runCouncilEloRanking(validBranches: CouncilBranch[], prompt: string, participants: CouncilParticipant[], completePrompt: CompletePromptFn): Promise<CouncilBranch[]>;
//# sourceMappingURL=councilElo.d.ts.map