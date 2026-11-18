import { useStore } from "~/store";
import type { AuthController } from "~/hooks/useAuthController";
import { runRecordExtras } from "~/lib/runHistoryRecord";
import type { useWorkspaceRun } from "./useWorkspaceRun";
import { useRunHistory } from "./useRunHistory";
import { useWorkspaceShare } from "./useWorkspaceShare";
import { useWorkspaceSync } from "./useWorkspaceSync";

/**
 * History, sync and sharing for the workspace. History stays in this
 * browser in both modes (FR-030); signed in, it and the presets are synced
 * to the account, and runs can be shared. `syncStatus` is undefined when
 * sign-in is not set up on this build.
 */
export function useWorkspaceHistory({
  hasHydrated,
  run,
  auth,
}: {
  hasHydrated: boolean;
  run: ReturnType<typeof useWorkspaceRun>;
  auth: Pick<AuthController, "status" | "user">;
}) {
  const runStartedAt = useStore((state) => state.runStartedAt);
  const history = useRunHistory({
    enabled: hasHydrated,
    extras: runRecordExtras(run.agreement, run.consensus.cost),
    onOpen: run.stopConsensus,
  });
  const uid = auth.status === "signedIn" ? (auth.user?.uid ?? null) : null;
  const syncStatus = useWorkspaceSync({ uid, history, hasHydrated });
  const share = useWorkspaceShare({
    signedIn: uid !== null,
    run,
    runStartedAt,
    history,
  });
  return {
    history,
    share,
    runStartedAt,
    syncStatus: auth.status === "unavailable" ? undefined : syncStatus,
  };
}
