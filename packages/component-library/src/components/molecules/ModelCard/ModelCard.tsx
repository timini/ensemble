import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelModality } from '@ensemble-ai/shared-utils/providers';
import { Card, CardContent } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { ProviderLogo } from '../../atoms/ProviderLogo';
import { cn } from '@/lib/utils';

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'perplexity';
export type { ModelModality };

export interface ModelCardProps {
  /** AI provider for the model */
  provider: Provider;
  /** Display name of the model */
  modelName: string;
  /** Unique model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet') */
  modelId?: string;
  /** Whether the model is currently selected */
  selected: boolean;
  /** Whether this model is designated as the summarizer */
  isSummarizer?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when summarizer button is clicked */
  onSummarizerClick?: () => void;
  /** Supported modalities for the model */
  modalities?: ModelModality[];
}

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
      modelId,
      selected,
      isSummarizer = false,
      disabled = false,
      onClick,
      onSummarizerClick,
      modalities = [],
    },
    ref
  ) => {
    const { t } = useTranslation();

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

    const handleSummarizerClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click
      if (onSummarizerClick) {
        onSummarizerClick();
      }
    };

    // Generate unique test ID if modelId is provided
    const testId = modelId ? `model-card-${modelId}` : 'model-card';
    const summarizerButtonTestId = modelId ? `summarizer-button-${modelId}` : 'summarizer-button';

    return (
      <Card
        ref={ref}
        data-testid={testId}
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
              ? 'border-warning bg-warning/10'
              : 'border-primary bg-primary/10'
            : 'border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <CardContent className="p-4 text-center">
          <div className="mb-2 flex justify-center">
            <ProviderLogo provider={provider} size="lg" />
          </div>
          <div className="font-medium text-sm">{modelName}</div>
          {modalities.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
              {modalities.map((modality) => (
                <Badge
                  key={modality}
                  variant="outline"
                  className="px-1.5 py-0 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  data-testid={
                    modelId
                      ? `model-modality-${modelId}-${modality}`
                      : `model-modality-${modality}`
                  }
                >
                  {t(`molecules.modelCard.modalities.${modality}`)}
                </Badge>
              ))}
            </div>
          )}
          {isSummarizer && (
            <Badge className="absolute -top-2 -right-2 bg-warning text-warning-foreground text-xs">
              {t('molecules.modelCard.summarizer')}
            </Badge>
          )}
          {selected && onSummarizerClick && (
            <button
              data-testid={summarizerButtonTestId}
              onClick={handleSummarizerClick}
              className={cn(
                'mt-2 w-full px-2 py-1 text-xs font-medium rounded transition-colors',
                isSummarizer
                  ? 'bg-warning text-warning-foreground hover:bg-warning/80'
                  : 'border border-primary text-primary bg-transparent hover:bg-primary/10'
              )}
              aria-label={isSummarizer ? 'Remove as summarizer' : 'Set as summarizer'}
            >
              {isSummarizer ? '★ Summarizer' : 'Set as Summarizer'}
            </button>
          )}
        </CardContent>
      </Card>
    );
  }
);

ModelCard.displayName = 'ModelCard';
