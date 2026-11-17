"use client";

import { useTranslation } from "react-i18next";
import { ConsensusPanel } from "@/components/organisms/ConsensusPanel";
import { AnswerColumns } from "@/components/organisms/AnswerColumns";
import type { useWorkspaceRun } from "../hooks/useWorkspaceRun";
import { RunExclusionNote } from "./RunExclusionNote";

export interface RunResultProps {
  run: ReturnType<typeof useWorkspaceRun>;
  /** Shows the run's question, for when the composer holds a different draft. */
  showPrompt: boolean;
}

/**
 * The run on the workspace: the agreement score and consensus answer first,
 * a note on failed models, then every answer in columns (tabs on phones).
 */
export function RunResult({ run, showPrompt }: RunResultProps) {
  const { t } = useTranslation("common");
  return (
    <div data-testid="run-result" className="space-y-6">
      {showPrompt && (
        <p
          data-testid="run-prompt"
          className="text-label text-muted-foreground"
        >
          <span className="font-medium text-foreground">
            {t("pages.workspace.runPrompt")}:
          </span>{" "}
          {run.prompt}
        </p>
      )}
      <ConsensusPanel agreement={run.agreement} consensus={run.consensus} />
      <RunExclusionNote {...run.exclusion} />
      {run.answers.length > 0 && <AnswerColumns answers={run.answers} />}
    </div>
  );
}
