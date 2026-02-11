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
      className={`bg-primary/10 border-primary/20 ${className}`}
      data-testid="prompt-tips"
    >
      <div className="p-6">
        <Heading
          level={3}
          size="lg"
          className="mb-4 text-primary"
        >
          {t('pages.prompt.tipsHeading')}
        </Heading>
        <Text
          variant="body"
          color="muted"
          className="mb-4 text-primary/80"
        >
          {t('pages.prompt.tipsDescription')}
        </Text>
        <ul className="space-y-2 text-sm text-primary/80">
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
