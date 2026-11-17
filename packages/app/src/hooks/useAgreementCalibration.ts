import { useMemo } from "react";
import { useStore } from "~/store";
import {
  agreementCalibrationFor,
  embeddingModelKeyFor,
  type AgreementCalibrationProps,
} from "~/lib/agreementCalibration";

/**
 * Agreement label thresholds for the embedding model that scored the
 * answers (or would score them), and whether they are calibrated. See
 * lib/agreementCalibration.ts.
 */
export function useAgreementCalibration(
  embeddingsProvider: string | null,
): AgreementCalibrationProps {
  const endpoints = useStore((state) => state.endpoints);
  return useMemo(
    () =>
      agreementCalibrationFor(
        embeddingModelKeyFor(embeddingsProvider, endpoints),
      ),
    [embeddingsProvider, endpoints],
  );
}
