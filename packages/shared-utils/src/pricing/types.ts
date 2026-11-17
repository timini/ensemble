/** Price of one model in USD per million tokens. */
export interface PriceEntry {
  inputPerMillion: number;
  outputPerMillion: number;
  /** The OpenRouter id the price was taken from. */
  openRouterId: string;
}

/** The generated price table, keyed by `${provider}/${modelId}`. */
export interface PriceTable {
  source: string;
  /** Date of the last refresh, YYYY-MM-DD. */
  fetchedAt: string;
  models: Record<string, PriceEntry>;
}

/** Result of a price lookup. An unknown model never gets a guessed price. */
export type ModelPrice =
  | {
      status: 'known';
      inputPerMillion: number;
      outputPerMillion: number;
      /** A model on a local server at a loopback URL (see isLocalEndpoint): it costs nothing. */
      local?: true;
    }
  | { status: 'unknown' };

/** A provider and one of its model ids, as our clients name them. */
export interface ModelRef {
  provider: string;
  modelId: string;
}

/**
 * Where an OpenAI-compatible endpoint is, for pricing its models. The id is
 * the prefix of the endpoint's model ids (`ollama` in `ollama/llama3.2:3b`).
 */
export interface EndpointLocation {
  id: string;
  baseURL: string;
}
