import * as React from 'react';
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
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 px-6 py-4 bg-orange-50 border border-orange-200 rounded-lg',
        className
      )}
      data-testid="summarizer-indicator"
    >
      <Icon className="text-orange-600" size="lg">
        <Zap />
      </Icon>
      <Text as="span" className="text-gray-700">
        <Text as="span" className="font-medium text-orange-900">
          Summarizer Model:
        </Text>{' '}
        <Text as="span" className="text-gray-900 font-semibold">
          {modelName}
        </Text>
      </Text>
    </div>
  );
});

SummarizerIndicator.displayName = 'SummarizerIndicator';
