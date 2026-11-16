import { useTranslation } from 'react-i18next';
import { Heading } from '../../atoms/Heading';
import { InlineAlert } from '../../atoms/InlineAlert';

/** Providers that can compute embeddings. */
export type EmbeddingsProviderId = 'openai' | 'google';

/** Stored preference: a provider, or `auto`. */
export type EmbeddingsProviderValue = 'auto' | EmbeddingsProviderId;

export interface EmbeddingsProviderSelectorProps {
  /** Current preference. */
  value: EmbeddingsProviderValue;
  /** Whether each provider has a valid API key. */
  available: Record<EmbeddingsProviderId, boolean>;
  /** Provider that will compute embeddings, or null when none can. */
  activeProvider: EmbeddingsProviderId | null;
  /** Called when the user picks an option. */
  onChange: (value: EmbeddingsProviderValue) => void;
}

const PROVIDERS: EmbeddingsProviderId[] = ['openai', 'google'];
const OPTIONS: EmbeddingsProviderValue[] = ['auto', ...PROVIDERS];

/**
 * Picks which provider computes the embeddings behind the agreement score.
 *
 * `auto` uses OpenAI, then Google, whichever has a valid key. A provider
 * without a valid key is disabled. When no provider is available the
 * component says that no agreement score will be shown.
 *
 * @example
 * ```tsx
 * <EmbeddingsProviderSelector
 *   value="auto"
 *   available={{ openai: true, google: false }}
 *   activeProvider="openai"
 *   onChange={setEmbeddingsProvider}
 * />
 * ```
 */
export function EmbeddingsProviderSelector({
  value,
  available,
  activeProvider,
  onChange,
}: EmbeddingsProviderSelectorProps) {
  const { t } = useTranslation();
  const prefix = 'molecules.embeddingsProviderSelector';

  return (
    <div className="space-y-3" data-testid="embeddings-provider-selector">
      <Heading level={4} size="sm">
        {t(`${prefix}.heading`)}
      </Heading>
      <p className="text-sm text-muted-foreground">{t(`${prefix}.description`)}</p>

      <div className="flex flex-wrap items-start gap-6" role="radiogroup">
        {OPTIONS.map((option) => {
          const disabled = option !== 'auto' && !available[option];
          return (
            <label
              key={option}
              className={`flex items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                name="embeddingsProvider"
                checked={value === option}
                disabled={disabled}
                onChange={() => onChange(option)}
                className="h-4 w-4 accent-primary"
                data-testid={`embeddings-provider-option-${option}`}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  {t(`${prefix}.options.${option}`)}
                </span>
                {disabled && (
                  <span
                    className="block text-xs text-muted-foreground"
                    data-testid={`embeddings-provider-${option}-missing`}
                  >
                    {t(`${prefix}.noValidKey`)}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {activeProvider ? (
        <p className="text-sm text-muted-foreground" data-testid="embeddings-provider-active">
          {t(`${prefix}.active`, { provider: t(`${prefix}.options.${activeProvider}`) })}
        </p>
      ) : (
        <div data-testid="embeddings-provider-none">
          <InlineAlert variant="warning">
            <p className="font-semibold">{t(`${prefix}.noneTitle`)}</p>
            <p className="mt-1">{t(`${prefix}.noneDescription`)}</p>
          </InlineAlert>
        </div>
      )}
    </div>
  );
}
