import axios from 'axios';
import { sanitizeProviderErrorMessage } from './sanitizeSensitiveData';

export function extractAxiosErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return sanitizeProviderErrorMessage(
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      'Unknown provider error.',
    );
  }

  if (error instanceof Error) {
    return sanitizeProviderErrorMessage(error.message);
  }

  return 'Unknown provider error.';
}
