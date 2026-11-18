import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Input } from '../../atoms/Input';
import { Label } from '../../atoms/Label';
import { Badge } from '../../atoms/Badge';
import { EndpointLogo } from '../../atoms/EndpointLogo';
import { LocalServerHelp } from '../LocalServerHelp';
import { EndpointEmbeddingField } from '../EndpointEmbeddingField';
import { cn } from '@/lib/utils';

import type { EndpointField, EndpointInputValue, EndpointValidationStatus } from './EndpointInput.types';

export type { EndpointErrorCode, EndpointField, EndpointInputValue, EndpointValidationStatus } from './EndpointInput.types';

export interface EndpointInputProps {
  endpoint: EndpointInputValue;
  /** Called with the edited field and its new value. */
  onChange: (field: EndpointField, value: string) => void;
  /** Called when the user removes the endpoint. */
  onRemove: () => void;
  /** Command that runs Ensemble locally, shown when the browser blocked a call to this computer. */
  localRunCommand?: string;
  /** Link to the local models guide. */
  guideUrl?: string;
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
export function EndpointInput({
  endpoint,
  onChange,
  onRemove,
  localRunCommand = 'npm run local',
  guideUrl,
  className,
}: EndpointInputProps) {
  const { t } = useTranslation();
  const [showKey, setShowKey] = React.useState(false);
  const prefix = 'molecules.endpointInput';
  const testId = `endpoint-${endpoint.id}`;
  const name = displayName(endpoint, t(`${prefix}.customLabel`));
  const errorText = endpoint.errorCode ? t(`${prefix}.errors.${endpoint.errorCode}`) : (endpoint.error ?? '');
  const ids = {
    baseURL: React.useId(),
    apiKey: React.useId(),
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
        <EndpointEmbeddingField
          endpointId={endpoint.id}
          presetId={endpoint.presetId}
          value={endpoint.embeddingModel}
          missing={endpoint.status === 'valid' && endpoint.embeddingModelFound === false}
          onChange={(value) => onChange('embeddingModel', value)}
        />
      </div>

      <p
        className={cn('text-sm', STATUS_CLASS[endpoint.status])}
        data-testid={`${testId}-status`}
        role="status"
      >
        {statusText}
      </p>
      {endpoint.status === 'invalid' && endpoint.errorCode === 'localBlocked' && (
        <LocalServerHelp
          reason="blocked"
          localRunCommand={localRunCommand}
          guideUrl={guideUrl}
          data-testid={`${testId}-local-help`}
        />
      )}
    </div>
  );
}
