import { describe, expect, it, vi } from "vitest";
import type { ProviderName } from "@ensemble-ai/shared-utils/providers";

vi.mock("server-only", () => ({}));

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const PROVIDERS: ProviderName[] = [
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "perplexity",
];

const provider = (process.env.TEST_BACKEND_PROVIDER ??
  "openai") as ProviderName;
const model = process.env.TEST_BACKEND_MODEL ?? "gpt-4o-mini";
const firebaseWebApiKey = process.env.TEST_FIREBASE_WEB_API_KEY;
const firebaseAuthEmail = process.env.TEST_FIREBASE_AUTH_EMAIL;
const firebaseAuthPassword = process.env.TEST_FIREBASE_AUTH_PASSWORD;

function hasProviderApiKey(selectedProvider: ProviderName): boolean {
  switch (selectedProvider) {
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "google":
      return Boolean(process.env.GOOGLE_API_KEY);
    case "xai":
      return Boolean(process.env.XAI_API_KEY);
    case "deepseek":
      return Boolean(process.env.DEEPSEEK_API_KEY);
    case "perplexity":
      return Boolean(process.env.PERPLEXITY_API_KEY);
    default:
      return false;
  }
}

async function fetchFirebaseIdToken(): Promise<string> {
  if (!firebaseWebApiKey || !firebaseAuthEmail || !firebaseAuthPassword) {
    throw new Error("Missing Firebase integration test auth configuration.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: firebaseAuthEmail,
        password: firebaseAuthPassword,
        returnSecureToken: true,
      }),
    },
  );

  const payload = (await response.json()) as {
    idToken?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.idToken) {
    throw new Error(
      `Unable to obtain Firebase ID token for integration tests: ${payload.error?.message ?? response.statusText}`,
    );
  }

  return payload.idToken;
}

describe("provider router integration auth gate", () => {
  it("rejects unauthenticated backend provider calls", async () => {
    const ctx = await createTRPCContext({
      headers: new Headers(),
    });
    const caller = createCaller(ctx);

    await expect(
      caller.provider.streamText({
        provider,
        model,
        prompt: "hello",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  });
});

const shouldRunRealIntegration =
  PROVIDERS.includes(provider) &&
  Boolean(model) &&
  Boolean(firebaseWebApiKey) &&
  Boolean(firebaseAuthEmail) &&
  Boolean(firebaseAuthPassword) &&
  hasProviderApiKey(provider);

const maybeDescribe = shouldRunRealIntegration ? describe : describe.skip;

maybeDescribe("provider router real integration (firebase auth + provider API)", () => {
  it(
    "allows authenticated backend provider calls with a real Firebase ID token",
    async () => {
      const idToken = await fetchFirebaseIdToken();
      const ctx = await createTRPCContext({
        headers: new Headers({
          authorization: `Bearer ${idToken}`,
        }),
      });
      const caller = createCaller(ctx);

      const modelsResult = await caller.provider.listTextModels({
        provider,
      });
      expect(modelsResult.provider).toBe(provider);
      expect(Array.isArray(modelsResult.models)).toBe(true);
      expect(modelsResult.models.length).toBeGreaterThan(0);

      const streamResult = await caller.provider.streamText({
        provider,
        model,
        prompt:
          "Reply with exactly one short sentence confirming backend auth test success.",
        temperature: 0,
      });
      expect(streamResult.provider).toBe(provider);
      expect(streamResult.model).toBe(model);
      expect(streamResult.response.length).toBeGreaterThan(0);
      expect(streamResult.responseTimeMs).toBeGreaterThan(0);
    },
    120000,
  );
});
