"use client";

import {
  HistorySidebar,
  type HistoryItem,
} from "@/components/organisms/HistorySidebar";
import {
  agreementLevel,
  type AgreementSummaryProps,
} from "@/components/molecules/AgreementSummary";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import type { StoredRun } from "~/lib/runHistory";

export interface WorkspaceSidebarProps {
  /** Prompt of the run on screen, or null when there is none. */
  runPrompt: string | null;
  /** Agreement of that run, for its level dot. */
  agreement: AgreementSummaryProps;
  /** Clears the run (New question). */
  onNewQuestion: () => void;
  /** Closes the sidebar when it is a sheet (phones and tablets). */
  onDone: () => void;
  /** Runs kept in this browser, newest first. */
  runs?: StoredRun[];
  /** History id of the run on screen. */
  currentId?: string | null;
  /** Puts a stored run back on screen. */
  onOpenRun?: (id: string) => void;
  /** Deletes a run. Defaults to clearing the screen. */
  onDeleteRun?: (id: string) => void;
  /**
   * True while the run on screen is still streaming. Other runs cannot be
   * opened then, so the live run is not lost before it is stored.
   */
  running?: boolean;
  /** Shares a stored run; shows a share button on each run when set. */
  onShareRun?: (id: string) => void;
  /** Where history is kept, for the line at the bottom of the sidebar. */
  syncStatus?: "synced" | "local";
}

const LIVE_ID = "last-run";

/** What the search matches besides the prompt: answers, consensus, models. */
function searchText(run: StoredRun): string {
  return [
    ...run.responses.map((r) => `${r.model} ${r.response}`),
    ...run.manualResponses.map((m) => `${m.label} ${m.response}`),
    run.metaAnalysis ?? "",
  ].join(" ");
}

/**
 * History and presets for the workspace's sidebar. History is the runs
 * kept in IndexedDB (Free mode), plus the run on screen while it is not
 * stored yet; opening one puts it back on screen read only, once the run on
 * screen has finished streaming. Presets are the
 * saved ensembles, loaded or deleted from here.
 */
export function WorkspaceSidebar({
  runPrompt,
  agreement,
  onNewQuestion,
  onDone,
  runs = [],
  currentId,
  onOpenRun,
  onDeleteRun,
  running = false,
  onShareRun,
  syncStatus,
}: WorkspaceSidebarProps) {
  const hasHydrated = useHasHydrated();
  const savedEnsembles = useStore((state) => state.savedEnsembles);
  const loadEnsemble = useStore((state) => state.loadEnsemble);
  const deleteEnsemble = useStore((state) => state.deleteEnsemble);
  // Null for a run stored before run times were kept: it is listed with no
  // date or time rather than an invented one.
  const runStartedAt = useStore((state) => state.runStartedAt);

  const activeId = runPrompt ? (currentId ?? LIVE_ID) : undefined;
  const items: HistoryItem[] = runs.map((run) => ({
    id: run.id,
    prompt: run.prompt,
    createdAt: run.createdAt,
    level: run.agreementLevel ?? undefined,
    searchText: searchText(run),
  }));
  if (runPrompt && activeId && !runs.some((r) => r.id === activeId)) {
    items.unshift({
      id: activeId,
      prompt: runPrompt,
      createdAt: runStartedAt ?? undefined,
      level:
        agreement.status === "ready"
          ? agreementLevel(agreement.score ?? 0, agreement.thresholds)
          : undefined,
    });
  }
  const presets = (hasHydrated ? savedEnsembles : []).map((e) => ({
    id: e.id,
    name: e.name,
    modelCount: e.models.length,
  }));

  return (
    <HistorySidebar
      items={items}
      presets={presets}
      activeId={activeId}
      locked={running}
      syncStatus={syncStatus}
      onShare={
        onShareRun && !running
          ? (id) => {
              onShareRun(id);
              onDone();
            }
          : undefined
      }
      onSelect={(id) => {
        if (id !== activeId && !running) onOpenRun?.(id);
        onDone();
      }}
      onDelete={(id) => (onDeleteRun ? onDeleteRun(id) : onNewQuestion())}
      onSelectPreset={(id) => {
        loadEnsemble(id);
        onDone();
      }}
      onDeletePreset={deleteEnsemble}
      onNewQuestion={() => {
        onNewQuestion();
        onDone();
      }}
    />
  );
}
