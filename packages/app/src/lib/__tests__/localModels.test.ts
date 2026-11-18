import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_MODELS_GUIDE_URL,
  LOCAL_RUN_COMMAND,
  loopbackPermissionState,
  ollamaProbeURL,
  shouldProbeAutomatically,
} from "../localModels";

describe("local models settings", () => {
  const original = process.env.NEXT_PUBLIC_OLLAMA_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_OLLAMA_URL = original;
    vi.unstubAllGlobals();
  });

  it("points at the guide and the local run command", () => {
    expect(LOCAL_MODELS_GUIDE_URL).toMatch(/docs\/LOCAL_MODELS\.md$/);
    expect(LOCAL_RUN_COMMAND).toBe("npm run local");
  });

  it("probes Ollama's default address unless overridden", () => {
    delete process.env.NEXT_PUBLIC_OLLAMA_URL;
    expect(ollamaProbeURL()).toBe("http://localhost:11434");
    process.env.NEXT_PUBLIC_OLLAMA_URL = "http://localhost:11499";
    expect(ollamaProbeURL()).toBe("http://localhost:11499");
  });

  it("probes on its own only from a local page or with permission", () => {
    expect(shouldProbeAutomatically("http://localhost:3000", "prompt")).toBe(
      true,
    );
    expect(
      shouldProbeAutomatically("https://ensemble.example.app", "granted"),
    ).toBe(true);
    expect(
      shouldProbeAutomatically("https://ensemble.example.app", "prompt"),
    ).toBe(false);
    expect(
      shouldProbeAutomatically("https://ensemble.example.app", "unknown"),
    ).toBe(false);
    expect(
      shouldProbeAutomatically("https://ensemble.example.app", "denied"),
    ).toBe(false);
  });
});

describe("loopbackPermissionState", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the loopback-network permission", async () => {
    const query = vi.fn().mockResolvedValue({ state: "granted" });
    vi.stubGlobal("navigator", { permissions: { query } });
    await expect(loopbackPermissionState()).resolves.toBe("granted");
    expect(query).toHaveBeenCalledWith({ name: "loopback-network" });
  });

  it("is unknown when the browser does not know the permission", async () => {
    const query = vi.fn().mockRejectedValue(new TypeError("bad name"));
    vi.stubGlobal("navigator", { permissions: { query } });
    await expect(loopbackPermissionState()).resolves.toBe("unknown");
  });

  it("is unknown without the Permissions API", async () => {
    vi.stubGlobal("navigator", {});
    await expect(loopbackPermissionState()).resolves.toBe("unknown");
  });
});
