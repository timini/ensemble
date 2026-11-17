import { useTranslation } from 'react-i18next';
import { ClipboardPaste, X } from 'lucide-react';
import { ModelLogo } from '../../atoms/ModelLogo';
import type { ProviderLogoProvider } from '../../atoms/ProviderLogo';
import { cn } from '../../../lib/utils';

export interface ModelChipProps {
  /** Display name of the model, or the label of a manual answer. */
  name: string;
  /** Provider, for the logo. Not needed for manual answers. */
  provider?: ProviderLogoProvider;
  /** `manual` for an answer added by hand. Defaults to `model`. */
  kind?: 'model' | 'manual';
  /** Shows a remove button when set. */
  onRemove?: () => void;
  /** Model id or manual answer id, set as `data-model-id`. */
  modelId?: string;
  /** Defaults to `model-chip`. */
  testId?: string;
  className?: string;
}

/**
 * ModelChip molecule: one member of the ensemble in the composer, with its
 * logo and a remove button. Answers added by hand get a clipboard mark.
 *
 * @example
 * ```tsx
 * <ModelChip name="Claude Opus 5.5" provider="anthropic" onRemove={() => remove(id)} />
 * ```
 */
export function ModelChip({ name, provider, kind = 'model', onRemove, modelId, testId = 'model-chip', className }: ModelChipProps) {
  const { t } = useTranslation();
  const manual = kind === 'manual';
  return (
    <span
      data-testid={testId}
      data-kind={kind}
      data-model-id={modelId}
      title={manual ? t('molecules.modelChip.manual') : undefined}
      className={cn(
        'inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-background pl-1 text-label',
        onRemove ? 'pr-1' : 'pr-3',
        manual && 'border-dashed',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full',
          (manual || !provider) && 'bg-muted text-muted-foreground',
        )}
      >
        {manual || !provider ? (
          <ClipboardPaste className="size-3.5" aria-hidden="true" />
        ) : (
          <ModelLogo provider={provider} modelName={name} size="sm" />
        )}
      </span>
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('molecules.modelChip.remove', { name })}
          data-testid={`${testId}-remove`}
          className="focus-ring inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
