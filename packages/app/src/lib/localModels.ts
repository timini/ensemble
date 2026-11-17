import {
  OLLAMA_DEFAULT_URL,
  isLoopbackURL,
} from "@ensemble-ai/shared-utils/providers";

/** The setup guide for local models (docs/LOCAL_MODELS.md). */
export const LOCAL_MODELS_GUIDE_URL =
  "https://github.com/timini/ensemble/blob/main/docs/LOCAL_MODELS.md";

/** Runs Ensemble on the user's computer from a clone of the repository. */
export const LOCAL_RUN_COMMAND = "npm run local";

/** A small chat model to suggest when Ollama has none installed. */
export const SUGGESTED_OLLAMA_CHAT_MODEL = "llama3.2:3b";

/**
 * Where to look for Ollama. NEXT_PUBLIC_OLLAMA_URL overrides the default so
 * the E2E suite can point it at a fake server.
 */
export function ollamaProbeURL(): string {
  const override = process.env.NEXT_PUBLIC_OLLAMA_URL?.trim() ?? "";
  return override.length > 0 ? override : OLLAMA_DEFAULT_URL;
}

export type LoopbackPermission = "granted" | "denied" | "prompt" | "unknown";

/**
 * Chrome's permission for a public site to reach this machine
 * (`loopback-network`). Browsers that do not know it give `unknown`.
 */
export async function loopbackPermissionState(): Promise<LoopbackPermission> {
  try {
    const permissions = (globalThis.navigator as Navigator | undefined)
      ?.permissions;
    if (!permissions?.query) return "unknown";
    const status = await permissions.query({
      name: "loopback-network" as PermissionName,
    });
    return status.state;
  } catch {
    return "unknown";
  }
}

/**
 * Whether to look for Ollama without a click. A page on this machine can
 * always look. A hosted page looks only once the browser has granted local
 * access; otherwise the request would raise a permission prompt (Chrome
 * asks to avoid that on page load) or fail as mixed content (Safari).
 */
export function shouldProbeAutomatically(
  pageOrigin: string,
  permission: LoopbackPermission,
): boolean {
  return isLoopbackURL(pageOrigin) || permission === "granted";
}
