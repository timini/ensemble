import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ApiKeyConfiguration, type ApiKeyConfigurationItem } from '../ApiKeyConfiguration';
import { Button } from '../../atoms/Button';
import type { Provider } from '../../molecules/ApiKeyInput';

export interface ApiKeyConfigurationModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** The provider to configure */
  provider: Provider | null;
  /** Array of API key configurations */
  items: ApiKeyConfigurationItem[];
  /** Callback when an API key value changes */
  onKeyChange: (provider: Provider, value: string) => void;
  /** Callback when show/hide toggle is clicked */
  onToggleShow: (provider: Provider) => void;
}

/**
 * ApiKeyConfigurationModal organism for configuring API keys in a modal.
 *
 * Wraps ApiKeyConfiguration in a modal dialog for inline configuration.
 *
 * @example
 * ```tsx
 * <ApiKeyConfigurationModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   provider="openai"
 *   items={apiKeyItems}
 *   onKeyChange={(provider, value) => handleKeyChange(provider, value)}
 *   onToggleShow={(provider) => handleToggleShow(provider)}
 * />
 * ```
 */
export const ApiKeyConfigurationModal = React.forwardRef<
  HTMLDivElement,
  ApiKeyConfigurationModalProps
>(({ open, onOpenChange, provider, items, onKeyChange, onToggleShow }, ref) => {
  const { t } = useTranslation();

  if (!open || !provider) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      data-testid="api-key-configuration-modal"
    >
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-card-foreground">
              {t('organisms.apiKeyConfigurationModal.title')}
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label="Close modal"
              data-testid="close-modal-button"
            >
              <svg
                className="w-6 h-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <ApiKeyConfiguration
            items={items}
            onKeyChange={onKeyChange}
            onToggleShow={onToggleShow}
          />

          <div className="mt-6 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              {t('organisms.apiKeyConfigurationModal.done')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

ApiKeyConfigurationModal.displayName = 'ApiKeyConfigurationModal';
