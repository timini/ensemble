import axios from 'axios';

export function extractAxiosErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      'Unknown provider error.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown provider error.';
}
