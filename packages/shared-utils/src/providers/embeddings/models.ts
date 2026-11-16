/** OpenAI embedding model used for agreement scoring. */
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Gemini embedding model used for agreement scoring. `gemini-embedding-2` is
 * the current stable model in the Gemini API docs (checked November 2026).
 */
export const GOOGLE_EMBEDDING_MODEL = 'gemini-embedding-2';

/** Base URL of the OpenAI REST API. */
export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/** Base URL of the Gemini REST API. */
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
