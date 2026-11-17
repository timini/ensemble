"use client";

import { useState } from "react";
import { HistorySidebar } from "@/components/organisms/HistorySidebar";
import {
  agreementLevel,
  type AgreementSummaryProps,
} from "@/components/molecules/AgreementSummary";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";

export interface WorkspaceSidebarProps {
  /** Prompt of the run on screen, or null when there is none. */
  runPrompt: string | null;
  /** Agreement of that run, for its level dot. */
  agreement: AgreementSummaryProps;
  /** Clears the run (New question, or deleting it). */
  onNewQuestion: () => void;
  /** Closes the sidebar when it is a sheet (phones and tablets). */
  onDone: () => void;
}

const RUN_ID = "last-run";

/**
 * History and presets for the workspace's sidebar. History is the last run
 * kept in this browser (full history in IndexedDB is a later M4 task);
 * presets are the saved ensembles, loaded or deleted from here.
 */
export function WorkspaceSidebar({
  runPrompt,
  agreement,
  onNewQuestion,
  onDone,
}: WorkspaceSidebarProps) {
  const hasHydrated = useHasHydrated();
  const savedEnsembles = useStore((state) => state.savedEnsembles);
  const loadEnsemble = useStore((state) => state.loadEnsemble);
  const deleteEnsemble = useStore((state) => state.deleteEnsemble);
  // The store keeps no run time yet; the run is from this visit or earlier today.
  const [seenAt] = useState(() => Date.now());

  const items = runPrompt
    ? [
        {
          id: RUN_ID,
          prompt: runPrompt,
          createdAt: seenAt,
          level:
            agreement.status === "ready"
              ? agreementLevel(agreement.score ?? 0, agreement.thresholds)
              : undefined,
        },
      ]
    : [];
  const presets = (hasHydrated ? savedEnsembles : []).map((e) => ({
    id: e.id,
    name: e.name,
    modelCount: e.models.length,
  }));

  return (
    <HistorySidebar
      items={items}
      presets={presets}
      activeId={runPrompt ? RUN_ID : undefined}
      onSelect={onDone}
      onDelete={onNewQuestion}
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
