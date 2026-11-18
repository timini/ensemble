/**
 * Agreement label thresholds for the embedding model in use, from the
 * committed calibration (src/data/agreement-calibration.json, written by
 * `ensemble-eval calibrate-agreement`). Models with no fitted entry keep the
 * original mapping and are shown as uncalibrated.
 */
import {
  GOOGLE_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_MODEL,
} from "@ensemble-ai/shared-utils/providers";
import {
  displayThresholds,
  embeddingModelKey,
  resolveAgreementCalibration,
  type AgreementCalibrationFile,
} from "@ensemble-ai/shared-utils/similarity";
import type {
  AgreementCalibrationInfo,
  AgreementLevelThresholds,
} from "@/components/organisms/AgreementAnalysis";
import calibrationJson from "~/data/agreement-calibration.json";

const COMMITTED = calibrationJson as AgreementCalibrationFile;

/** The parts of an endpoint that decide its embedding model. */
interface EmbeddingEndpoint {
  id: string;
  embeddingModel?: string;
}

/**
 * Calibration key of the embedding model a provider uses. OpenAI-compatible
 * endpoints embed with the first endpoint that has an embedding model, as
 * the client does.
 */
export function embeddingModelKeyFor(
  provider: string | null,
  endpoints: readonly EmbeddingEndpoint[],
): string | null {
  if (provider === "openai")
    return embeddingModelKey("openai", OPENAI_EMBEDDING_MODEL);
  if (provider === "google")
    return embeddingModelKey("google", GOOGLE_EMBEDDING_MODEL);
  if (provider === "openai-compatible") {
    const endpoint = endpoints.find((e) => e.embeddingModel?.trim());
    return endpoint
      ? embeddingModelKey(endpoint.id, endpoint.embeddingModel!.trim())
      : null;
  }
  return null;
}

export interface AgreementCalibrationProps {
  levelThresholds: AgreementLevelThresholds;
  calibration: AgreementCalibrationInfo;
}

/** Props for AgreementAnalysis: display-scale thresholds and whether they are calibrated. */
export function agreementCalibrationFor(
  modelKey: string | null,
  file: AgreementCalibrationFile = COMMITTED,
): AgreementCalibrationProps {
  const resolved = resolveAgreementCalibration(file, modelKey);
  return {
    levelThresholds: displayThresholds(resolved.thresholds),
    calibration: {
      calibrated: resolved.calibrated,
      ...(modelKey ? { embeddingModel: modelKey } : {}),
    },
  };
}
