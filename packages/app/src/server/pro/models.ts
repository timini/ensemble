import {
  GOOGLE_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_MODEL,
} from "@ensemble-ai/shared-utils/providers";
import {
  PRICE_TABLE,
  type PriceTable,
} from "@ensemble-ai/shared-utils/pricing";

/** A model as Pro calls it: our ids for billing, the OpenRouter id for the call. */
export interface ProModel {
  provider: string;
  modelId: string;
  openRouterId: string;
}

/** The model has no price, so a Pro run could not bill it. */
export class UnpricedModelError extends Error {
  constructor(
    readonly model: string,
    why = "it has no price",
  ) {
    super(`Pro cannot run ${model}: ${why}.`);
    this.name = "UnpricedModelError";
  }
}

/** The `provider/model` key of a model in the price table and in a run record. */
export function modelKey(model: { provider: string; modelId: string }) {
  return `${model.provider}/${model.modelId}`;
}

/**
 * The models a reserved run may call: its answering models, the summarizer
 * (the first model when none is set) and the embedding model. Each must
 * have a price above zero, or the run could make calls it never pays for.
 * Throws a RangeError for a model with no price (as reserveForRun does)
 * and UnpricedModelError for one priced at zero.
 */
export function billableRunModels(
  run: {
    models: { provider: string; modelId: string }[];
    summarizer: { provider: string; modelId: string } | null;
    embeddings: { provider: string; modelId: string } | null;
  },
  table: PriceTable = PRICE_TABLE,
): string[] {
  const refs = [
    ...run.models,
    run.summarizer ?? run.models[0],
    run.embeddings,
  ].filter((ref): ref is { provider: string; modelId: string } => !!ref);
  const keys = [...new Set(refs.map(modelKey))];
  for (const key of keys) {
    const entry = table.models[key];
    if (!entry) throw new RangeError(`No price for ${key}`);
    if (!(entry.inputPerMillion > 0) && !(entry.outputPerMillion > 0)) {
      throw new UnpricedModelError(key, "its price is zero");
    }
  }
  return keys;
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
