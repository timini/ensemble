"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/organisms/AppShell";
import { Composer } from "@/components/organisms/Composer";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { useApiKeySettings } from "../hooks/useApiKeySettings";
import { useEndpointConfiguration } from "../hooks/useEndpointConfiguration";
import { useOllamaDetection } from "../hooks/useOllamaDetection";
import { useWorkspaceComposer } from "../hooks/useWorkspaceComposer";
import { useWorkspaceRun } from "../hooks/useWorkspaceRun";
import { useNewQuestion } from "../hooks/useNewQuestion";
import { useWorkspacePanel } from "../hooks/useWorkspacePanel";
import { useOnboarding } from "../hooks/useOnboarding";
import { useStarterEnsemble } from "../hooks/useStarterEnsemble";
import { useWorkspaceHistory } from "../hooks/useWorkspaceHistory";
import { ShareDialog } from "@/components/molecules/ShareDialog";
import { clearBrowserData } from "~/lib/clearBrowserData";
import { HistoryRunNotice } from "./HistoryRunNotice";
import { SettingsSheet } from "./SettingsSheet";
import { ManualAnswerDialog } from "./ManualAnswerDialog";
import { SavePresetDialog } from "./SavePresetDialog";
import { RunResult } from "./RunResult";
import { WorkspaceOnboarding } from "./WorkspaceOnboarding";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { useAuth } from "~/app/_components/AuthProvider";
import { useProCredits } from "~/hooks/useProCredits";
import { ModeSettings, ProComposerNotice, WorkspaceAccount } from "./ProPanels";
import {
  BenchmarksNavLink,
  ExampleQuestions,
  SetupCard,
  WorkspaceHeading,
} from "./WorkspaceIntro";

/**
 * The workspace: one screen to ask, compare and read. The composer sits on
 * top; the agreement score and consensus come next, then every answer.
 * History and presets are in the sidebar, keys and appearance in the
 * settings sheet. `?panel=settings|models|prompt` opens a part of it, which
 * is how the old wizard routes land here. On a first visit the onboarding
 * sheet asks how to run models (`?start=keys|local` from the landing page
 * picks the path). Starting from onboarding fills the composer with a
 * starting ensemble (`useStarterEnsemble`), so the first question needs
 * only typing. In Pro, Ask waits for sign-in and enough credits
 * (useProCredits) and the notice under the composer says why.
 */
export function Workspace() {
  const hasHydrated = useHasHydrated();
  const { settingsOpen, setSettingsOpen, onSettingsChange } =
    useWorkspacePanel(hasHydrated);
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
  const auth = useAuth();
  const credits = useProCredits(composer.prompt);
  const canRun = credits.pro ? auth.status === "signedIn" : keys.canRun;
  const chooseStarterModels = useStarterEnsemble(composer.modelOptions);
  const onboarding = useOnboarding({
    hasHydrated,
    keys,
    endpoints,
    onOpenSettings: () => setSettingsOpen(true),
    onStarted: chooseStarterModels,
    proReady: auth.status === "signedIn",
  });
  const run = useWorkspaceRun({ onOpenSettings: () => setSettingsOpen(true) });
  const startNewQuestion = useNewQuestion();
  const newQuestion = () => {
    startNewQuestion();
    run.stop();
  };
  const { history, share, runStartedAt, syncStatus } = useWorkspaceHistory({
    hasHydrated,
    run,
    auth,
  });
  const saveEnsemble = useStore((state) => state.saveEnsemble);

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
      account={<WorkspaceAccount balance={credits.balance} />}
      nav={<BenchmarksNavLink />}
      sidebar={
        <WorkspaceSidebar
          runPrompt={run.hasRun ? run.prompt : null}
          agreement={run.agreement}
          onNewQuestion={newQuestion}
          onDone={() => setHistoryOpen(false)}
          runs={history.runs}
          currentId={history.currentId}
          onOpenRun={(id) => {
            history.open(id);
            top.current?.scrollIntoView({ block: "start" });
          }}
          onDeleteRun={(id) => void history.remove(id)}
          running={run.running}
          onShareRun={share.shareRun}
          syncStatus={syncStatus}
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
          onStop={run.stop}
          blockedReason={credits.blockedReason}
          onAddManualResponse={
            run.readOnly ? undefined : () => setManualOpen(true)
          }
          onSavePreset={
            composer.models.length > 0 ? () => setPresetOpen(true) : undefined
          }
        />
        {/* Below the composer, so nothing above it moves when the stored keys load. */}
        {hasHydrated && <ProComposerNotice notice={credits.notice} />}
        {hasHydrated && !credits.pro && !keys.canRun && (
          <SetupCard
            onOpenSettings={() => setSettingsOpen(true)}
            ollamaOffer={settingsOpen || onboarding.open ? null : ollamaOffer}
          />
        )}
        {empty ? (
          canRun && <ExampleQuestions onPick={composer.onPromptChange} />
        ) : (
          <>
            {run.readOnly && runStartedAt !== null && (
              <HistoryRunNotice
                startedAt={runStartedAt}
                onNewQuestion={newQuestion}
              />
            )}
            <RunResult
              run={run}
              showPrompt={composer.prompt.trim() !== (run.prompt ?? "")}
              onShare={share.shareCurrent}
            />
          </>
        )}
      </div>
      <WorkspaceOnboarding
        onboarding={onboarding}
        ollamaOffer={onboarding.open ? ollamaOffer : null}
        proBalance={credits.balance}
      />
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={onSettingsChange}
        keys={keys}
        endpoints={endpoints}
        ollamaOffer={ollamaOffer}
        onClearData={clearBrowserData}
        modeSection={<ModeSettings balance={credits.balance} />}
      />
      <ManualAnswerDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onAdd={run.addManualAnswer}
      />
      <ShareDialog {...share.dialog} />
      <SavePresetDialog
        open={presetOpen}
        onOpenChange={setPresetOpen}
        onSave={(name) => saveEnsemble(name, "")}
      />
    </AppShell>
  );
}
