import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../atoms/Dialog';
import { Button } from '../../atoms/Button';
import { Textarea } from '../../atoms/Textarea';
import { Label } from '../../atoms/Label';
import { Input } from '../../atoms/Input';

export interface ManualResponseData {
  /** The response text */
  response: string;
  /** The model name */
  modelName: string;
  /** The model provider */
  modelProvider: string;
}

export interface ManualResponseModalProps {
  /** Whether the modal is open */
  open?: boolean;
  /** Callback when modal open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Current response value */
  value?: string;
  /** Callback when response value changes */
  onChange?: (value: string) => void;
  /** Current model name value */
  modelName?: string;
  /** Callback when model name changes */
  onModelNameChange?: (value: string) => void;
  /** Current model provider value */
  modelProvider?: string;
  /** Callback when model provider changes */
  onModelProviderChange?: (value: string) => void;
  /** Callback when submit button is clicked */
  onSubmit?: (data: ManualResponseData) => void;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Optional placeholder text for textarea */
  placeholder?: string;
  /** Optional title (defaults to "Manual Response") */
  title?: string;
  /** Whether the submit button is disabled */
  disabled?: boolean;
}

/**
 * ManualResponseModal organism for entering manual responses.
 *
 * Provides a dialog interface for users to manually enter a response
 * along with the model name and provider, with cancel and submit actions.
 *
 * @example
 * ```tsx
 * <ManualResponseModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   value={response}
 *   onChange={setResponse}
 *   modelName={modelName}
 *   onModelNameChange={setModelName}
 *   modelProvider={modelProvider}
 *   onModelProviderChange={setModelProvider}
 *   onSubmit={(data) => console.log('Submitted:', data)}
 *   onCancel={() => setIsOpen(false)}
 * />
 * ```
 */
export const ManualResponseModal = React.forwardRef<HTMLDivElement, ManualResponseModalProps>(
  (
    {
      open,
      onOpenChange,
      value = '',
      onChange,
      modelName = '',
      onModelNameChange,
      modelProvider = '',
      onModelProviderChange,
      onSubmit,
      onCancel,
      placeholder,
      title,
      disabled = false,
    },
    ref
  ) => {
    const { t } = useTranslation();

    const handleSubmit = () => {
      if (onSubmit) {
        onSubmit({
          response: value,
          modelName,
          modelProvider,
        });
      }
    };

    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      }
      if (onOpenChange) {
        onOpenChange(false);
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={ref} className="max-w-2xl" data-testid="manual-response-modal">
          <DialogTitle>{title || t('organisms.manualResponseModal.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('organisms.manualResponseModal.description')}
          </DialogDescription>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model-name">
                  {t('organisms.manualResponseModal.modelNameLabel')}
                </Label>
                <Input
                  id="model-name"
                  value={modelName}
                  onChange={(e) => onModelNameChange?.(e.target.value)}
                  placeholder={t('organisms.manualResponseModal.modelNamePlaceholder')}
                  data-testid="model-name-input"
                />
              </div>
              <div>
                <Label htmlFor="model-provider">
                  {t('organisms.manualResponseModal.modelProviderLabel')}
                </Label>
                <Input
                  id="model-provider"
                  value={modelProvider}
                  onChange={(e) => onModelProviderChange?.(e.target.value)}
                  placeholder={t('organisms.manualResponseModal.modelProviderPlaceholder')}
                  data-testid="model-provider-input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="manual-response">
                {t('organisms.manualResponseModal.responseLabel')}
              </Label>
              <Textarea
                id="manual-response"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder || t('organisms.manualResponseModal.responsePlaceholder')}
                className="min-h-[200px] resize-y"
                data-testid="response-textarea"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 sm:space-x-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              data-testid="cancel-button"
            >
              {t('organisms.manualResponseModal.cancelButton')}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={disabled || !value.trim() || !modelName.trim() || !modelProvider.trim()}
              data-testid="submit-button"
            >
              {t('organisms.manualResponseModal.submitButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

ManualResponseModal.displayName = 'ManualResponseModal';
