import { useMemo, useState } from 'react';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import type { StoreState } from '~/store';
import type { OperatingMode } from '~/store/slices/modeSlice';
import { toError } from '~/lib/errors';

interface UseApiKeyModalOptions {
  safeApiKeys: StoreState['apiKeys'];
  hydratedStatuses: Record<Provider, ValidationStatus>;
  mode: OperatingMode;
  setApiKey: (provider: Provider, value: string) => Promise<void>;
  debouncedValidate: (
    provider: Provider,
    value: string,
    mode: OperatingMode,
    onStatusChange: (provider: Provider, status: ValidationStatus) => void,
  ) => void;
  toggleApiKeyVisibility: (provider: Provider) => void;
  onValidationStatusChange: (provider: Provider, status: ValidationStatus) => void;
}

export function useApiKeyModal({
  safeApiKeys,
  hydratedStatuses,
  mode,
  setApiKey,
  debouncedValidate,
  toggleApiKeyVisibility,
  onValidationStatusChange,
}: UseApiKeyModalOptions) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const apiKeyItems = useMemo(() => {
    if (!selectedProvider) return [];

    return [
      {
        provider: selectedProvider,
        label: `${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key`,
        value: safeApiKeys[selectedProvider]?.key ?? '',
        placeholder: selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'anthropic' ? 'sk-ant-...' : selectedProvider === 'google' ? 'AIza...' : selectedProvider === 'deepseek' ? 'sk-...' : 'xai-...',
        helperText:
          hydratedStatuses[selectedProvider] === 'valid'
            ? 'API key configured'
            : hydratedStatuses[selectedProvider] === 'validating'
            ? 'Validating...'
            : `Enter your ${selectedProvider} API key`,
        validationStatus: hydratedStatuses[selectedProvider],
        showKey: safeApiKeys[selectedProvider]?.visible ?? false,
      },
    ];
  }, [hydratedStatuses, safeApiKeys, selectedProvider]);

  const handleConfigureApiKey = (provider: Provider) => {
    setSelectedProvider(provider);
    setConfigModalOpen(true);
  };

  const handleKeyChange = (provider: Provider, value: string) => {
    void setApiKey(provider, value).catch((error: unknown) => {
      console.error(
        `Failed to store ${provider} API key`,
        toError(error, `Unable to store ${provider} API key`),
      );
    });
    debouncedValidate(provider, value, mode, onValidationStatusChange);
  };

  const handleToggleShow = (provider: Provider) => {
    toggleApiKeyVisibility(provider);
  };

  return {
    configModalOpen,
    setConfigModalOpen,
    selectedProvider,
    apiKeyItems,
    handleConfigureApiKey,
    handleKeyChange,
    handleToggleShow,
  };
}
