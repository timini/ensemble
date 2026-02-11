import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import { cn } from '../../../lib/utils';

export interface SummarizerIndicatorProps {
  /** Name of the summarizer model */
  modelName: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SummarizerIndicator molecule displays the selected summarizer model.
 *
 * A prominent banner showing which model is designated as the summarizer
 * in an ensemble configuration.
 *
 * @example
 * ```tsx
 * <SummarizerIndicator modelName="Claude 3 Opus" />
 * <SummarizerIndicator modelName="GPT-4 Turbo" />
 * ```
 */
export const SummarizerIndicator = React.forwardRef<
  HTMLDivElement,
  SummarizerIndicatorProps
>(({ modelName, className }, ref) => {
  const { t } = useTranslation();

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 px-6 py-4 bg-warning/10 border border-warning/30 rounded-lg',
        className
      )}
      data-testid="summarizer-indicator"
    >
      <Icon className="text-warning" size="lg">
        <Zap />
      </Icon>
      <Text as="span" className="text-muted-foreground">
        <Text as="span" className="font-medium text-warning">
          {t('molecules.summarizerIndicator.label')}
        </Text>{' '}
        <Text as="span" className="text-foreground font-semibold">
          {modelName}
        </Text>
      </Text>
    </div>
  );
});

SummarizerIndicator.displayName = 'SummarizerIndicator';
