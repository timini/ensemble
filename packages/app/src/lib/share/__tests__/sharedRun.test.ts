import { describe, expect, it } from "vitest";
import {
  MAX_SHARED_TEXT,
  sharedRunSchema,
  toSharedRun,
  type SharedRunSource,
} from "../sharedRun";

function source(overrides: Partial<SharedRunSource> = {}): SharedRunSource {
  return {
    prompt: "Is 17 prime?",
    runAt: 1_700_000_000_000,
    agreement: {
      status: "ready",
      score: 0.91,
      pairs: [{ a: "GPT", b: "Claude", score: 0.91 }],
      thresholds: { high: 0.8, medium: 0.5 },
      calibration: { calibrated: false, embeddingModel: "openai/te3s" },
      onOpenSettings: () => undefined,
    },
    consensus: {
      status: "success",
      text: "Yes, 17 is prime.",
      method: "standard",
      summarizerName: "GPT",
    },
    answers: [
      {
        id: "gpt-x",
        modelName: "GPT",
        provider: "openai",
        status: "complete",
        content: "Yes.",
        durationMs: 1200,
        costUsd: 0.001,
        onRetry: () => undefined,
      },
      {
        id: "claude-x",
        modelName: "Claude",
        provider: "anthropic",
        status: "error",
        error: "Rate limited",
        errorKind: "rate_limited",
      },
    ],
    ...overrides,
  };
}

describe("toSharedRun", () => {
  it("keeps only display fields and passes the strict schema", () => {
    const shared = toSharedRun(source());
    expect(shared).not.toBeNull();
    expect(sharedRunSchema.parse(shared)).toEqual(shared);
    expect(shared!.answers[0]).toEqual({
      id: "gpt-x",
      modelName: "GPT",
      provider: "openai",
      status: "complete",
      content: "Yes.",
    });
    // Provider error text is not shared: it can hold key fragments or local URLs.
    expect(shared!.answers[1]).toEqual({
      id: "claude-x",
      modelName: "Claude",
      provider: "anthropic",
      status: "error",
    });
    expect(shared!.agreement).toEqual({
      score: 0.91,
      pairs: [{ a: "GPT", b: "Claude", score: 0.91 }],
      thresholds: { high: 0.8, medium: 0.5 },
      calibration: { calibrated: false, embeddingModel: "openai/te3s" },
    });
    expect(shared!.consensus).toBe("Yes, 17 is prime.");
  });

  it("is null while an answer is still streaming", () => {
    const s = source();
    s.answers[0]!.status = "streaming";
    expect(toSharedRun(s)).toBeNull();
  });

  it("is null when no answer finished", () => {
    const s = source();
    s.answers = [s.answers[1]!];
    expect(toSharedRun(s)).toBeNull();
  });

  it("keeps no score or consensus when the run had none", () => {
    const shared = toSharedRun(
      source({
        agreement: { status: "unavailable", reason: "noEmbeddings" },
        consensus: { status: "failed", method: "majority" },
      }),
    );
    expect(shared!.agreement).toBeNull();
    expect(shared!.consensus).toBeNull();
    expect(shared!.method).toBe("majority");
  });

  it("clips very long text", () => {
    const shared = toSharedRun(
      source({ prompt: "x".repeat(MAX_SHARED_TEXT + 10) }),
    );
    expect(shared!.prompt).toHaveLength(MAX_SHARED_TEXT);
  });
});

describe("sharedRunSchema", () => {
  it("refuses fields it does not know, such as a key", () => {
    const shared = toSharedRun(source())!;
    expect(
      sharedRunSchema.safeParse({ ...shared, apiKey: "sk-secret" }).success,
    ).toBe(false);
    expect(
      sharedRunSchema.safeParse({
        ...shared,
        answers: [{ ...shared.answers[0], apiKey: "sk-secret" }],
      }).success,
    ).toBe(false);
  });
});
