import { beforeEach, describe, expect, it } from "vitest";
import {
  MOCK_ERRORS_STORAGE_KEY,
  captureMockErrorScenarios,
  createMockErrorResolver,
  parseMockErrorScenarios,
} from "~/lib/mockErrorScenarios";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("parseMockErrorScenarios", () => {
  it("reads model:kind pairs with status code aliases and a once flag", () => {
    expect(
      parseMockErrorScenarios(
        "gpt-6-luna:401, claude-opus-5-5:timeout,gemini-4-carbon:429:once,*:503",
      ),
    ).toEqual([
      { model: "gpt-6-luna", kind: "invalid_key", once: false },
      { model: "claude-opus-5-5", kind: "timeout", once: false },
      { model: "gemini-4-carbon", kind: "rate_limited", once: true },
      { model: "*", kind: "provider_unavailable", once: false },
    ]);
  });

  it("ignores entries it does not understand", () => {
    expect(parseMockErrorScenarios("nonsense,gpt:999,:401")).toEqual([]);
  });
});

describe("captureMockErrorScenarios", () => {
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    storage = memoryStorage();
  });

  it("stores the mockErrors query parameter", () => {
    captureMockErrorScenarios("?mockErrors=gpt-6-luna:401", storage);
    expect(storage.getItem(MOCK_ERRORS_STORAGE_KEY)).toBe("gpt-6-luna:401");
  });

  it("clears the stored scenarios with an empty parameter", () => {
    storage.setItem(MOCK_ERRORS_STORAGE_KEY, "gpt-6-luna:401");
    captureMockErrorScenarios("?mockErrors=", storage);
    expect(storage.getItem(MOCK_ERRORS_STORAGE_KEY)).toBeNull();
  });

  it("keeps the stored scenarios when the parameter is absent", () => {
    storage.setItem(MOCK_ERRORS_STORAGE_KEY, "gpt-6-luna:401");
    captureMockErrorScenarios("?other=1", storage);
    expect(storage.getItem(MOCK_ERRORS_STORAGE_KEY)).toBe("gpt-6-luna:401");
  });
});

describe("createMockErrorResolver", () => {
  it("returns the scenario for a model, then the wildcard", () => {
    const storage = memoryStorage();
    storage.setItem(MOCK_ERRORS_STORAGE_KEY, "gpt-6-luna:429,*:503");
    const resolve = createMockErrorResolver(() => storage);
    expect(resolve("gpt-6-luna")).toBe("rate_limited");
    expect(resolve("other")).toBe("provider_unavailable");
  });

  it("fails a once scenario only on the first call", () => {
    const storage = memoryStorage();
    storage.setItem(
      MOCK_ERRORS_STORAGE_KEY,
      "gpt-6-luna:401:once,gpt-6-astra:timeout",
    );
    const resolve = createMockErrorResolver(() => storage);
    expect(resolve("gpt-6-luna")).toBe("invalid_key");
    expect(resolve("gpt-6-luna")).toBeUndefined();
    expect(resolve("gpt-6-astra")).toBe("timeout");
    expect(storage.getItem(MOCK_ERRORS_STORAGE_KEY)).toBe(
      "gpt-6-astra:timeout",
    );
  });

  it("succeeds without storage", () => {
    const resolve = createMockErrorResolver(() => null);
    expect(resolve("gpt-6-luna")).toBeUndefined();
  });
});
