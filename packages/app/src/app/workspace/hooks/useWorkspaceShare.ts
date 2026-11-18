import type { SharedRunSource } from "~/lib/share/sharedRun";
import type { useWorkspaceRun } from "./useWorkspaceRun";
import { useShareLink } from "./useShareLink";

type WorkspaceRun = ReturnType<typeof useWorkspaceRun>;

export interface UseWorkspaceShareOptions {
  /** Sharing needs a signed-in user, in Free or Pro. */
  signedIn: boolean;
  run: Pick<
    WorkspaceRun,
    "prompt" | "running" | "agreement" | "consensus" | "answers" | "hasRun"
  >;
  runStartedAt: number | null;
  history: { currentId: string | null; open: (id: string) => void };
}

/**
 * Sharing from the workspace: the consensus card's Share button shares the
 * run on screen, a history row's Share button opens that run and then
 * shares it. Both are off while signed out or while a run streams.
 */
export function useWorkspaceShare({
  signedIn,
  run,
  runStartedAt,
  history,
}: UseWorkspaceShareOptions) {
  const source: SharedRunSource | null =
    run.hasRun && run.prompt && runStartedAt !== null
      ? {
          prompt: run.prompt,
          runAt: runStartedAt,
          agreement: run.agreement,
          consensus: run.consensus,
          answers: run.answers,
        }
      : null;
  const share = useShareLink({ currentId: history.currentId, source });
  const enabled = signedIn && !run.running;

  const shareRun = (id: string) => {
    const known = id.startsWith("run-");
    if (known && id !== history.currentId) history.open(id);
    const target = known ? id : history.currentId;
    if (target) share.openFor(target);
  };

  return {
    /** Shares the run on screen, or undefined when sharing is off. */
    shareCurrent:
      enabled && history.currentId
        ? () => share.openFor(history.currentId!)
        : undefined,
    /** Shares a run from history, or undefined when sharing is off. */
    shareRun: enabled ? shareRun : undefined,
    dialog: share.dialog,
  };
}
