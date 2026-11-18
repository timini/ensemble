import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import { createApiKeySlice, type ApiKeySlice } from "../slices/apiKeySlice";

vi.mock("@ensemble-ai/shared-utils/security", () => ({
  encrypt: vi.fn().mockImplementation(async (value: string) => `enc:${value}`),
  decrypt: vi
    .fn()
    .mockImplementation(async (value: string) =>
      value.replace(/^(enc|old):/, ""),
    ),
  // "old:" stands for a ciphertext made with the legacy derived key.
  isLegacyCiphertext: (value: string) => value.startsWith("old:"),
  EncryptionKeyUnavailableError: class EncryptionKeyUnavailableError extends Error {},
}));

import {
  encrypt,
  decrypt,
  EncryptionKeyUnavailableError,
} from "@ensemble-ai/shared-utils/security";

const encryptMock = vi.mocked(encrypt);
const decryptMock = vi.mocked(decrypt);

describe("apiKeySlice", () => {
  let store: StoreApi<ApiKeySlice>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore<ApiKeySlice>()(createApiKeySlice);
  });

  it("clears provider state when API key is empty", async () => {
    await store.getState().setApiKey("openai", "");
    expect(store.getState().apiKeys.openai).toBeNull();
  });

  it("persists trimmed API keys via encrypt", async () => {
    await store.getState().setApiKey("openai", "  sk-test  ");

    expect(encryptMock).toHaveBeenCalledWith("sk-test");
    expect(store.getState().apiKeys.openai).toMatchObject({
      key: "sk-test",
      encrypted: "enc:sk-test",
      visible: false,
      status: "idle",
    });
  });

  it("keeps the validation status when the same key is set again", async () => {
    await store.getState().setApiKey("openai", "sk-test");
    store.getState().setApiKeyStatus("openai", "valid");

    await store.getState().setApiKey("openai", " sk-test ");

    expect(store.getState().apiKeys.openai?.status).toBe("valid");
  });

  it("does not overwrite a newer validation status when encryption finishes late", async () => {
    await store.getState().setApiKey("openai", "sk-test");
    let finishEncrypt: ((value: string) => void) | undefined;
    encryptMock.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          finishEncrypt = resolve;
        }),
    );

    const pending = store.getState().setApiKey("openai", "sk-test");
    store.getState().setApiKeyStatus("openai", "valid");
    finishEncrypt?.("enc:sk-test");
    await pending;

    expect(store.getState().apiKeys.openai?.status).toBe("valid");
  });

  it("resets the status when the key changes", async () => {
    await store.getState().setApiKey("openai", "sk-test");
    store.getState().setApiKeyStatus("openai", "valid");

    await store.getState().setApiKey("openai", "sk-other");

    expect(store.getState().apiKeys.openai?.status).toBe("idle");
  });

  it("preserves visibility toggles when updating API keys", async () => {
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: "existing",
          encrypted: "enc:existing",
          visible: true,
          status: "valid",
        },
      },
    });

    await store.getState().setApiKey("openai", "next");
    expect(store.getState().apiKeys.openai?.visible).toBe(true);
  });

  it("propagates encryption errors", async () => {
    encryptMock.mockRejectedValueOnce(new Error("boom"));

    await expect(store.getState().setApiKey("openai", "sk")).rejects.toThrow(
      "boom",
    );
  });

  it("toggles visibility only when an entry exists", async () => {
    await store.getState().setApiKey("openai", "sk-key");
    store.getState().toggleApiKeyVisibility("openai");
    expect(store.getState().apiKeys.openai?.visible).toBe(true);

    store.getState().toggleApiKeyVisibility("anthropic");
    expect(store.getState().apiKeys.anthropic).toBeNull();
  });

  it("clears API keys and resets encryption state", () => {
    store.setState({
      apiKeys: {
        openai: {
          key: "foo",
          encrypted: "enc:foo",
          visible: false,
          status: "idle",
        },
        anthropic: null,
        google: null,
        xai: null,
        deepseek: null,
        perplexity: null,
      },
      encryptionInitialized: true,
    });

    store.getState().clearApiKeys();
    expect(store.getState().apiKeys.openai).toBeNull();
    expect(store.getState().encryptionInitialized).toBe(false);
  });

  it("updates API key status only when entry exists", () => {
    store.getState().setApiKeyStatus("openai", "valid");
    expect(store.getState().apiKeys.openai).toBeNull();

    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: "foo",
          encrypted: "enc:foo",
          visible: false,
          status: "idle",
        },
      },
    });
    store.getState().setApiKeyStatus("openai", "valid");
    expect(store.getState().apiKeys.openai?.status).toBe("valid");
  });

  it("initializes encryption at most once and decrypts entries", async () => {
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: "",
          encrypted: "enc:sk-test",
          visible: false,
          status: "idle",
        },
      },
    });

    await store.getState().initializeEncryption();
    expect(decryptMock).toHaveBeenCalledWith("enc:sk-test");
    expect(store.getState().apiKeys.openai?.key).toBe("sk-test");
    expect(store.getState().encryptionInitialized).toBe(true);

    await store.getState().initializeEncryption();
    expect(decryptMock).toHaveBeenCalledTimes(1);
  });

  it("hides all visible API keys", async () => {
    await store.getState().setApiKey("openai", "sk-key1");
    await store.getState().setApiKey("anthropic", "sk-key2");
    store.getState().toggleApiKeyVisibility("openai");
    store.getState().toggleApiKeyVisibility("anthropic");
    expect(store.getState().apiKeys.openai?.visible).toBe(true);
    expect(store.getState().apiKeys.anthropic?.visible).toBe(true);

    store.getState().hideAllApiKeys();
    expect(store.getState().apiKeys.openai?.visible).toBe(false);
    expect(store.getState().apiKeys.anthropic?.visible).toBe(false);
  });

  it("hideAllApiKeys is a no-op when no keys are visible", () => {
    store.getState().hideAllApiKeys();
    expect(store.getState().apiKeys.openai).toBeNull();
  });

  it("handles decryption failures by clearing encrypted values", async () => {
    decryptMock.mockRejectedValueOnce(new Error("bad decrypt"));
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: "",
          encrypted: "enc:sk-test",
          visible: false,
          status: "valid",
        },
      },
    });

    await store.getState().initializeEncryption();
    expect(store.getState().apiKeys.openai?.key).toBe("");
    expect(store.getState().apiKeys.openai?.encrypted).toBeNull();
  });

  it("encrypts a key stored under the legacy derived key again with the device key", async () => {
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: "",
          encrypted: "old:sk-legacy",
          visible: false,
          status: "idle",
        },
        anthropic: {
          key: "",
          encrypted: "enc:sk-new",
          visible: false,
          status: "idle",
        },
      },
    });
    await store.getState().initializeEncryption();
    expect(store.getState().apiKeys.openai).toMatchObject({
      key: "sk-legacy",
      encrypted: "enc:sk-legacy",
    });
    expect(store.getState().apiKeys.anthropic).toMatchObject({
      key: "sk-new",
      encrypted: "enc:sk-new",
    });
    expect(encryptMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the stored key when only the key store is unavailable", async () => {
    decryptMock.mockRejectedValueOnce(new EncryptionKeyUnavailableError());
    store.setState({
      apiKeys: {
        ...store.getState().apiKeys,
        openai: {
          key: "",
          encrypted: "v2:kept",
          visible: false,
          status: "idle",
        },
      },
    });
    await store.getState().initializeEncryption();
    expect(store.getState().apiKeys.openai).toMatchObject({
      key: "",
      encrypted: "v2:kept",
    });
  });
});
