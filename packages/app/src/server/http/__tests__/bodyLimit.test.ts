// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BodyTooLargeError, readBodyLimited } from "../bodyLimit";

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://x/", { method: "POST", body, headers });

describe("readBodyLimited", () => {
  it("returns a body within the limit", async () => {
    await expect(readBodyLimited(post("hello"), 10)).resolves.toBe("hello");
  });

  it("refuses a body declared too large without reading it", async () => {
    await expect(
      readBodyLimited(post("x", { "content-length": "999999" }), 10),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("refuses a body that turns out too large", async () => {
    await expect(
      readBodyLimited(post("x".repeat(11)), 10),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});
