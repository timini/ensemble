import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineAlert } from '../../atoms/InlineAlert';
import { Button } from '../../atoms/Button';
import { RotateCcw } from 'lucide-react';

/**
 * Why a model's answer failed. Matches the provider error kinds from
 * shared-utils, plus `interrupted` for a stream cut off by a page reload.
 */
export type ResponseErrorKind =
  | 'invalid_key'
  | 'missing_key'
  | 'rate_limited'
  | 'timeout'
  | 'provider_unavailable'
  | 'interrupted'
  | 'other';

export interface ResponseErrorNoticeProps {
  /** What went wrong. Defaults to `other`. */
  kind?: ResponseErrorKind;
  /** Provider message, shown under the explanation. */
  detail?: string;
  /** Seconds the provider asked us to wait (rate limits only). */
  retryAfterSeconds?: number;
  /** Retries this model only. The button is hidden without it. */
  onRetry?: () => void;
}

/**
 * ResponseErrorNotice molecule: the error state of one model's answer.
 *
 * Explains the failure in plain words for its kind, shows the provider's
 * message, and offers a retry for that model.
 *
 * @example
 * ```tsx
 * <ResponseErrorNotice kind="rate_limited" retryAfterSeconds={30} onRetry={retry} />
 * ```
 */
export function ResponseErrorNotice({
  kind = 'other',
  detail,
  retryAfterSeconds,
  onRetry,
}: ResponseErrorNoticeProps) {
  const { t } = useTranslation();
  const prefix = `molecules.responseErrorNotice.${kind}`;
  const description =
    kind === 'rate_limited' && retryAfterSeconds !== undefined
      ? t('molecules.responseErrorNotice.rate_limited.descriptionWithDelay', {
          count: retryAfterSeconds,
        })
      : t(`${prefix}.description`);

  return (
    <div className="flex flex-col gap-2" data-testid="response-error" data-error-kind={kind}>
      <InlineAlert variant="error">
        <p className="font-semibold" data-testid="response-error-title">
          {t(`${prefix}.title`)}
        </p>
        <p className="mt-1 text-sm" data-testid="response-error-description">
          {description}
        </p>
        {detail && (
          <p className="mt-2 break-words text-xs text-muted-foreground" data-testid="response-error-detail">
            {detail}
          </p>
        )}
      </InlineAlert>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1 self-start"
          data-testid="retry-button"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('molecules.responseErrorNotice.retry')}
        </Button>
      )}
    </div>
  );
}
