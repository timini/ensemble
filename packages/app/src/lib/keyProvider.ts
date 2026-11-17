import type { OnboardingKeyProvider } from "@/components/molecules/OnboardingKeyField";

/** Prefixes that name one provider for sure. */
const PREFIXES: Array<[string, OnboardingKeyProvider]> = [
  ["sk-or-", "openrouter"],
  ["sk-ant-", "anthropic"],
  ["sk-proj-", "openai"],
  ["sk-svcacct-", "openai"],
  ["AIza", "google"],
  ["xai-", "xai"],
  ["pplx-", "perplexity"],
];

/**
 * Provider of an API key, from its prefix. A plain `sk-` key is used by
 * both OpenAI and DeepSeek, so it keeps DeepSeek when that is chosen and is
 * OpenAI otherwise. A key with no known prefix keeps the chosen provider.
 *
 * @param key - the key as typed
 * @param current - the provider chosen now
 */
export function detectKeyProvider(
  key: string,
  current: OnboardingKeyProvider,
): OnboardingKeyProvider {
  const value = key.trim();
  const match = PREFIXES.find(([prefix]) => value.startsWith(prefix));
  if (match) return match[1];
  if (value.startsWith("sk-"))
    return current === "deepseek" ? "deepseek" : "openai";
  return current;
}
