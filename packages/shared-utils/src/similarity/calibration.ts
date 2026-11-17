/**
 * Agreement labels per embedding model.
 *
 * Embedding cosines sit in a narrow band that differs per model, so the
 * cut-offs between high, medium and low agreement are fitted per embedding
 * model from benchmark runs (`ensemble-eval calibrate-agreement`). Models
 * with no fitted entry use DEFAULT_AGREEMENT_THRESHOLDS, which reproduce the
 * original (v+1)/2 mapping, and are shown as uncalibrated.
 */
import { ENDPOINT_PRESETS } from '../providers/clients/openaiCompatible/endpointPresets';

/** Raw cosine cut-offs. A cosine above `high` is high; at or above `medium` is medium; below is low. */
export interface AgreementThresholds {
  high: number;
  medium: number;
}

/** One fitted entry, keyed by embedding model in AgreementCalibrationFile. */
export interface AgreementCalibrationEntry extends AgreementThresholds {
  /** Date of the fit (YYYY-MM-DD). */
  fittedAt: string;
  /** Answer pairs used for the fit. */
  pairs: number;
  /** Pairs whose mechanically read final answers matched. */
  agreePairs: number;
  /** Pairs whose final answers differed. */
  disagreePairs: number;
  /** Area under the ROC curve of cosine as a predictor of agreement. */
  auc: number;
  /** Results directory the pairs came from. */
  source: string;
}

/** The committed calibration file. */
export interface AgreementCalibrationFile {
  schemaVersion: 1;
  /** Entries keyed `provider/model` (`openai/text-embedding-3-small`, `ollama/nomic-embed-text`). */
  models: Record<string, AgreementCalibrationEntry>;
}

export interface ResolvedAgreementCalibration {
  /** False when the default mapping is used. The UI must say so. */
  calibrated: boolean;
  thresholds: AgreementThresholds;
  modelKey: string | null;
  entry?: AgreementCalibrationEntry;
}

export type AgreementLevel = 'high' | 'medium' | 'low';

/** The original mapping: (v+1)/2 above 0.8 is high, from 0.5 medium. */
export const DEFAULT_AGREEMENT_THRESHOLDS: AgreementThresholds = { high: 0.6, medium: 0 };

/**
 * Key of an embedding model in the calibration file. OpenAI-compatible
 * endpoint ids (`ollama-2`) are reduced to their preset id (`ollama`).
 */
export function embeddingModelKey(provider: string, model: string): string {
  const base = provider.replace(/-\d+$/, '');
  const isEndpoint = ENDPOINT_PRESETS.some((preset) => preset.id === base);
  return `${isEndpoint ? base : provider}/${model}`;
}

function validThresholds(entry: AgreementThresholds | undefined): entry is AgreementThresholds {
  if (!entry) return false;
  const { high, medium } = entry;
  return (
    Number.isFinite(high) && Number.isFinite(medium) && high >= medium && high <= 1 && medium >= -1
  );
}

/** Thresholds for an embedding model, or the default mapping marked uncalibrated. */
export function resolveAgreementCalibration(
  file: AgreementCalibrationFile | null | undefined,
  modelKey: string | null,
): ResolvedAgreementCalibration {
  const entry = modelKey ? file?.models?.[modelKey] : undefined;
  if (entry && validThresholds(entry)) {
    return { calibrated: true, thresholds: { high: entry.high, medium: entry.medium }, modelKey, entry };
  }
  return { calibrated: false, thresholds: DEFAULT_AGREEMENT_THRESHOLDS, modelKey };
}

/** Label a raw cosine. */
export function agreementLevel(cosine: number, thresholds: AgreementThresholds): AgreementLevel {
  if (cosine > thresholds.high) return 'high';
  if (cosine >= thresholds.medium) return 'medium';
  return 'low';
}

/** Thresholds on the 0 to 1 display scale ((v+1)/2) the agreement UI shows. */
export function displayThresholds(thresholds: AgreementThresholds): AgreementThresholds {
  const scale = (v: number) => Math.round(((v + 1) / 2) * 1e6) / 1e6;
  return { high: scale(thresholds.high), medium: scale(thresholds.medium) };
}
