"use client";

import { useTranslation } from "react-i18next";
import { ResponseCard } from "@/components/molecules/ResponseCard";
import type { ManualResponse } from "~/store";
import { AddManualResponse } from "../../_components/AddManualResponse";

export interface PromptManualResponsesProps {
  manualResponses: ManualResponse[];
  onAdd: (label: string, response: string) => void;
}

/**
 * Manual answers on /prompt: a preview of those already added and a button
 * to add another before the run. They are reviewed and scored with the AI
 * answers.
 */
export function PromptManualResponses({
  manualResponses,
  onAdd,
}: PromptManualResponsesProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4" data-testid="prompt-manual-responses">
      <h3 className="text-lg font-semibold">
        {t("organisms.ensembleSidebar.manualResponses")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t("organisms.ensembleSidebar.manualResponsesDescription")}
      </p>
      {manualResponses.length > 0 && (
        <div data-testid="manual-responses-preview" className="space-y-4">
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
      )}
      <AddManualResponse onAdd={onAdd} />
    </div>
  );
}
