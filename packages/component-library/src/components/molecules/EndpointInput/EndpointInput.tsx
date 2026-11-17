import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Input } from '../../atoms/Input';
import { Label } from '../../atoms/Label';
import { Badge } from '../../atoms/Badge';
import { EndpointLogo, type EndpointLogoPreset } from '../../atoms/EndpointLogo';
import { cn } from '@/lib/utils';

export type EndpointValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

/** The fields of an endpoint the user can edit. */
export type EndpointField = 'baseURL' | 'apiKey' | 'embeddingModel';

/** Check failures that happen before the server answers. They are translated here. */
export type EndpointErrorCode = 'baseUrlRequired' | 'unreachable';

/** One configured OpenAI-compatible endpoint, as shown in the form. */
export interface EndpointInputValue {
  /** Endpoint id, unique among the configured endpoints. */
  id: string;
  /** Preset it was made from; picks the logo. */
  presetId: EndpointLogoPreset;
  /** Display name, such as "Ollama" or "OpenRouter 2". For Custom the translated name is shown instead. */
  label: string;
  baseURL: string;
  apiKey: string;
  embeddingModel: string;
  status: EndpointValidationStatus;
  /** Error from the server in the last check, shown when status is `invalid`. */
  error?: string;
  /** A check failure without a server message. Shown translated, in place of `error`. */
  errorCode?: EndpointErrorCode;
  /**
   * Whether the last check found the embedding model in the server's model
   * list. When false a hint says it will not be used for agreement scores.
   */
  embeddingModelFound?: boolean;
  /** Models the endpoint listed in the last check. */
  modelCount?: number;
  /** Runs on the user's machine. Shows a Local badge. */
  local: boolean;
  /** The hosted service needs a key. Otherwise the key is labelled optional. */
  requiresKey: boolean;
}

export interface EndpointInputProps {
  endpoint: EndpointInputValue;
  /** Called with the edited field and its new value. */
  onChange: (field: EndpointField, value: string) => void;
  /** Called when the user removes the endpoint. */
  onRemove: () => void;
  className?: string;
}

const STATUS_CLASS: Record<EndpointValidationStatus, string> = {
  idle: 'text-muted-foreground',
  validating: 'text-muted-foreground',
  valid: 'text-success',
  invalid: 'text-destructive',
};

/** The shown name: the label, or the translated Custom name with the endpoint's number. */
function displayName(endpoint: EndpointInputValue, customLabel: string): string {
  if (endpoint.presetId !== 'custom') return endpoint.label;
  const n = /-(\d+)$/.exec(endpoint.id)?.[1];
  return n ? `${customLabel} ${n}` : customLabel;
}

/**
 * EndpointInput molecule: the form for one OpenAI-compatible endpoint (base
 * URL, optional API key, optional embedding model) with its connection
 * status and a remove button.
 *
 * @example
 * ```tsx
 * <EndpointInput
 *   endpoint={{ id: 'ollama', presetId: 'ollama', label: 'Ollama', baseURL: 'http://localhost:11434/v1',
 *     apiKey: '', embeddingModel: 'nomic-embed-text', status: 'valid', modelCount: 3, local: true, requiresKey: false }}
 *   onChange={(field, value) => update('ollama', field, value)}
 *   onRemove={() => remove('ollama')}
 * />
 * ```
 */
export function EndpointInput({ endpoint, onChange, onRemove, className }: EndpointInputProps) {
  const { t } = useTranslation();
  const [showKey, setShowKey] = React.useState(false);
  const prefix = 'molecules.endpointInput';
  const testId = `endpoint-${endpoint.id}`;
  const name = displayName(endpoint, t(`${prefix}.customLabel`));
  const errorText = endpoint.errorCode ? t(`${prefix}.errors.${endpoint.errorCode}`) : (endpoint.error ?? '');
  const embeddingMissing =
    endpoint.status === 'valid' && endpoint.embeddingModel.trim() !== '' && endpoint.embeddingModelFound === false;
  const ids = {
    baseURL: React.useId(),
    apiKey: React.useId(),
    embeddingModel: React.useId(),
  };

  const statusText =
    endpoint.status === 'valid'
      ? t(`${prefix}.status.valid`, { count: endpoint.modelCount ?? 0 })
      : endpoint.status === 'invalid'
        ? t(`${prefix}.status.invalid`, { error: errorText })
        : t(`${prefix}.status.${endpoint.status}`);

  return (
    <div
      data-testid={testId}
      data-status={endpoint.status}
      className={cn('space-y-3 rounded-lg border border-border p-4', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EndpointLogo preset={endpoint.presetId} size="sm" />
          <span className="font-medium text-foreground">{name}</span>
          {endpoint.local && (
            <Badge variant="secondary" data-testid={`${testId}-local`}>
              {t(`${prefix}.local`)}
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t(`${prefix}.remove`, { name })}
          data-testid={`${testId}-remove`}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={ids.baseURL}>{t(`${prefix}.baseUrl`)}</Label>
          <Input
            id={ids.baseURL}
            type="url"
            value={endpoint.baseURL}
            placeholder="http://localhost:11434/v1"
            onChange={(e) => onChange('baseURL', e.target.value)}
            data-testid={`${testId}-base-url`}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={ids.apiKey}>
            {t(endpoint.requiresKey ? `${prefix}.apiKey` : `${prefix}.apiKeyOptional`)}
          </Label>
          <div className="relative">
            <Input
              id={ids.apiKey}
              type={showKey ? 'text' : 'password'}
              value={endpoint.apiKey}
              autoComplete="off"
              onChange={(e) => onChange('apiKey', e.target.value)}
              className="pr-9"
              data-testid={`${testId}-api-key`}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={t(showKey ? `${prefix}.hideKey` : `${prefix}.showKey`)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={ids.embeddingModel}>{t(`${prefix}.embeddingModel`)}</Label>
          <Input
            id={ids.embeddingModel}
            value={endpoint.embeddingModel}
            onChange={(e) => onChange('embeddingModel', e.target.value)}
            data-testid={`${testId}-embedding-model`}
          />
          <p className="text-xs text-muted-foreground">{t(`${prefix}.embeddingModelHelp`)}</p>
          {embeddingMissing && (
            <p className="text-xs text-muted-foreground" data-testid={`${testId}-embedding-missing`}>
              {t(`${prefix}.embeddingModelMissing`, { model: endpoint.embeddingModel.trim() })}
            </p>
          )}
        </div>
      </div>

      <p
        className={cn('text-sm', STATUS_CLASS[endpoint.status])}
        data-testid={`${testId}-status`}
        role="status"
      >
        {statusText}
      </p>
    </div>
  );
}
