import { describe, expect, it } from "vitest";
import {
  findSecretField,
  isSecretField,
  stripSecrets,
  SYNC_ID,
} from "../syncItems";

describe("sync item secrets", () => {
  it("recognises key and token fields but not token counts", () => {
    for (const name of [
      "apiKey",
      "api_key",
      "key",
      "encryptedKey",
      "idToken",
      "Authorization",
      "secret",
    ])
      expect(isSecretField(name)).toBe(true);
    for (const name of ["inputTokens", "tokenCount", "keyword", "models", "id"])
      expect(isSecretField(name)).toBe(false);
  });

  it("strips secret fields at any depth without touching the input", () => {
    const preset = {
      id: "p1",
      models: [
        { id: "m", provider: "openai-compatible", model: "x", apiKey: "sk-1" },
      ],
      endpoint: { baseURL: "http://localhost", key: "k" },
      usage: { inputTokens: 3 },
    };
    const clean = stripSecrets(preset);
    expect(clean).toEqual({
      id: "p1",
      models: [{ id: "m", provider: "openai-compatible", model: "x" }],
      endpoint: { baseURL: "http://localhost" },
      usage: { inputTokens: 3 },
    });
    expect(preset.models[0]!.apiKey).toBe("sk-1");
    expect(findSecretField(clean)).toBeNull();
    expect(findSecretField(preset)).toBe("models[0].apiKey");
  });

  it("accepts history and preset ids but not the server's key separator", () => {
    expect(SYNC_ID.test("run-1700000000000")).toBe(true);
    expect(SYNC_ID.test("ensemble-1700000000000-abc123")).toBe(true);
    expect(SYNC_ID.test("a__b")).toBe(false);
    expect(SYNC_ID.test("../x")).toBe(false);
  });
});
