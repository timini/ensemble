/**
 * The API key fields shown on /config and in the /ensemble key modal: one per
 * key provider, with translated label and helper text. Provider names are
 * brand names and stay untranslated.
 */
import type {
  Provider,
  ValidationStatus,
} from "@/components/molecules/ApiKeyInput";

/** Key providers in display order. */
export const API_KEY_PROVIDERS: Provider[] = [
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "perplexity",
];

const PROVIDER_NAMES: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google (Gemini)",
  xai: "xAI (Grok)",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
};

const PLACEHOLDERS: Record<Provider, string> = {
  openai: "sk-...",
  anthropic: "sk-ant-...",
  google: "AIza...",
  xai: "xai-...",
  deepseek: "sk-...",
  perplexity: "pplx-...",
};

/** The stored key data the field needs. */
interface StoredKey {
  key?: string;
  visible?: boolean;
  error?: string;
}

export interface ApiKeyItem {
  provider: Provider;
  label: string;
  value: string;
  placeholder: string;
  helperText: string;
  error?: string;
  validationStatus: ValidationStatus;
  showKey: boolean;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

function helperKey(status: ValidationStatus): string {
  if (status === "valid") return "apiKeys.helper.valid";
  if (status === "validating") return "apiKeys.helper.validating";
  if (status === "invalid") return "apiKeys.helper.invalid";
  return "apiKeys.helper.idle";
}

/** One API key field, labelled in the current language (`t` from the `common` namespace). */
export function apiKeyItem(
  provider: Provider,
  stored: StoredKey | null | undefined,
  status: ValidationStatus,
  t: Translate,
): ApiKeyItem {
  const name = PROVIDER_NAMES[provider];
  return {
    provider,
    label: t("apiKeys.label", { provider: name }),
    value: stored?.key ?? "",
    placeholder: PLACEHOLDERS[provider],
    helperText: t(helperKey(status), { provider: name }),
    ...(stored?.error ? { error: stored.error } : {}),
    validationStatus: status,
    showKey: stored?.visible ?? false,
  };
}
