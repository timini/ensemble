const URL_KEY_PARAM_PATTERN = /([?&](?:key|api[_-]?key|apikey)=)([^&#\s]+)/gi;
const BEARER_TOKEN_PATTERN = /\b(Bearer\s+)([A-Za-z0-9._-]{8,})\b/g;
const AUTH_HEADER_PATTERN = /(\bAuthorization\s*[:=]\s*Bearer\s+)([A-Za-z0-9._-]{8,})\b/gi;
const KNOWN_API_KEY_PATTERNS: RegExp[] = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/g,
  /\bsk-ant-[A-Za-z0-9_-]{8,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bxai-[A-Za-z0-9_-]{8,}\b/g,
  /\bpplx-[A-Za-z0-9_-]{8,}\b/g,
];

const REDACTED_VALUE = '[REDACTED]';

function redactKnownApiKeyShapes(input: string): string {
  return KNOWN_API_KEY_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, REDACTED_VALUE),
    input,
  );
}

export function redactSensitiveData(input: string): string {
  return redactKnownApiKeyShapes(input)
    .replace(URL_KEY_PARAM_PATTERN, `$1${REDACTED_VALUE}`)
    .replace(BEARER_TOKEN_PATTERN, `$1${REDACTED_VALUE}`)
    .replace(AUTH_HEADER_PATTERN, `$1${REDACTED_VALUE}`);
}

export function sanitizeProviderErrorMessage(
  message: string | null | undefined,
  fallback = 'Unknown provider error.',
): string {
  if (!message) {
    return fallback;
  }

  const redacted = redactSensitiveData(message).trim();
  return redacted.length > 0 ? redacted : fallback;
}
