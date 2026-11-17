import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  detectOllama,
  isLoopbackURL,
  ollamaPullCommand,
  type OllamaDetection,
} from "@ensemble-ai/shared-utils/providers";
import type {
  OllamaDetectedNoticeProps,
  OllamaNoticeState,
} from "@/components/molecules/OllamaDetectedNotice";
import { useStore } from "~/store";
import {
  LOCAL_MODELS_GUIDE_URL,
  LOCAL_RUN_COMMAND,
  SUGGESTED_OLLAMA_CHAT_MODEL,
  loopbackPermissionState,
  ollamaProbeURL,
  shouldProbeAutomatically,
} from "~/lib/localModels";

type Found = Extract<OllamaDetection, { found: true }>;

interface UseOllamaDetectionOptions {
  /** Free mode, after the store has hydrated. */
  enabled: boolean;
  /** The user has a valid cloud key, so a hosted page does not ask. */
  hasValidKey: boolean;
  /** Origin of the page. Defaults to window.location.origin. */
  pageOrigin?: string;
}

/**
 * The offer to add a running Ollama on first run (no endpoint configured and
 * the offer not dismissed). A page on this machine, or a hosted page the
 * browser already lets reach this machine, looks right away with a short
 * timeout and shows nothing when Ollama is absent. Otherwise a hosted page
 * offers a button that looks, so the browser's permission prompt follows a
 * click; it shows nothing to users who already have a key or denied access.
 * Mock mode never looks.
 *
 * @returns props for OllamaDetectedNotice, or null when nothing is shown
 */
export function useOllamaDetection({
  enabled,
  hasValidKey,
  pageOrigin,
}: UseOllamaDetectionOptions): OllamaDetectedNoticeProps | null {
  const hasEndpoints = useStore((state) => state.endpoints.length > 0);
  const dismissed = useStore((state) => state.ollamaOfferDismissed);
  const addEndpoint = useStore((state) => state.addEndpoint);
  const dismiss = useStore((state) => state.dismissOllamaOffer);
  const [state, setState] = useState<OllamaNoticeState | null>(null);
  const [found, setFound] = useState<Found | null>(null);

  const origin =
    pageOrigin ?? (typeof window === "undefined" ? "" : window.location.origin);
  const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
  const active = enabled && !isMock && !dismissed && !hasEndpoints;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      const permission = await loopbackPermissionState();
      if (cancelled) return;
      if (!shouldProbeAutomatically(origin, permission)) {
        if (permission !== "denied" && !hasValidKey) setState("ask");
        return;
      }
      const result = await detectOllama({ url: ollamaProbeURL() });
      if (cancelled || !result.found) return;
      setFound(result);
      setState("found");
    })();
    return () => {
      cancelled = true;
    };
  }, [active, hasValidKey, origin]);

  const onCheck = useCallback(() => {
    setState("checking");
    void detectOllama({ url: ollamaProbeURL() }).then((result) => {
      if (result.found) setFound(result);
      setState(result.found ? "found" : "notFound");
    });
  }, []);

  const onAdd = useCallback(() => {
    if (!found) return;
    addEndpoint("ollama", {
      baseURL: found.baseURL,
      embeddingModel: found.embeddingModel ?? DEFAULT_OLLAMA_EMBEDDING_MODEL,
    });
    setState(null);
  }, [addEndpoint, found]);

  if (!active || !state) return null;
  return {
    state,
    chatModels: found?.chatModels ?? [],
    embeddingModel: found?.embeddingModel,
    embeddingPullCommand: ollamaPullCommand(),
    chatPullCommand: `ollama pull ${SUGGESTED_OLLAMA_CHAT_MODEL}`,
    hosted: !isLoopbackURL(origin),
    localRunCommand: LOCAL_RUN_COMMAND,
    guideUrl: LOCAL_MODELS_GUIDE_URL,
    onAdd,
    onCheck,
    onDismiss: dismiss,
  };
}
