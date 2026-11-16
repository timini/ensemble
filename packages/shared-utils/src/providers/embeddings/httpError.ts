import { sanitizeProviderErrorMessage } from '../utils/sanitizeSensitiveData';

/**
 * Build a sanitized error from a failed embeddings HTTP response. The provider
 * message is kept when present, with any API key shapes redacted.
 */
export async function embeddingsHttpError(
  label: string,
  response: Response,
): Promise<Error> {
  let detail = '';
  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof body.error === 'string') detail = body.error;
    else detail = body.error?.message ?? body.message ?? '';
  } catch {
    detail = response.statusText;
  }
  const message = sanitizeProviderErrorMessage(detail, 'Request failed.');
  return new Error(`${label} embeddings request failed (${response.status}): ${message}`);
}
