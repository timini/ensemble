import { describe, expect, it, vi } from "vitest";

vi.mock("@ensemble-ai/shared-utils/security", () => ({
  encrypt: vi.fn(async (value: string) =>
    (globalThis as { noDeviceKey?: boolean }).noDeviceKey
      ? `old:${value}`
      : `v2:${value}`,
  ),
  isLegacyCiphertext: (value: string) => !value.startsWith("v2:"),
}));

import { reencryptLegacy } from "../reencryptLegacy";

describe("reencryptLegacy", () => {
  it("leaves a device-key ciphertext alone", async () => {
    await expect(reencryptLegacy("v2:abc", "sk")).resolves.toBe("v2:abc");
  });

  it("moves a legacy ciphertext to the device key", async () => {
    await expect(reencryptLegacy("old:abc", "sk")).resolves.toBe("v2:sk");
  });

  it("keeps a legacy ciphertext when there is no device key", async () => {
    (globalThis as { noDeviceKey?: boolean }).noDeviceKey = true;
    await expect(reencryptLegacy("old:abc", "sk")).resolves.toBe("old:abc");
    delete (globalThis as { noDeviceKey?: boolean }).noDeviceKey;
  });
});
