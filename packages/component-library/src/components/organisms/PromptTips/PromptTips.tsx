/**
 * PromptTips Component
 *
 * Displays helpful tips for crafting better prompts in a visually distinct card.
 * Used on the prompt input page to guide users toward more effective prompt engineering.
 */

import { useTranslation } from 'react-i18next';
import { Card } from '../../atoms/Card';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';

export interface PromptTipsProps {
  /**
   * Additional CSS classes to apply to the wrapper
   */
  className?: string;
}

/**
 * PromptTips organism component
 *
 * @example
 * ```tsx
 * <PromptTips />
 * ```
 */
export function PromptTips({ className = '' }: PromptTipsProps) {
  const { t } = useTranslation();

  return (
    <Card
      className={`bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ${className}`}
      data-testid="prompt-tips"
    >
      <div className="p-6">
        <Heading
          level={3}
          size="lg"
          className="mb-4 text-blue-900 dark:text-blue-100"
        >
          {t('pages.prompt.tipsHeading')}
        </Heading>
        <Text
          variant="body"
          color="muted"
          className="mb-4 text-blue-800 dark:text-blue-200"
        >
          {t('pages.prompt.tipsDescription')}
        </Text>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>
            <strong>{t('pages.prompt.tip1')}</strong>
          </li>
          <li>
            <strong>{t('pages.prompt.tip2')}</strong>
          </li>
          <li>
            <strong>{t('pages.prompt.tip3')}</strong>
          </li>
          <li>
            <strong>{t('pages.prompt.tip4')}</strong>
          </li>
        </ul>
      </div>
    </Card>
  );
}
