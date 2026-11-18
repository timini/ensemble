import type {
  Provider,
  ValidationStatus,
} from "@/components/molecules/ApiKeyInput";

const DEFAULT_STATUS: Record<Provider, ValidationStatus> = {
  openai: "idle",
  anthropic: "idle",
  google: "idle",
  xai: "idle",
  deepseek: "idle",
  perplexity: "idle",
};

/** Key statuses to show: all idle until the store has hydrated, so the first render matches the server. */
export function getHydratedStatus(
  hasHydrated: boolean,
  statuses: Record<Provider, ValidationStatus>,
): Record<Provider, ValidationStatus> {
  if (!hasHydrated) {
    return DEFAULT_STATUS;
  }
  return statuses;
}
