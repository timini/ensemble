import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../atoms/Input';
import { Label } from '../../atoms/Label';
import { CommandSnippet } from '../../atoms/CommandSnippet';
import type { EndpointLogoPreset } from '../../atoms/EndpointLogo';

/** The model Ollama users are told to pull when none is set. */
const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

export interface EndpointEmbeddingFieldProps {
  /** Endpoint id, used in the test ids (`endpoint-<id>-embedding-model`). */
  endpointId: string;
  /** Preset of the endpoint. Ollama gets the exact `ollama pull` command. */
  presetId: EndpointLogoPreset;
  /** The embedding model as typed. */
  value: string;
  /** The last check did not find the model in the server's list. */
  missing: boolean;
  onChange: (value: string) => void;
}

/**
 * EndpointEmbeddingField molecule: the embedding model of an
 * OpenAI-compatible endpoint, with a note when the server does not have it.
 * For Ollama the note gives the exact `ollama pull` command, also when no
 * model is set.
 *
 * @example
 * ```tsx
 * <EndpointEmbeddingField endpointId="ollama" presetId="ollama" value="nomic-embed-text" missing onChange={set} />
 * ```
 */
export function EndpointEmbeddingField({ endpointId, presetId, value, missing, onChange }: EndpointEmbeddingFieldProps) {
  const { t } = useTranslation();
  const id = React.useId();
  const prefix = 'molecules.endpointInput';
  const testId = `endpoint-${endpointId}`;
  const model = value.trim();
  const isOllama = presetId === 'ollama';
  const showMissing = missing && (isOllama || model !== '');
  const pullModel = model || DEFAULT_OLLAMA_EMBEDDING_MODEL;

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{t(`${prefix}.embeddingModel`)}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} data-testid={`${testId}-embedding-model`} />
      <p className="text-xs text-muted-foreground">{t(`${prefix}.embeddingModelHelp`)}</p>
      {showMissing && (
        <p className="text-xs text-muted-foreground" data-testid={`${testId}-embedding-missing`}>
          {t(`${prefix}.${isOllama ? 'ollamaEmbeddingMissing' : 'embeddingModelMissing'}`, { model: pullModel })}
        </p>
      )}
      {showMissing && isOllama && (
        <CommandSnippet command={`ollama pull ${pullModel}`} data-testid={`${testId}-embedding-pull`} />
      )}
    </div>
  );
}
