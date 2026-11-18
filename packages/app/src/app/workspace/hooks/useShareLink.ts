import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ShareDialogError,
  ShareDialogProps,
  ShareDialogStatus,
} from "@/components/molecules/ShareDialog";
import { api } from "~/trpc/react";
import { logger } from "~/lib/logger";
import { toError } from "~/lib/errors";
import { shareUrl, formatShareDate } from "~/lib/share/shareLinks";
import { toSharedRun, type SharedRunSource } from "~/lib/share/sharedRun";

export interface UseShareLinkOptions {
  /** History id of the run on screen. */
  currentId: string | null;
  /** The run on screen, as the result components show it, or null. */
  source: SharedRunSource | null;
}

interface ShareState {
  open: boolean;
  runId: string | null;
  status: ShareDialogStatus;
  link?: { id: string; expiresAt: number };
  error?: ShareDialogError;
}

const CLOSED: ShareState = { open: false, runId: null, status: "loading" };

/** The share dialog's error for a failed tRPC call. */
export function shareErrorOf(error: unknown): ShareDialogError {
  const code = (error as { data?: { code?: unknown } } | null)?.data?.code;
  if (code === "TOO_MANY_REQUESTS") return "limit";
  if (code === "PAYLOAD_TOO_LARGE") return "tooLarge";
  return "failed";
}

/**
 * The share dialog for the run on screen: looks up its link when opened,
 * creates one from what the workspace shows, and deletes it. Sharing
 * needs a signed-in user; the caller only offers it then.
 */
export function useShareLink({ currentId, source }: UseShareLinkOptions) {
  const { i18n } = useTranslation();
  const utils = api.useUtils();
  const [state, setState] = useState<ShareState>(CLOSED);
  const latest = useRef({ currentId, source });
  latest.current = { currentId, source };

  const fail = (error: unknown, action: string) => {
    logger.warn(`Share: ${action} failed`, toError(error));
    // A link that could not be deleted still works: keep showing it.
    setState((s) => ({
      ...s,
      status: s.link ? "ready" : "error",
      error: shareErrorOf(error),
    }));
  };

  const openFor = useCallback(
    (runId: string) => {
      setState({ open: true, runId, status: "loading" });
      utils.client.share.forRun
        .query({ runId })
        .then((link) =>
          setState((s) =>
            s.runId === runId
              ? link
                ? { ...s, status: "ready", link }
                : { ...s, status: "create" }
              : s,
          ),
        )
        .catch((error: unknown) => {
          // The lookup failing should not stop a new link being made.
          logger.warn("Share: lookup failed", toError(error));
          setState((s) => (s.runId === runId ? { ...s, status: "create" } : s));
        });
    },
    [utils],
  );

  const create = () => {
    const { runId } = state;
    const { currentId: shown, source: run } = latest.current;
    const shared = run && runId === shown ? toSharedRun(run) : null;
    if (!runId || !shared) {
      setState((s) => ({ ...s, status: "error", error: "failed" }));
      return;
    }
    setState((s) => ({ ...s, status: "creating", error: undefined }));
    utils.client.share.create
      .mutate({ runId, run: shared })
      .then((link) => setState((s) => ({ ...s, status: "ready", link })))
      .catch((error: unknown) => fail(error, "creating"));
  };

  const remove = () => {
    const id = state.link?.id;
    if (!id) return;
    setState((s) => ({ ...s, status: "deleting", error: undefined }));
    utils.client.share.delete
      .mutate({ id })
      .then(() =>
        setState((s) => ({ ...s, status: "create", link: undefined })),
      )
      .catch((error: unknown) => fail(error, "deleting"));
  };

  const dialog: ShareDialogProps = {
    open: state.open,
    onOpenChange: (open) => {
      if (!open) setState(CLOSED);
    },
    status: state.status,
    url: state.link
      ? shareUrl(window.location.origin, state.link.id)
      : undefined,
    expiresOn: state.link
      ? formatShareDate(state.link.expiresAt, i18n.language)
      : undefined,
    error: state.error,
    onCreate: create,
    onDelete: remove,
  };

  return { openFor, dialog };
}
