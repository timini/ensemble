/**
 * PromptInputWithHint Component
 *
 * Prompt input area with label, keyboard hint, and textarea.
 * Used on the prompt page for entering user prompts with visual guidance.
 */

import { useTranslation } from 'react-i18next';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';

export interface PromptInputWithHintProps {
  /**
   * Current value of the prompt
   */
  value: string;
  /**
   * Callback when the prompt value changes
   */
  onChange: (value: string) => void;
  /**
   * Placeholder text for the textarea
   */
  placeholder?: string;
  /**
   * Additional CSS classes to apply to the wrapper
   */
  className?: string;
  /**
   * Data test ID for the textarea
   */
  dataTestId?: string;
}

/**
 * PromptInputWithHint organism component
 *
 * @example
 * ```tsx
 * <PromptInputWithHint
 *   value={prompt}
 *   onChange={setPrompt}
 *   placeholder="Enter your prompt here..."
 * />
 * ```
 */
export function PromptInputWithHint({
  value,
  onChange,
  placeholder,
  className = '',
  dataTestId = 'prompt-textarea',
}: PromptInputWithHintProps) {
  const { t } = useTranslation();

  return (
    <div className={className} data-testid="prompt-input-with-hint">
      <div className="flex items-center justify-between mb-4">
        <Heading level={3} size="lg">
          {t('pages.prompt.inputLabel')}
        </Heading>
        <Text variant="caption" color="muted">
          {t('pages.prompt.keyboardHint')}
        </Text>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('pages.prompt.placeholder')}
        className="w-full min-h-[200px] p-4 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y bg-background text-foreground"
        data-testid={dataTestId}
      />
    </div>
  );
}
