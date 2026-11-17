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
      /** A model on the user's own machine (Ollama, LM Studio, ...): it costs nothing. */
      local?: true;
    }
  | { status: 'unknown' };

/** A provider and one of its model ids, as our clients name them. */
export interface ModelRef {
  provider: string;
  modelId: string;
}
