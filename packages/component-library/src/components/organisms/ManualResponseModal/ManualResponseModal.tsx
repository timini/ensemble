import * as React from 'react';
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

export interface ManualResponseModalProps {
  /** Whether the modal is open */
  open?: boolean;
  /** Callback when modal open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Current response value */
  value?: string;
  /** Callback when response value changes */
  onChange?: (value: string) => void;
  /** Callback when submit button is clicked */
  onSubmit?: (value: string) => void;
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
 * with cancel and submit actions.
 *
 * @example
 * ```tsx
 * <ManualResponseModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   value={response}
 *   onChange={setResponse}
 *   onSubmit={(value) => console.log('Submitted:', value)}
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
      onSubmit,
      onCancel,
      placeholder = 'Enter your response here...',
      title = 'Manual Response',
      disabled = false,
    },
    ref
  ) => {
    const handleSubmit = () => {
      if (onSubmit) {
        onSubmit(value);
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter a manual response for the current prompt
          </DialogDescription>

          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-response" className="sr-only">
                Response
              </Label>
              <Textarea
                id="manual-response"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
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
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
              data-testid="submit-button"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

ManualResponseModal.displayName = 'ManualResponseModal';
