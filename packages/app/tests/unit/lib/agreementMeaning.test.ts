/**
 * Agreement must reflect meaning.
 *
 * A stub embeddings client returns fixed vectors that stand in for real
 * embeddings: paraphrases of the same answer point the same way, a different
 * answer points elsewhere. The agreement score for a set that contains the
 * different answer must be lower than for a set of paraphrases.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import {
  MockProviderClient,
  ProviderRegistry,
} from "@ensemble-ai/shared-utils/providers";
import { generateEmbeddingsForResponses } from "~/lib/embeddings";
import {
  createResponseSlice,
  type ResponseSlice,
} from "~/store/slices/responseSlice";
import type { ModelResponse } from "~/store";

const PARIS_A = "The capital of France is Paris.";
const PARIS_B = "Paris is the capital city of France.";
const PARIS_C = "France's capital is Paris.";
const LYON = "The capital of France is Lyon, on the Rhone.";

// Fixed 8-dimensional vectors. The three Paris answers are close; Lyon is not.
const VECTORS: Record<string, number[]> = {
  [PARIS_A]: [0.82, 0.41, 0.12, 0.05, 0.31, 0.02, 0.11, 0.07],
  [PARIS_B]: [0.79, 0.44, 0.1, 0.08, 0.29, 0.04, 0.13, 0.05],
  [PARIS_C]: [0.8, 0.39, 0.15, 0.06, 0.33, 0.01, 0.09, 0.08],
  [LYON]: [0.21, 0.12, 0.71, 0.52, 0.05, 0.33, 0.02, 0.18],
};

class FixedVectorClient extends MockProviderClient {
  override async generateEmbeddings(text: string): Promise<number[]> {
    const vector = VECTORS[text];
    if (!vector) throw new Error(`no fixture for ${text}`);
    return vector;
  }
}

const response = (modelId: string, text: string): ModelResponse => ({
  modelId,
  provider: "openai",
  model: modelId,
  response: text,
  isStreaming: false,
  isComplete: true,
  responseTime: 1000,
  tokenCount: null,
  error: null,
});

async function agreementFor(texts: string[]): Promise<number> {
  const embeddings = await generateEmbeddingsForResponses({
    responses: texts.map((text, i) => response(`m${i}`, text)),
    provider: "openai",
    mode: "free",
  });
  const store = createStore<ResponseSlice>()(createResponseSlice);
  store.getState().setEmbeddings(embeddings);
  store.getState().calculateAgreement();
  const stats = store.getState().agreementStats;
  if (!stats) throw new Error("no agreement stats");
  return stats.mean;
}

describe("agreement score reflects meaning", () => {
  beforeEach(() => {
    const registry = ProviderRegistry.getInstance();
    registry.clearAll();
    registry.register("openai", "free", new FixedVectorClient());
  });

  it("is high when every answer says the same thing", async () => {
    expect(await agreementFor([PARIS_A, PARIS_B, PARIS_C])).toBeGreaterThan(
      0.95,
    );
  });

  it("drops when one answer means something different", async () => {
    const same = await agreementFor([PARIS_A, PARIS_B, PARIS_C]);
    const mixed = await agreementFor([PARIS_A, PARIS_B, LYON]);
    expect(mixed).toBeLessThan(same);
    expect(same - mixed).toBeGreaterThan(0.2);
  });

  it("is lowest for a pair that disagrees", async () => {
    const mixed = await agreementFor([PARIS_A, PARIS_B, LYON]);
    const pair = await agreementFor([PARIS_A, LYON]);
    expect(pair).toBeLessThan(mixed);
  });
});
