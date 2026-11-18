/** Data shapes stored by the response slice. */
import type { TokenUsage } from "@ensemble-ai/shared-utils/providers";
import type { ProviderType } from "./ensembleSlice";
import type { ResponseErrorKind } from "./responseErrorState";

export interface ModelResponse {
  modelId: string;
  provider: ProviderType;
  model: string;
  response: string;
  isStreaming: boolean;
  isComplete: boolean;
  responseTime: number | null;
  tokenCount: number | null;
  /**
   * Input and output tokens reported by the provider, or null when it
   * reported none. Missing in runs persisted before usage was recorded.
   */
  usage?: TokenUsage | null;
  error: string | null;
  /** Kind of `error`. Missing in runs persisted before kinds were recorded. */
  errorKind?: ResponseErrorKind | null;
  /** Seconds the provider asked us to wait, for a rate limit. */
  retryAfterSeconds?: number | null;
}

export interface ManualResponse {
  id: string;
  label: string;
  response: string;
}

export interface AgreementStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  stddev: number;
}
