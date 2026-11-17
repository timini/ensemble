import { describe, expect, it } from "vitest";
import type { AgreementCalibrationFile } from "@ensemble-ai/shared-utils/similarity";
import committed from "~/data/agreement-calibration.json";
import {
  agreementCalibrationFor,
  embeddingModelKeyFor,
} from "../agreementCalibration";

const fitted: AgreementCalibrationFile = {
  schemaVersion: 1,
  models: {
    "openai/text-embedding-3-small": {
      high: 0.7,
      medium: 0.4,
      fittedAt: "2026-11-20",
      pairs: 500,
      agreePairs: 300,
      disagreePairs: 200,
      auc: 0.8,
      source: "packages/eval/results/r1",
    },
  },
};

describe("embeddingModelKeyFor", () => {
  it("names the model each embedding provider uses", () => {
    expect(embeddingModelKeyFor("openai", [])).toBe(
      "openai/text-embedding-3-small",
    );
    expect(embeddingModelKeyFor("google", [])).toBe(
      "google/gemini-embedding-2",
    );
    expect(
      embeddingModelKeyFor("openai-compatible", [
        { id: "openrouter", embeddingModel: "" },
        { id: "ollama-2", embeddingModel: " nomic-embed-text " },
      ]),
    ).toBe("ollama/nomic-embed-text");
  });

  it("is null with no provider or no endpoint embedding model", () => {
    expect(embeddingModelKeyFor(null, [])).toBeNull();
    expect(
      embeddingModelKeyFor("openai-compatible", [
        { id: "ollama", embeddingModel: "" },
      ]),
    ).toBeNull();
  });
});

describe("agreementCalibrationFor", () => {
  it("uses fitted thresholds on the display scale for a calibrated model", () => {
    expect(
      agreementCalibrationFor("openai/text-embedding-3-small", fitted),
    ).toEqual({
      levelThresholds: { high: 0.85, medium: 0.7 },
      calibration: {
        calibrated: true,
        embeddingModel: "openai/text-embedding-3-small",
      },
    });
  });

  it("falls back to the default mapping, marked uncalibrated", () => {
    expect(
      agreementCalibrationFor("google/gemini-embedding-2", fitted),
    ).toEqual({
      levelThresholds: { high: 0.8, medium: 0.5 },
      calibration: {
        calibrated: false,
        embeddingModel: "google/gemini-embedding-2",
      },
    });
  });

  it("reads the committed calibration file by default", () => {
    const models = (committed as AgreementCalibrationFile).models;
    const key = Object.keys(models)[0] ?? "openai/text-embedding-3-small";
    expect(agreementCalibrationFor(key).calibration.calibrated).toBe(
      key in models,
    );
  });
});
