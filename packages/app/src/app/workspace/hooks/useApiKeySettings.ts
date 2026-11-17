import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "~/store";
import { useHasHydrated } from "~/hooks/useHasHydrated";
import { useApiKeyAutoHide } from "./useApiKeyAutoHide";
import type {
  Provider,
  ValidationStatus,
} from "@/components/molecules/ApiKeyInput";
import { validateApiKey, createDebouncedValidator } from "~/lib/validation";
import { isWebCryptoAvailable } from "@ensemble-ai/shared-utils/security";
import { toError } from "~/lib/errors";
import { getHydratedStatus } from "~/lib/providerStatus";
import { logger } from "~/lib/logger";
import { endpointsProviderStatus } from "~/lib/endpointStatus";
import { API_KEY_PROVIDERS, apiKeyItem } from "~/lib/apiKeyItems";

const EMPTY_TIMEOUTS: Record<Provider, NodeJS.Timeout | null> = {
  openai: null,
  anthropic: null,
  google: null,
  xai: null,
  deepseek: null,
  perplexity: null,
};

/**
 * API keys for Free mode: the fields of the settings sheet, debounced
 * validation as the user types, validation of stored keys on load, and
 * whether the user can run anything yet (one valid key or one connected
 * endpoint is enough). Call it once in the workspace so stored keys are
 * checked even while settings are closed.
 */
export function useApiKeySettings() {
  const { t } = useTranslation("common");
  const apiKeys = useStore((state) => state.apiKeys);
  const hasValidEndpoint = useStore(
    (state) => endpointsProviderStatus(state.endpoints) === "valid",
  );
  const setApiKey = useStore((state) => state.setApiKey);
  const toggleApiKeyVisibility = useStore(
    (state) => state.toggleApiKeyVisibility,
  );
  const setApiKeyStatus = useStore((state) => state.setApiKeyStatus);
  const hasHydrated = useHasHydrated();
  const timeoutRefs = useRef({ ...EMPTY_TIMEOUTS });
  const { resetAutoHideTimer } = useApiKeyAutoHide();
  const [webCryptoSupported, setWebCryptoSupported] = useState(true);

  const validationStatus = useMemo(
    () =>
      Object.fromEntries(
        API_KEY_PROVIDERS.map((p) => [p, apiKeys[p]?.status ?? "idle"]),
      ) as Record<Provider, ValidationStatus>,
    [apiKeys],
  );
  const hydratedStatuses = useMemo(
    () => getHydratedStatus(hasHydrated, validationStatus),
    [hasHydrated, validationStatus],
  );

  const onStatusChange = useCallback(
    (provider: Provider, status: ValidationStatus, error?: string) => {
      setApiKeyStatus(provider, status, error);
    },
    [setApiKeyStatus],
  );
  const debouncedValidate = createDebouncedValidator(
    timeoutRefs,
    validateApiKey,
  );

  useEffect(() => {
    setWebCryptoSupported(isWebCryptoAvailable());
  }, []);

  // Stored keys come back with their last status; keys never checked are
  // validated once they are decrypted.
  useEffect(() => {
    if (!webCryptoSupported) return;
    API_KEY_PROVIDERS.forEach((provider) => {
      const key = apiKeys[provider]?.key ?? "";
      if (key.length > 0 && validationStatus[provider] === "idle") {
        void validateApiKey({
          provider,
          apiKey: key,
          userMode: "free",
          onStatusChange,
        });
      }
    });
  }, [apiKeys, onStatusChange, validationStatus, webCryptoSupported]);

  useEffect(() => {
    const timeouts = timeoutRefs.current;
    return () => {
      Object.values(timeouts).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const onKeyChange = (provider: Provider, value: string) => {
    void setApiKey(provider, value).catch((error: unknown) => {
      logger.error(
        `Failed to store ${provider} API key`,
        toError(error, `Unable to store ${provider} API key`),
      );
    });
    debouncedValidate(provider, value, "free", onStatusChange);
    resetAutoHideTimer();
  };

  const items = useMemo(
    () =>
      API_KEY_PROVIDERS.map((provider) => {
        const item = apiKeyItem(
          provider,
          apiKeys[provider],
          hydratedStatuses[provider],
          t,
        );
        return hasHydrated ? item : { ...item, value: "", showKey: false };
      }),
    [apiKeys, hasHydrated, hydratedStatuses, t],
  );

  const validKeyCount = API_KEY_PROVIDERS.filter(
    (p) => hydratedStatuses[p] === "valid",
  ).length;

  return {
    items,
    validKeyCount,
    hydratedStatuses,
    webCryptoSupported,
    /** At least one valid key or connected endpoint. */
    canRun: hasHydrated && (validKeyCount > 0 || hasValidEndpoint),
    onKeyChange,
    onToggleShow: toggleApiKeyVisibility,
  };
}
