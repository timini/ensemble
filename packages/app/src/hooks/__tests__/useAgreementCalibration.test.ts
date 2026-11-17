import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "~/store";
import { useAgreementCalibration } from "../useAgreementCalibration";

describe("useAgreementCalibration", () => {
  beforeEach(() => {
    useStore.setState({ endpoints: [] });
  });

  it("marks an uncalibrated embedding model and keeps the default thresholds", () => {
    const { result } = renderHook(() => useAgreementCalibration("openai"));
    expect(result.current).toEqual({
      levelThresholds: { high: 0.8, medium: 0.5 },
      calibration: {
        calibrated: false,
        embeddingModel: "openai/text-embedding-3-small",
      },
    });
  });

  it("has no model key without an embeddings provider", () => {
    const { result } = renderHook(() => useAgreementCalibration(null));
    expect(result.current.calibration).toEqual({ calibrated: false });
  });
});
