export function toError(
  error: unknown,
  fallbackMessage = 'Unknown error occurred',
): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(fallbackMessage);
  }
}

export function errorMessage(error: unknown, fallback?: string): string {
  return toError(error, fallback).message;
}
