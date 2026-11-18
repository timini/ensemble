import type { EndpointLogoPreset } from '../../atoms/EndpointLogo';

export type EndpointValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

/** The fields of an endpoint the user can edit. */
export type EndpointField = 'baseURL' | 'apiKey' | 'embeddingModel';

/**
 * Check failures with no server answer, translated here. `localBlocked`: a
 * hosted page could not reach a server on the user's computer, which the
 * browser may block.
 */
export type EndpointErrorCode = 'baseUrlRequired' | 'unreachable' | 'localBlocked';

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
