import { vi } from "vitest";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { PriceTable } from "@ensemble-ai/shared-utils/pricing";
import { DEFAULT_CREDIT_CONFIG } from "~/server/credits/config";
import { grantCredits } from "~/server/credits/grants";
import { DEFAULT_PRO_CONFIG, type ProConfig } from "../config";
import { createUpstream } from "../upstream";
import type { ProDeps } from "../proRunService";

/** Shared set-up of the Pro emulator tests: one app, a test price table and a mocked OpenRouter fetch. */
export const PROJECT = "demo-ensemble";

export const TABLE: PriceTable = {
  source: "test",
  fetchedAt: "2026-11-01",
  models: {
    "openai/gpt-test": {
      inputPerMillion: 1,
      outputPerMillion: 2,
      openRouterId: "openai/gpt-test-or",
    },
    "openai/gpt-other": {
      inputPerMillion: 30,
      outputPerMillion: 60,
      openRouterId: "openai/gpt-other-or",
    },
    "google/free-test": {
      inputPerMillion: 0,
      outputPerMillion: 0,
      openRouterId: "google/free-test",
    },
    "openai/text-embedding-3-small": {
      inputPerMillion: 0.02,
      outputPerMillion: 0,
      openRouterId: "openai/text-embedding-3-small",
    },
  },
};

export const RUN = {
  models: [{ provider: "openai", modelId: "gpt-test" }],
  consensusMethod: "standard" as const,
  summarizer: null,
  eloTopN: 0,
  embeddings: { provider: "openai", modelId: "text-embedding-3-small" },
  promptTokens: 10,
};

export const CALL = {
  runId: "run1",
  callId: "c1",
  provider: "openai",
  model: "gpt-test",
  prompt: "Hi",
};

/** A Firestore app for one test file, with helpers bound to it. */
export function proKit(name: string) {
  const app = initializeApp({ projectId: PROJECT }, name);
  const db = getFirestore(app);
  const fetchImpl = vi.fn();

  const deps = (overrides: Partial<ProConfig> = {}): ProDeps => {
    const config = {
      ...DEFAULT_PRO_CONFIG,
      openRouterApiKey: "sk-or-server",
      ...overrides,
    };
    return {
      db,
      config,
      credit: { ...DEFAULT_CREDIT_CONFIG, priceTable: TABLE },
      upstream: (options) =>
        createUpstream(config, {
          ...options,
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
    };
  };

  const reset = async () => {
    fetchImpl.mockReset();
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    if (!host)
      throw new Error(
        "FIRESTORE_EMULATOR_HOST is not set; run npm run test:emulator",
      );
    await fetch(
      `http://${host}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
      {
        method: "DELETE",
      },
    );
  };

  const fund = (uid: string, micros = 1_000_000) =>
    grantCredits(db, {
      uid,
      grantId: "test",
      amountMicros: micros,
      reason: "test",
    });

  return { app, db, fetchImpl, deps, reset, fund };
}
