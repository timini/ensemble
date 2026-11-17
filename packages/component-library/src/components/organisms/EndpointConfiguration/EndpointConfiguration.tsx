import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Heading } from '../../atoms/Heading';
import { EndpointLogo, type EndpointLogoPreset } from '../../atoms/EndpointLogo';
import {
  EndpointInput,
  type EndpointField,
  type EndpointInputValue,
} from '../../molecules/EndpointInput';

/** A preset the user can add an endpoint from. */
export interface EndpointPresetOption {
  id: EndpointLogoPreset;
  /** Product name, shown as is. */
  label: string;
}

export interface EndpointConfigurationProps {
  /** Configured endpoints, in order. */
  endpoints: EndpointInputValue[];
  /** Presets offered as add buttons. */
  presets: EndpointPresetOption[];
  /** Called with the preset of the endpoint to add. */
  onAdd: (presetId: EndpointLogoPreset) => void;
  /** Called when a field of an endpoint changes. */
  onChange: (endpointId: string, field: EndpointField, value: string) => void;
  /** Called when an endpoint is removed. */
  onRemove: (endpointId: string) => void;
}

/**
 * EndpointConfiguration organism: the list of OpenAI-compatible endpoints
 * (local servers such as Ollama, or hosted routers such as OpenRouter) and
 * one add button per preset. Several endpoints can be configured at once.
 *
 * @example
 * ```tsx
 * <EndpointConfiguration
 *   endpoints={endpoints}
 *   presets={[{ id: 'ollama', label: 'Ollama' }, { id: 'custom', label: 'Custom' }]}
 *   onAdd={addEndpoint}
 *   onChange={updateEndpoint}
 *   onRemove={removeEndpoint}
 * />
 * ```
 */
export function EndpointConfiguration({
  endpoints,
  presets,
  onAdd,
  onChange,
  onRemove,
}: EndpointConfigurationProps) {
  const { t } = useTranslation();
  const prefix = 'organisms.endpointConfiguration';

  return (
    <section className="space-y-4 rounded-lg border border-border p-6" data-testid="endpoint-configuration">
      <div className="space-y-1">
        <Heading level={3} size="lg">
          {t(`${prefix}.heading`)}
        </Heading>
        <p className="text-sm text-muted-foreground">{t(`${prefix}.description`)}</p>
        <p className="text-xs text-muted-foreground">{t(`${prefix}.localHint`)}</p>
      </div>

      {endpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="endpoint-configuration-empty">
          {t(`${prefix}.empty`)}
        </p>
      ) : (
        <div className="space-y-3">
          {endpoints.map((endpoint) => (
            <EndpointInput
              key={endpoint.id}
              endpoint={endpoint}
              onChange={(field, value) => onChange(endpoint.id, field, value)}
              onRemove={() => onRemove(endpoint.id)}
            />
          ))}
        </div>
      )}

      <div role="group" aria-label={t(`${prefix}.add`)} className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onAdd(preset.id)}
            data-testid={`add-endpoint-${preset.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <EndpointLogo preset={preset.id} size="sm" aria-hidden="true" />
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
