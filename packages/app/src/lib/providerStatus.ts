import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';

const DEFAULT_STATUS: Record<Provider, ValidationStatus> = {
  openai: 'idle',
  anthropic: 'idle',
  google: 'idle',
  xai: 'idle',
};

export function getHydratedStatus(
  hasHydrated: boolean,
  statuses: Record<Provider, ValidationStatus>,
): Record<Provider, ValidationStatus> {
  if (!hasHydrated) {
    return DEFAULT_STATUS;
  }
  return statuses;
}

export function mapStatusToLabel(status: ValidationStatus): string {
  switch (status) {
    case 'valid':
      return 'Ready';
    case 'validating':
      return 'Validating...';
    case 'invalid':
      return 'Invalid API key';
    default:
      return 'API key required';
  }
}
