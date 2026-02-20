import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import type { OperatingMode } from '~/store/slices/modeSlice';

const DEFAULT_STATUS: Record<Provider, ValidationStatus> = {
  openai: 'idle',
  anthropic: 'idle',
  google: 'idle',
  xai: 'idle',
  deepseek: 'idle',
};

const READY_STATUS: Record<Provider, string> = {
  openai: 'Ready',
  anthropic: 'Ready',
  google: 'Ready',
  xai: 'Ready',
  deepseek: 'Ready',
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

export function createProviderStatusLabels(options: {
  mode: OperatingMode;
  statuses: Record<Provider, ValidationStatus>;
  hasHydrated: boolean;
}): Record<Provider, string> {
  if (options.mode === 'pro') {
    return READY_STATUS;
  }

  const statuses = getHydratedStatus(options.hasHydrated, options.statuses);
  return {
    openai: mapStatusToLabel(statuses.openai),
    anthropic: mapStatusToLabel(statuses.anthropic),
    google: mapStatusToLabel(statuses.google),
    xai: mapStatusToLabel(statuses.xai),
    deepseek: mapStatusToLabel(statuses.deepseek),
  };
}
