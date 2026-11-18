import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  OnboardingKeyFieldProps,
  OnboardingKeyProvider,
  OnboardingKeyStatus,
} from "@/components/molecules/OnboardingKeyField";
import type { OnboardingPath } from "@/components/organisms/OnboardingSheet";
import { useStore } from "~/store";
import { detectKeyProvider } from "~/lib/keyProvider";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";
import type { useApiKeySettings } from "./useApiKeySettings";
import type { useEndpointConfiguration } from "./useEndpointConfiguration";

type Keys = ReturnType<typeof useApiKeySettings>;
type Endpoints = ReturnType<typeof useEndpointConfiguration>;

export interface UseOnboardingOptions {
  /** True once the store has loaded from localStorage. */
  hasHydrated: boolean;
  keys: Pick<Keys, "canRun" | "onKeyChange"> & {
    hydratedStatuses: Readonly<Record<string, string>>;
  };
  endpoints: Pick<Endpoints, "items" | "onChange" | "onRemove">;
  /** Opens the settings sheet. */
  onOpenSettings: () => void;
  /** Called when onboarding ends with Start (not Skip or close). */
  onStarted?: () => void;
  /** Signed in, so the Pro path can start. */
  proReady?: boolean;
}

/** The `start` query value the landing page sets, as a path, or null. */
export function readOnboardingStart(
  value: string | null,
): OnboardingPath | null {
  return value === "keys" || value === "local" || value === "pro"
    ? value
    : null;
}

/**
 * The first-run onboarding sheet. It opens once the store has loaded when
 * nothing is set up (no key, no endpoint, onboarding never finished) and no
 * `?panel=` asks for another part of the workspace, or when the landing page
 * sends `?start=keys|local` and nothing works yet. A typed key goes to the
 * provider its prefix names (`lib/keyProvider.ts`); an OpenRouter key adds
 * an OpenRouter endpoint, since OpenRouter is an OpenAI-compatible service.
 * The key is checked as typed, by the same code as the settings sheet.
 * Start, Skip, closing or going to settings finish onboarding for good and
 * drop `start` from the URL. Start also calls `onStarted`, which the
 * workspace uses to choose a starting ensemble.
 */
export function useOnboarding({
  hasHydrated,
  keys,
  endpoints,
  onOpenSettings,
  onStarted,
  proReady = false,
}: UseOnboardingOptions) {
  const router = useRouter();
  const params = useSearchParams();
  const start = readOnboardingStart(params.get("start"));
  const done = useStore((s) => s.onboardingDone);
  const complete = useStore((s) => s.completeOnboarding);
  const setMode = useStore((s) => s.setMode);
  const nothingSet = useStore(
    (s) => s.endpoints.length === 0 && !Object.values(s.apiKeys).some(Boolean),
  );
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<OnboardingPath>(start ?? "keys");
  const [provider, setProvider] = useState<OnboardingKeyProvider>("openrouter");
  const [value, setValue] = useState("");
  const [openRouterId, setOpenRouterId] = useState<string | null>(null);
  const decided = useRef(false);

  useEffect(() => {
    if (!hasHydrated || decided.current) return;
    decided.current = true;
    if (params.get("panel")) return;
    const ready = start === "pro" ? proReady : keys.canRun;
    const show = start ? !ready : !done && nothingSet;
    if (show) {
      setPath(start ?? "keys");
      setOpen(true);
    }
  }, [hasHydrated, params, start, keys.canRun, proReady, done, nothingSet]);

  const endpoint = useStore((s) =>
    openRouterId ? s.endpoints.find((e) => e.id === openRouterId) : undefined,
  );
  const apiKey = useStore((s) =>
    provider === "openrouter" ? null : s.apiKeys[provider],
  );

  /** Puts the key on a provider; an empty value takes it off again. */
  const apply = useCallback(
    (target: OnboardingKeyProvider, key: string) => {
      if (target !== "openrouter") return keys.onKeyChange(target, key);
      if (!key.trim()) {
        if (openRouterId) endpoints.onRemove(openRouterId);
        setOpenRouterId(null);
        return;
      }
      const id = openRouterId ?? useStore.getState().addEndpoint("openrouter");
      setOpenRouterId(id);
      endpoints.onChange(id, "apiKey", key);
    },
    [endpoints, keys, openRouterId],
  );

  const onChange = (next: string) => {
    const target = detectKeyProvider(next, provider);
    if (target !== provider) {
      apply(provider, "");
      setProvider(target);
    }
    setValue(next);
    apply(target, next);
  };

  const onProviderChange = (target: OnboardingKeyProvider) => {
    if (value) {
      apply(provider, "");
      apply(target, value);
    }
    setProvider(target);
  };

  const raw =
    provider === "openrouter"
      ? (endpoint?.status ?? "idle")
      : (keys.hydratedStatuses[provider] ?? "idle");
  // A typed key is checked after a short pause: show it as being checked.
  const status: OnboardingKeyStatus = !value.trim()
    ? "idle"
    : raw === "idle"
      ? "validating"
      : (raw as OnboardingKeyStatus);
  const error =
    provider === "openrouter" ? endpoint?.error : (apiKey?.error ?? undefined);

  const finish = () => {
    complete();
    setOpen(false);
    if (!params.get("start")) return;
    const rest = new URLSearchParams(params.toString());
    rest.delete("start");
    const text = rest.toString();
    router.replace(text ? `${WORKSPACE_PATH}?${text}` : WORKSPACE_PATH);
  };

  const local = endpoints.items.find((e) => e.local && e.status === "valid");

  const keyField: OnboardingKeyFieldProps = {
    provider,
    onProviderChange,
    value,
    onChange,
    status,
    error: status === "invalid" ? error : undefined,
  };

  return {
    open,
    path,
    onPathChange: setPath,
    keyField,
    connected: local
      ? { name: local.label, models: local.modelCount ?? 0 }
      : undefined,
    canStart: path === "pro" ? proReady : keys.canRun,
    onStart: () => {
      // Pro sends calls to our server; keys and local models are Free mode.
      setMode(path === "pro" ? "pro" : "free");
      finish();
      onStarted?.();
    },
    onSkip: finish,
    onOpenChange: (next: boolean) => {
      if (!next) finish();
    },
    onOpenSettings: () => {
      finish();
      onOpenSettings();
    },
  };
}
