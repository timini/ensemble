/**
 * Thrown when a provider has no embeddings API we can call.
 *
 * Callers use it to tell the user that agreement cannot be scored with this
 * provider, instead of falling back to fake vectors.
 */
export class EmbeddingsNotSupportedError extends Error {
  readonly provider: string;

  constructor(provider: string) {
    super(`${provider} does not provide an embeddings API.`);
    this.name = 'EmbeddingsNotSupportedError';
    this.provider = provider;
  }
}

/** Type guard that also works across bundle boundaries (checks the name). */
export function isEmbeddingsNotSupportedError(
  error: unknown,
): error is EmbeddingsNotSupportedError {
  return (
    error instanceof EmbeddingsNotSupportedError ||
    (error instanceof Error && error.name === 'EmbeddingsNotSupportedError')
  );
}
