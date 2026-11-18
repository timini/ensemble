/** Settings of the Pro run path, all from the server environment. */
export interface ProConfig {
  /** Server key for OpenRouter. Without it (and without the mock upstream) Pro calls fail with SERVICE_UNAVAILABLE. */
  openRouterApiKey: string | undefined;
  openRouterBaseURL: string;
  /** Most tokens (input and output, all calls) one run may use. */
  maxRunTokens: number;
  /** Most output tokens one call may produce (`max_tokens`). */
  maxCallOutputTokens: number;
  /** Most model and embedding calls in one run, retries included. */
  maxCallsPerRun: number;
  /** Runs one user may start per window. */
  rateLimitRuns: number;
  rateLimitWindowSeconds: number;
  /** An open run older than this is settled when the same user starts another. */
  staleRunMinutes: number;
  /** Answer from the mock client instead of OpenRouter (mock mode, E2E). Never spends. */
  mockUpstream: boolean;
  /** Refuse Pro calls without a valid Firebase App Check token. */
  appCheckEnforce: boolean;
}

export interface ProEnv {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_BASE_URL?: string;
  PRO_MAX_RUN_TOKENS?: string;
  PRO_MAX_CALL_OUTPUT_TOKENS?: string;
  PRO_MAX_CALLS_PER_RUN?: string;
  PRO_RATE_LIMIT_RUNS?: string;
  PRO_RATE_LIMIT_WINDOW_SECONDS?: string;
  PRO_MOCK_UPSTREAM?: string;
  APP_CHECK_ENFORCE?: string;
  NEXT_PUBLIC_MOCK_MODE?: string;
}

export const DEFAULT_PRO_CONFIG: ProConfig = {
  openRouterApiKey: undefined,
  openRouterBaseURL: "https://openrouter.ai/api/v1",
  maxRunTokens: 200_000,
  maxCallOutputTokens: 8_192,
  maxCallsPerRun: 150,
  rateLimitRuns: 10,
  rateLimitWindowSeconds: 60,
  staleRunMinutes: 30,
  mockUpstream: false,
  appCheckEnforce: false,
};

function positiveInt(name: string, raw: string | undefined, fallback: number) {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a whole number above zero, got "${raw}"`);
  }
  return value;
}

function text(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  return value;
}

/** Read the Pro settings from the environment, with the documented defaults. */
export function readProConfig(env: ProEnv): ProConfig {
  const d = DEFAULT_PRO_CONFIG;
  return {
    openRouterApiKey: text(env.OPENROUTER_API_KEY),
    openRouterBaseURL: text(env.OPENROUTER_BASE_URL) ?? d.openRouterBaseURL,
    maxRunTokens: positiveInt(
      "PRO_MAX_RUN_TOKENS",
      env.PRO_MAX_RUN_TOKENS,
      d.maxRunTokens,
    ),
    maxCallOutputTokens: positiveInt(
      "PRO_MAX_CALL_OUTPUT_TOKENS",
      env.PRO_MAX_CALL_OUTPUT_TOKENS,
      d.maxCallOutputTokens,
    ),
    maxCallsPerRun: positiveInt(
      "PRO_MAX_CALLS_PER_RUN",
      env.PRO_MAX_CALLS_PER_RUN,
      d.maxCallsPerRun,
    ),
    rateLimitRuns: positiveInt(
      "PRO_RATE_LIMIT_RUNS",
      env.PRO_RATE_LIMIT_RUNS,
      d.rateLimitRuns,
    ),
    rateLimitWindowSeconds: positiveInt(
      "PRO_RATE_LIMIT_WINDOW_SECONDS",
      env.PRO_RATE_LIMIT_WINDOW_SECONDS,
      d.rateLimitWindowSeconds,
    ),
    staleRunMinutes: d.staleRunMinutes,
    mockUpstream:
      env.PRO_MOCK_UPSTREAM === "true" || env.NEXT_PUBLIC_MOCK_MODE === "true",
    appCheckEnforce: env.APP_CHECK_ENFORCE === "true",
  };
}
