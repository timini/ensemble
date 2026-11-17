"use client";

import { useTranslation } from "react-i18next";
import { ConsensusPanel } from "@/components/organisms/ConsensusPanel";
import { AnswerColumns } from "@/components/organisms/AnswerColumns";
import type { useWorkspaceRun } from "../hooks/useWorkspaceRun";
import { RunExclusionNote } from "./RunExclusionNote";

type WorkspaceRun = ReturnType<typeof useWorkspaceRun>;

export interface RunResultProps {
  run: Pick<
    WorkspaceRun,
    | "prompt"
    | "running"
    | "progress"
    | "agreement"
    | "consensus"
    | "exclusion"
    | "answers"
  >;
  /** Shows the run's question, for when the composer holds a different draft. */
  showPrompt: boolean;
}

/**
 * The run on the workspace: the agreement score and consensus answer first,
 * a note on failed models, then every answer in columns (tabs on phones).
 *
 * Below 1024 px, while answers stream, the agreement and consensus cards
 * give way to one status row, so the first answer is on the first screen.
 * The cards come back once every answer is in.
 */
export function RunResult({ run, showPrompt }: RunResultProps) {
  const { t } = useTranslation("common");
  const compact = run.running;
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
      {compact && (
        <p
          data-testid="run-status-compact"
          role="status"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-label text-muted-foreground lg:hidden"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
          />
          {t("pages.workspace.runningStatus", {
            done: run.progress.done,
            count: run.progress.total,
          })}
        </p>
      )}
      <ConsensusPanel
        agreement={run.agreement}
        consensus={run.consensus}
        className={compact ? "hidden lg:grid" : undefined}
      />
      <RunExclusionNote {...run.exclusion} />
      {run.answers.length > 0 && <AnswerColumns answers={run.answers} />}
    </div>
  );
}
