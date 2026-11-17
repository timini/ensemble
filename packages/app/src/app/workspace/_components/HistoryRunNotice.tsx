"use client";

import { useTranslation } from "react-i18next";
import { History } from "lucide-react";

export interface HistoryRunNoticeProps {
  /** When the reopened run started, in epoch milliseconds. */
  startedAt: number;
  /** Clears the screen for a new question. */
  onNewQuestion: () => void;
}

/**
 * Line above a run reopened from history: when it ran, that it is read
 * only (nothing is sent to a model again), and a way to a new question.
 */
export function HistoryRunNotice({
  startedAt,
  onNewQuestion,
}: HistoryRunNoticeProps) {
  const { t, i18n } = useTranslation("common");
  const date = new Intl.DateTimeFormat(i18n.language || "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startedAt);
  return (
    <div
      data-testid="history-run-notice"
      className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 sm:flex-row sm:items-center"
    >
      <p className="flex flex-1 items-start gap-2 text-label text-muted-foreground">
        <History className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t("pages.workspace.history.savedRun", { date })}</span>
      </p>
      <button
        type="button"
        onClick={onNewQuestion}
        data-testid="history-run-new"
        className="h-9 shrink-0 rounded-md border border-border bg-card px-3 text-label font-medium transition-colors duration-fast focus-ring hover:bg-muted"
      >
        {t("pages.workspace.history.newQuestion")}
      </button>
    </div>
  );
}
