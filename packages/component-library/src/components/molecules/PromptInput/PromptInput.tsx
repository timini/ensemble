import * as React from 'react';
import { Textarea } from '../../atoms/Textarea';
import { Label } from '../../atoms/Label';
import { InlineAlert } from '../../atoms/InlineAlert';
import { cn } from '@/lib/utils';

export interface PromptInputProps {
  /** Label text for the textarea */
  label: string;
  /** Current value of the prompt */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text displayed below textarea */
  helperText?: string;
  /** Error message when validation fails */
  error?: string;
  /** Minimum character length for validation */
  minLength?: number;
  /** Maximum character length */
  maxLength?: number;
  /** Whether the textarea is disabled */
  disabled?: boolean;
  /** Debounce delay in milliseconds for onChange (default: 300) */
  debounceMs?: number;
  /** Callback when value changes (debounced) */
  onChange?: (value: string) => void;
}

/**
 * PromptInput molecule for entering AI prompts with character counting and validation.
 *
 * Combines Textarea, Label, and InlineAlert atoms to create a complete
 * prompt input experience with real-time character counting and debounced onChange.
 *
 * @example
 * ```tsx
 * <PromptInput
 *   label="Enter your prompt"
 *   placeholder="Ask a question..."
 *   minLength={10}
 *   maxLength={5000}
 *   value={prompt}
 *   onChange={setPrompt}
 * />
 * ```
 */
export const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(
  (
    {
      label,
      value = '',
      placeholder,
      helperText,
      error,
      minLength: _minLength,
      maxLength,
      disabled = false,
      debounceMs = 300,
      onChange,
    },
    ref
  ) => {
    const textareaId = React.useId();
    const errorId = React.useId();
    const helperTextId = React.useId();

    const [internalValue, setInternalValue] = React.useState(value);
    const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Sync internal value with prop value
    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      // Update internal value immediately for responsive UI
      setInternalValue(newValue);

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer for onChange callback
      debounceTimerRef.current = setTimeout(() => {
        onChange?.(newValue);
      }, debounceMs);
    };

    // Cleanup debounce timer on unmount
    React.useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const charCount = internalValue.length;
    const isInvalid = !!error;

    // Determine counter color based on usage
    const getCounterColor = () => {
      if (!maxLength) return 'text-muted-foreground';

      const percentage = (charCount / maxLength) * 100;

      if (percentage >= 100) return 'text-destructive';
      if (percentage >= 80) return 'text-warning';

      return 'text-muted-foreground';
    };

    return (
      <div className="w-full space-y-2">
        <Label htmlFor={textareaId}>{label}</Label>

        <div className="relative">
          <Textarea
            ref={ref}
            id={textareaId}
            value={internalValue}
            placeholder={placeholder}
            onChange={handleChange}
            disabled={disabled}
            maxLength={maxLength}
            aria-invalid={isInvalid ? 'true' : undefined}
            aria-describedby={
              error
                ? errorId
                : helperText
                  ? helperTextId
                  : undefined
            }
            className={cn(
              'min-h-[120px] resize-y',
              isInvalid && 'border-destructive',
              disabled && 'disabled:opacity-50'
            )}
          />

          {/* Character counter */}
          <div
            data-testid="character-counter"
            className={cn(
              'absolute bottom-2 right-2 text-xs font-medium',
              getCounterColor()
            )}
          >
            {maxLength ? `${charCount} / ${maxLength}` : charCount}
          </div>
        </div>

        {/* Helper text or error message */}
        {helperText && !error && (
          <p id={helperTextId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}

        {error && isInvalid && (
          <InlineAlert id={errorId} variant="error">
            {error}
          </InlineAlert>
        )}
      </div>
    );
  }
);

PromptInput.displayName = 'PromptInput';
