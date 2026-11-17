/**
 * Prompt Page (T162-T166)
 *
 * Step 3 of the 4-step workflow: Prompt Input
 * User enters their prompt and submits to the ensemble
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "~/store";
import { useStepNavigation } from "~/hooks/useStepNavigation";
import { PageHero } from "@/components/organisms/PageHero";
import { EnsembleConfigurationSummary } from "@/components/organisms/EnsembleConfigurationSummary";
import { WorkflowNavigator } from "@/components/organisms/WorkflowNavigator";
import { PromptTips } from "@/components/organisms/PromptTips";
import { PromptInputWithHint } from "@/components/organisms/PromptInputWithHint";
import { ProgressSteps } from "@/components/molecules/ProgressSteps";
import { ResponseCard } from "@/components/molecules/ResponseCard";
import { RunCostSummary } from "@/components/molecules/RunCostSummary";
import { PRICE_TABLE_DATE } from "@ensemble-ai/shared-utils/pricing";
import { useRunEstimate } from "~/hooks/useRunEstimate";
import {
  ProviderRegistry,
  type AIProvider,
} from "@ensemble-ai/shared-utils/providers";
import { FALLBACK_MODELS } from "~/lib/models";
import { toError } from "~/lib/errors";
import { logger } from "~/lib/logger";
import { toResponseError } from "~/lib/responseErrors";
import type { ConsensusMethod } from "~/store/slices/ensembleSlice";

export default function PromptPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const handleProgressStepClick = useStepNavigation();

  const selectedModels = useStore((state) => state.selectedModels);
  const summarizerModel = useStore((state) => state.summarizerModel);
  const prompt = useStore((state) => state.prompt);
  const setPrompt = useStore((state) => state.setPrompt);
  const manualResponses = useStore((state) => state.manualResponses);
  const startRun = useStore((state) => state.startRun);
  const startStreaming = useStore((state) => state.startStreaming);
  const appendStreamChunk = useStore((state) => state.appendStreamChunk);
  const completeResponse = useStore((state) => state.completeResponse);
  const setError = useStore((state) => state.setError);
  const mode = useStore((state) => state.mode);
  const consensusMethod = useStore(
    (state): ConsensusMethod => state.consensusMethod,
  );
  const eloTopN = useStore((state) => state.eloTopN);
  const setConsensusMethod = useStore((state) => state.setConsensusMethod);
  const setEloTopN = useStore((state) => state.setEloTopN);
  const setSummarizer = useStore((state) => state.setSummarizer);

  const currentStep = useStore((state) => state.currentStep);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const completeStep = useStore((state) => state.completeStep);

  const [localPrompt, setLocalPrompt] = useState(prompt ?? "");
  const runEstimate = useRunEstimate(localPrompt);

  const selectedModelIds = useMemo(
    () => selectedModels.map((m) => m.model),
    [selectedModels],
  );

  const summarizerForSummary = useMemo(() => {
    if (summarizerModel) return summarizerModel;
    if (selectedModelIds.length > 0) {
      return selectedModelIds[0]!;
    }
    return t("organisms.ensembleConfigurationSummary.noSummarizer");
  }, [selectedModelIds, summarizerModel, t]);

  // Sync local state with Zustand when component mounts or prompt changes
  useEffect(() => {
    setLocalPrompt(prompt ?? "");
  }, [prompt]);

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    setPrompt(value);
  };

  const handleSubmit = () => {
    if (!isValid) return;

    const currentPrompt = localPrompt.trim();
    // Clears the previous run's answers, agreement and consensus.
    startRun(currentPrompt);

    const registry = ProviderRegistry.getInstance();
    const clientMode: "mock" | "free" | "pro" =
      process.env.NEXT_PUBLIC_MOCK_MODE === "true"
        ? "mock"
        : mode === "pro"
          ? "pro"
          : "free";

    selectedModels.forEach((selection) => {
      const displayName =
        FALLBACK_MODELS.find((model) => model.id === selection.model)?.name ??
        selection.model;

      startStreaming(selection.id, selection.provider, displayName);

      let providerClient: AIProvider;
      try {
        providerClient = registry.getProvider(selection.provider, clientMode);
      } catch (error: unknown) {
        if (registry.hasProvider(selection.provider, "mock")) {
          providerClient = registry.getProvider(selection.provider, "mock");
        } else {
          throw toError(
            error,
            `No provider configured for ${selection.provider}`,
          );
        }
      }

      void providerClient
        .streamResponse(
          currentPrompt,
          selection.model,
          (chunk: string) => appendStreamChunk(selection.id, chunk),
          (_fullResponse, responseTime, tokenCount, usage) => {
            completeResponse(selection.id, responseTime, tokenCount, usage);
          },
          (error: Error) => {
            logger.error(
              `[PromptPage] streamResponse error for ${selection.provider}/${selection.model}`,
              error,
            );
            const failure = toResponseError(error);
            setError(selection.id, failure.message, failure.details);
          },
        )
        .catch((error: unknown) => {
          const normalizedError = toError(error);
          logger.error(
            `[PromptPage] streamResponse exception for ${selection.provider}/${selection.model}`,
            normalizedError,
          );
          const failure = toResponseError(normalizedError);
          setError(selection.id, failure.message, failure.details);
        });
    });

    completeStep("prompt");
    setCurrentStep("review");
    router.push("/review");
  };

  const handleSummarizerChange = (modelId: string) => {
    setSummarizer(modelId);
  };

  const handleBack = () => {
    setCurrentStep("ensemble");
    router.push("/ensemble");
  };

  // Validate: prompt must not be empty
  const isValid = localPrompt.trim().length > 0;

  // Get model names for the summary
  const modelNames = selectedModelIds;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ProgressSteps
        currentStep={currentStep}
        fallbackStep="prompt"
        onStepClick={handleProgressStepClick}
      />

      <PageHero
        title={t("pages.prompt.title")}
        description={t("pages.prompt.description")}
      />

      <div className="mt-8 space-y-8">
        {/* Prompt Input (primary action — immediately visible) */}
        <PromptInputWithHint
          value={localPrompt}
          onChange={handlePromptChange}
        />

        {/* Tips for better prompts */}
        <PromptTips />

        {/* Ensemble Configuration Summary (secondary info) */}
        {selectedModelIds.length > 0 && (
          <EnsembleConfigurationSummary
            selectedModels={modelNames}
            summarizerModel={summarizerForSummary}
            consensusMethod={consensusMethod}
            topN={eloTopN}
            onConsensusMethodChange={setConsensusMethod}
            onTopNChange={setEloTopN}
            onSummarizerChange={handleSummarizerChange}
          />
        )}

        {/* Manual Responses Preview */}
        {manualResponses.length > 0 && (
          <div data-testid="manual-responses-preview" className="space-y-4">
            <h3 className="text-lg font-semibold">
              {t("organisms.ensembleSidebar.manualResponses")}
            </h3>
            <div className="space-y-4">
              {manualResponses.map((manual) => (
                <ResponseCard
                  key={manual.id}
                  responseType="manual"
                  status="complete"
                  content={manual.response}
                  modelName={manual.label}
                  defaultExpanded={false}
                  testId={`manual-preview-${manual.id}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedModels.length > 0 && (
        <RunCostSummary
          className="mt-8"
          variant="estimate"
          calls={runEstimate.calls}
          consensusAvailable={runEstimate.consensusAvailable}
          lowUsd={runEstimate.cost.lowUsd}
          highUsd={runEstimate.cost.highUsd}
          unpricedModels={runEstimate.cost.unpricedModels}
          pricedCallCount={runEstimate.cost.pricedCallCount}
          unpricedCallCount={runEstimate.cost.unpricedCallCount}
          priceDate={PRICE_TABLE_DATE}
        />
      )}

      <div className="mt-12">
        <WorkflowNavigator
          currentStep={currentStep}
          onContinue={handleSubmit}
          onBack={handleBack}
          continueDisabled={!isValid}
          continueLabel={t("pages.prompt.generateButton")}
        />
      </div>
    </div>
  );
}
