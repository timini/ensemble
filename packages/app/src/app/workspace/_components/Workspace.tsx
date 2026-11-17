"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/organisms/AppShell";
import { Composer } from "@/components/organisms/Composer";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { readWorkspacePanel, workspaceHref } from "~/lib/workspaceRoutes";
import { useApiKeySettings } from "../hooks/useApiKeySettings";
import { useEndpointConfiguration } from "../hooks/useEndpointConfiguration";
import { useOllamaDetection } from "../hooks/useOllamaDetection";
import { useWorkspaceComposer } from "../hooks/useWorkspaceComposer";
import { useWorkspaceRun } from "../hooks/useWorkspaceRun";
import { useNewQuestion } from "../hooks/useNewQuestion";
import { SettingsSheet } from "./SettingsSheet";
import { ManualAnswerDialog } from "./ManualAnswerDialog";
import { SavePresetDialog } from "./SavePresetDialog";
import { RunResult } from "./RunResult";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import {
  ExampleQuestions,
  SetupCard,
  WorkspaceHeading,
} from "./WorkspaceIntro";

const STORE_KEY = "ensemble-ai-store";

/**
 * The workspace: one screen to ask, compare and read. The composer sits on
 * top; the agreement score and consensus come next, then every answer.
 * History and presets are in the sidebar, keys and appearance in the
 * settings sheet. `?panel=settings|models|prompt` opens a part of it, which
 * is how the old wizard routes land here.
 */
export function Workspace() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const params = useSearchParams();
  const hasHydrated = useHasHydrated();
  const panel = readWorkspacePanel(params.get("panel"));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const keys = useApiKeySettings();
  const endpoints = useEndpointConfiguration(
    hasHydrated && keys.webCryptoSupported,
  );
  const ollamaOffer = useOllamaDetection({
    enabled: hasHydrated && keys.webCryptoSupported,
    hasValidKey: keys.validKeyCount > 0,
  });
  const composer = useWorkspaceComposer(keys.hydratedStatuses);
  const run = useWorkspaceRun({ onOpenSettings: () => setSettingsOpen(true) });
  const newQuestion = useNewQuestion();
  const saveEnsemble = useStore((state) => state.saveEnsemble);

  // Open the part of the workspace the URL names, once the store is loaded.
  useEffect(() => {
    if (!hasHydrated || !panel) return;
    if (panel === "settings") setSettingsOpen(true);
    const target =
      panel === "models"
        ? "model-picker-trigger"
        : panel === "prompt"
          ? "composer-prompt"
          : null;
    const element =
      target &&
      document.querySelector<HTMLElement>(`[data-testid="${target}"]`);
    if (element) {
      element.focus();
      if (panel === "models") element.click();
    }
  }, [hasHydrated, panel]);

  const onSettingsChange = (open: boolean) => {
    setSettingsOpen(open);
    if (!open && panel)
      router.replace(
        workspaceHref(undefined, Object.fromEntries(params.entries())),
      );
  };

  const ask = () => {
    run.startRun(composer.prompt);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const empty = !run.hasRun;

  return (
    <AppShell
      homeHref="/"
      onOpenSettings={() => setSettingsOpen(true)}
      historyOpen={historyOpen}
      onHistoryOpenChange={setHistoryOpen}
      nav={
        <a
          href="/benchmarks"
          className="hidden rounded-md px-3 py-2 text-label text-muted-foreground transition-colors duration-fast focus-ring hover:text-foreground sm:inline-block"
        >
          {t("pages.workspace.benchmarks")}
        </a>
      }
      sidebar={
        <WorkspaceSidebar
          runPrompt={run.hasRun ? run.prompt : null}
          agreement={run.agreement}
          onNewQuestion={newQuestion}
          onDone={() => setHistoryOpen(false)}
        />
      }
    >
      <div
        ref={top}
        data-testid="workspace"
        className={`mx-auto scroll-mt-20 space-y-6 px-gutter py-6 ${empty ? "max-w-2xl md:pt-16" : "max-w-6xl"}`}
      >
        {empty && <WorkspaceHeading />}
        <Composer
          {...composer}
          onSubmit={ask}
          running={run.running}
          onAddManualResponse={() => setManualOpen(true)}
          onSavePreset={
            composer.models.length > 0 ? () => setPresetOpen(true) : undefined
          }
        />
        {/* Below the composer, so nothing above it moves when the stored keys load. */}
        {hasHydrated && !keys.canRun && (
          <SetupCard
            onOpenSettings={() => setSettingsOpen(true)}
            ollamaOffer={settingsOpen ? null : ollamaOffer}
          />
        )}
        {empty ? (
          keys.canRun && <ExampleQuestions onPick={composer.onPromptChange} />
        ) : (
          <RunResult
            run={run}
            showPrompt={composer.prompt.trim() !== (run.prompt ?? "")}
          />
        )}
      </div>
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={onSettingsChange}
        keys={keys}
        endpoints={endpoints}
        ollamaOffer={ollamaOffer}
        onClearData={() => {
          // Reset the store first: it persists every change, so it would
          // otherwise write the old state back before the page reloads.
          useStore.setState(useStore.getInitialState(), true);
          localStorage.removeItem(STORE_KEY);
          window.location.assign("/workspace");
        }}
      />
      <ManualAnswerDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onAdd={run.addManualAnswer}
      />
      <SavePresetDialog
        open={presetOpen}
        onOpenChange={setPresetOpen}
        onSave={(name) => saveEnsemble(name, "")}
      />
    </AppShell>
  );
}
