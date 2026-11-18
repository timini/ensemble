import {
  GOOGLE_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_MODEL,
} from "@ensemble-ai/shared-utils/providers";
import { PRICE_TABLE, type PriceTable } from "@ensemble-ai/shared-utils/pricing";

/** A model as Pro calls it: our ids for billing, the OpenRouter id for the call. */
export interface ProModel {
  provider: string;
  modelId: string;
  openRouterId: string;
}

/** The model has no price, so a Pro run could not bill it. */
export class UnpricedModelError extends Error {
  constructor(readonly model: string) {
    super(`Pro cannot run ${model}: it has no price.`);
    this.name = "UnpricedModelError";
  }
}

/** Pro is not configured on this server (no OpenRouter key). */
export class ProUnavailableError extends Error {
  constructor() {
    super("Pro mode is not available on this server.");
    this.name = "ProUnavailableError";
  }
}

/**
 * Our provider and model id to the OpenRouter id, through the price table
 * (refreshed from OpenRouter, so every priced model has its OpenRouter id).
 * A model with no entry is refused: it could not be billed.
 */
export function resolveProModel(
  provider: string,
  modelId: string,
  table: PriceTable = PRICE_TABLE,
): ProModel {
  const entry = table.models[`${provider}/${modelId}`];
  if (!entry) throw new UnpricedModelError(`${provider}/${modelId}`);
  return { provider, modelId, openRouterId: entry.openRouterId };
}

const EMBEDDING_MODELS: Record<string, string> = {
  openai: OPENAI_EMBEDDING_MODEL,
  google: GOOGLE_EMBEDDING_MODEL,
};

/** The embedding model Free mode uses for a provider, as a Pro model. */
export function embeddingModelFor(
  provider: string,
  table: PriceTable = PRICE_TABLE,
): ProModel {
  const modelId = EMBEDDING_MODELS[provider];
  if (!modelId) throw new UnpricedModelError(`${provider} embeddings`);
  return resolveProModel(provider, modelId, table);
}
