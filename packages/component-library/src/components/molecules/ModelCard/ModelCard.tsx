import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { cn } from '@/lib/utils';

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai';

export interface ModelCardProps {
  /** AI provider for the model */
  provider: Provider;
  /** Display name of the model */
  modelName: string;
  /** Whether the model is currently selected */
  selected: boolean;
  /** Whether this model is designated as the summarizer */
  isSummarizer?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
}

const PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
  },
  google: {
    name: 'Google',
    icon: '🔍',
  },
  xai: {
    name: 'XAI',
    icon: '🚀',
  },
} as const;

/**
 * ModelCard molecule for selecting AI models in an ensemble.
 *
 * Combines Card and Badge atoms to create a clean, centered selectable model card
 * matching the wireframe design with provider icons and selection states.
 *
 * @example
 * ```tsx
 * <ModelCard
 *   provider="openai"
 *   modelName="GPT-4"
 *   selected={true}
 *   isSummarizer={false}
 *   onClick={handleSelect}
 * />
 * ```
 */
export const ModelCard = React.forwardRef<HTMLDivElement, ModelCardProps>(
  (
    {
      provider,
      modelName,
      selected,
      isSummarizer = false,
      disabled = false,
      onClick,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const config = PROVIDER_CONFIG[provider];

    const handleClick = () => {
      if (!disabled && onClick) {
        onClick();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    };

    return (
      <Card
        ref={ref}
        data-testid="model-card"
        data-provider={provider}
        data-selected={selected}
        data-summarizer={isSummarizer}
        data-disabled={disabled}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={selected}
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative cursor-pointer transition-all hover:shadow-md',
          selected
            ? isSummarizer
              ? 'border-orange-500 bg-orange-50'
              : 'border-blue-500 bg-blue-50'
            : 'border-gray-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <CardContent className="p-4 text-center">
          <div className="text-2xl mb-2">{config.icon}</div>
          <div className="font-medium text-sm">{modelName}</div>
          {isSummarizer && (
            <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs">
              {t('molecules.modelCard.summarizer')}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }
);

ModelCard.displayName = 'ModelCard';
