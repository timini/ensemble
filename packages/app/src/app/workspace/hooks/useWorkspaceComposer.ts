import { useMemo } from "react";
import type {
  Provider,
  ValidationStatus,
} from "@/components/molecules/ApiKeyInput";
import type { ComposerProps } from "@/components/organisms/Composer";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { useRunEstimates } from "~/hooks/useRunEstimates";
import { toComposerModels, toPickerOptions } from "~/lib/workspaceModels";
import { useAvailableModels } from "./useAvailableModels";

/** Most models in one run, as the vision sets it (2 to 6). */
export const MAX_MODELS = 6;

type ComposerState = Omit<
  ComposerProps,
  "onSubmit" | "running" | "onAddManualResponse" | "onSavePreset" | "className"
>;

/**
 * Composer state from the store: the prompt draft, the ensemble as chips
 * with the models the user can add (providers with a working key and
 * connected endpoints), the consensus method with the calls and cost of
 * every method, the summarizer, the Ranked top N and the manual answers.
 */
export function useWorkspaceComposer(
  statuses: Record<Provider, ValidationStatus>,
): ComposerState & {
  /** Models the picker offers. Empty means nothing is set up yet. */
  optionCount: number;
} {
  const hasHydrated = useHasHydrated();
  const draft = useStore((state) => state.prompt);
  const setPrompt = useStore((state) => state.setPrompt);
  const selected = useStore((state) => state.selectedModels);
  const addModel = useStore((state) => state.addModel);
  const removeModel = useStore((state) => state.removeModel);
  const endpoints = useStore((state) => state.endpoints);
  const method = useStore((state) => state.consensusMethod);
  const setMethod = useStore((state) => state.setConsensusMethod);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const setSummarizer = useStore((state) => state.setSummarizer);
  const eloTopN = useStore((state) => state.eloTopN);
  const setEloTopN = useStore((state) => state.setEloTopN);
  const manual = useStore((state) => state.manualResponses);
  const removeManual = useStore((state) => state.removeManualResponse);

  const connected = useMemo(
    () => (hasHydrated ? endpoints.filter((e) => e.status === "valid") : []),
    [endpoints, hasHydrated],
  );
  const available = useAvailableModels({
    hasHydrated,
    mode: "free",
    hydratedStatuses: statuses,
    endpoints: connected,
  });
  const modelOptions = useMemo(
    () => toPickerOptions(available, statuses, connected),
    [available, statuses, connected],
  );
  const models = useMemo(
    () => toComposerModels(hasHydrated ? selected : [], available, endpoints),
    [hasHydrated, selected, available, endpoints],
  );
  const prompt = hasHydrated ? (draft ?? "") : "";
  const estimates = useRunEstimates(prompt);

  const onToggleModel = (id: string) => {
    const current = selected.find((m) => m.model === id);
    if (current) return removeModel(current.id);
    const option = available.find((m) => m.id === id);
    if (option && selected.length < MAX_MODELS)
      addModel(option.provider, option.id);
  };

  return {
    prompt,
    onPromptChange: setPrompt,
    models,
    onRemoveModel: (id) => {
      const current = selected.find((m) => m.model === id);
      if (current) removeModel(current.id);
    },
    modelOptions,
    optionCount: modelOptions.length,
    onToggleModel,
    maxModels: MAX_MODELS,
    manualResponses: (hasHydrated ? manual : []).map((m) => ({
      id: m.id,
      label: m.label,
    })),
    onRemoveManualResponse: removeManual,
    method,
    onMethodChange: setMethod,
    // Nothing to estimate until something would run.
    estimates:
      models.length + (hasHydrated ? manual.length : 0) > 0 ? estimates : {},
    summarizers: models.map(({ id, name }) => ({ id, name })),
    // With none chosen the first model merges the answers, as the consensus trigger does.
    summarizerId:
      summarizerModel && models.some((m) => m.id === summarizerModel)
        ? summarizerModel
        : models[0]?.id,
    onSummarizerChange: setSummarizer,
    topN: eloTopN,
    onTopNChange: setEloTopN,
    // Ranked merges at most every answer of the run.
    topNMax: models.length + (hasHydrated ? manual.length : 0),
  };
}
