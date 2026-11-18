import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "~/store";
import { EloRankingConsensus } from "@ensemble-ai/consensus-elo";
import { MajorityVotingConsensus } from "@ensemble-ai/consensus-majority";
import { StandardConsensus } from "@ensemble-ai/consensus-standard";
import { CouncilConsensus } from "@ensemble-ai/consensus-council";
import type { ConsensusModelResponse } from "@ensemble-ai/consensus-core";
import type { CouncilParticipant } from "@ensemble-ai/consensus-council";
import {
  ProviderRegistry,
  type ProviderName,
} from "@ensemble-ai/shared-utils/providers";
import { withUsageTracking } from "@ensemble-ai/shared-utils/pricing";
import { withAbortSignal } from "@ensemble-ai/shared-utils/providers";
import { resolveClientMode } from "~/lib/proMode";
import { FALLBACK_MODELS } from "~/lib/models";
import { logger } from "~/lib/logger";
import { toMajorityVoteRecord } from "~/lib/majorityVote";
import { selectRunModels } from "~/store/slices/responseSlice";
import { summarizerOrFallback } from "~/lib/summarizerChoice";

export function useConsensusGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { t } = useTranslation("common");
  const [error, setError] = useState<string | null>(null);
  // Id of the latest consensus run. restart() bumps it, so a run that was
  // still in flight finishes without storing its stale result.
  const runId = useRef(0);
  // Aborts the calls of the consensus in flight (restart, Stop, a new run).
  const abort = useRef<AbortController | null>(null);

  const setMetaAnalysis = useStore((state) => state.setMetaAnalysis);
  const summarizerModelId = useStore((state) => state.summarizerModel);
  const consensusMethod = useStore((state) => state.consensusMethod);
  const eloTopN = useStore((state) => state.eloTopN);
  const mode = useStore((state) => state.mode);
  const addConsensusUsage = useStore((state) => state.addConsensusUsage);
  const setMajorityVote = useStore((state) => state.setMajorityVote);

  const generateConsensus = async (
    responses: { modelId: string; modelName: string; content: string }[],
    originalPrompt: string,
    summarizerOverride?: string,
  ) => {
    // Use override if provided, otherwise fall back to store value
    const effectiveSummarizerModelId = summarizerOrFallback(
      summarizerOverride,
      summarizerModelId ?? undefined,
    );

    if (!effectiveSummarizerModelId) {
      setError(t("errors.consensus.noSummarizer"));
      logger.error("Consensus generation failed: No summarizer model");
      return;
    }

    if (responses.length === 0) {
      setError(t("errors.consensus.noResponses"));
      return;
    }

    // What this attempt is made with, recorded with its result.
    const settings = {
      consensusMethod,
      summarizerModel: effectiveSummarizerModelId,
    };
    const id = ++runId.current;
    const isCurrent = () => id === runId.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setIsGenerating(true);
    setError(null);
    setMajorityVote(null);
    // Consensus usage is not cleared here: a regenerate (for example after
    // a summarizer change) adds to the calls earlier attempts already
    // billed. resetStreamingState clears it when a new run starts.

    try {
      // Resolve Dependencies
      const registry = ProviderRegistry.getInstance();
      const clientMode = resolveClientMode(mode);

      // Resolve the provider for the summarizer model.
      // Try: FALLBACK_MODELS → selected models in store
      const summarizerModelDef = FALLBACK_MODELS.find(
        (m) => m.id === effectiveSummarizerModelId,
      );

      let providerName: ProviderName;
      if (summarizerModelDef) {
        providerName = validateProviderName(summarizerModelDef.provider);
      } else {
        const selectedModels = selectRunModels(useStore.getState());
        const fromStore = selectedModels.find(
          (m) => m.model === effectiveSummarizerModelId,
        );
        if (fromStore) {
          providerName = validateProviderName(fromStore.provider);
        } else {
          throw new Error(
            `Cannot determine provider for summarizer model: ${effectiveSummarizerModelId}`,
          );
        }
      }
      // Every consensus call goes through a tracked provider so the
      // review page can show what the run cost.
      const trackedProvider = (name: ProviderName) =>
        withUsageTracking(
          withAbortSignal(
            registry.getProvider(name, clientMode),
            controller.signal,
          ),
          name,
          addConsensusUsage,
        );
      const providerClient = trackedProvider(providerName);

      const consensusResponses: ConsensusModelResponse[] = responses.map(
        (r) => ({
          modelId: r.modelId,
          modelName: r.modelName,
          content: r.content,
        }),
      );

      let resultText = "";

      if (consensusMethod === "elo") {
        const strategy = new EloRankingConsensus(
          providerClient,
          effectiveSummarizerModelId,
          providerClient,
          effectiveSummarizerModelId,
        );

        resultText = await strategy.generateConsensus(
          consensusResponses,
          eloTopN,
          originalPrompt,
        );
      } else if (consensusMethod === "majority") {
        const strategy = new MajorityVotingConsensus(
          providerClient,
          effectiveSummarizerModelId,
        );

        // Vote on short answers first; the strategy falls back to the
        // LLM method and says why when the vote cannot decide.
        const outcome = await strategy.runConsensus(
          consensusResponses,
          0,
          originalPrompt,
        );
        if (isCurrent())
          setMajorityVote(toMajorityVoteRecord(outcome, consensusResponses));
        resultText = outcome.text;
      } else if (consensusMethod === "council") {
        const selectedModels = selectRunModels(useStore.getState());
        const participants: CouncilParticipant[] = selectedModels.map((m) => {
          const pName = validateProviderName(m.provider);
          return {
            modelId: m.id,
            modelName: m.model,
            provider: trackedProvider(pName),
            modelApiId: m.model,
          };
        });

        const strategy = new CouncilConsensus({
          participants,
          summarizerProvider: providerClient,
          summarizerModelId: effectiveSummarizerModelId,
        });

        resultText = await strategy.generateConsensus(
          consensusResponses,
          eloTopN,
          originalPrompt,
        );
      } else {
        const strategy = new StandardConsensus(
          providerClient,
          effectiveSummarizerModelId,
        );

        resultText = await strategy.generateConsensus(
          consensusResponses,
          0,
          originalPrompt,
        );
      }

      if (!isCurrent()) return;

      if (isConsensusFailureText(resultText)) {
        const fallbackError = new Error(resultText);
        logger.error(
          `Consensus strategy returned failure sentinel (${consensusMethod})`,
          fallbackError,
        );
        setError(resultText);
        return;
      }

      setMetaAnalysis(resultText, settings);
    } catch (err: unknown) {
      const normalizedError =
        err instanceof Error ? err : new Error(String(err));
      logger.error("Consensus Generation Error:", normalizedError);
      if (isCurrent())
        setError(normalizedError.message || t("errors.consensus.failed"));
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateConsensus,
    isGenerating,
    error,
    /**
     * Clears a consensus error and drops the result of any consensus still
     * running, so the trigger runs consensus again on the current answers
     * (for example after a failed model is retried). Calls already made
     * stay in the run cost.
     */
    restart: () => {
      runId.current += 1;
      abort.current?.abort();
      abort.current = null;
      setError(null);
    },
    /**
     * Stops the consensus in flight and keeps it stopped (as an error the
     * user can retry), so the trigger does not start it again after Stop.
     */
    stop: () => {
      runId.current += 1;
      abort.current?.abort();
      abort.current = null;
      setError(t("errors.consensus.stopped"));
    },
    consensusMethod,
  };
}

const VALID_PROVIDERS: ProviderName[] = [
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "perplexity",
  "openai-compatible",
];

function validateProviderName(provider: string): ProviderName {
  if (VALID_PROVIDERS.includes(provider as ProviderName)) {
    return provider as ProviderName;
  }
  throw new Error(`Invalid provider: ${provider}`);
}

function isConsensusFailureText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "failed to generate summary." ||
    normalized === "failed to generate council summary."
  );
}
