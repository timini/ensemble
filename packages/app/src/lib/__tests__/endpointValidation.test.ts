import { afterEach, describe, expect, it, vi } from "vitest";
import { checkEndpoint } from "../endpointValidation";

const endpoint = {
  id: "ollama",
  baseURL: "http://localhost:11434/v1",
  apiKey: "",
  embeddingModel: "",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("checkEndpoint", () => {
  const originalMock = process.env.NEXT_PUBLIC_MOCK_MODE;
  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_MODE = originalMock;
  });

  it("reports a connected endpoint with its model count", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(json({ data: [{ id: "a" }, { id: "b" }] }));
    expect(await checkEndpoint(endpoint, fetchImpl)).toEqual({
      status: "valid",
      modelCount: 2,
    });
  });

  it("reports the error of an endpoint that fails", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        json(
          { error: { message: "Invalid key sk-abcdefghijklmnopqrstuvwx" } },
          401,
        ),
      );
    const result = await checkEndpoint(
      { ...endpoint, apiKey: "sk-x" },
      fetchImpl,
    );
    expect(result.status).toBe("invalid");
    expect(result.error).toMatch(/401/);
    expect(result.error).not.toContain("sk-abcdefghijklmnopqrstuvwx");
  });

  it("needs a base URL", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    const fetchImpl = vi.fn();
    expect(
      await checkEndpoint({ ...endpoint, baseURL: " " }, fetchImpl),
    ).toMatchObject({ status: "invalid" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts any endpoint in mock mode without a request", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "true";
    const fetchImpl = vi.fn();
    expect(await checkEndpoint(endpoint, fetchImpl)).toEqual({
      status: "valid",
      modelCount: 3,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
