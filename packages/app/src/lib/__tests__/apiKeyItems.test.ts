import { describe, expect, it } from "vitest";
import i18n from "~/lib/i18n";
import { API_KEY_PROVIDERS, apiKeyItem } from "~/lib/apiKeyItems";

const en = i18n.getFixedT("en", "common");
const fr = i18n.getFixedT("fr", "common");

describe("apiKeyItem", () => {
  it("labels each key provider in English", () => {
    const item = apiKeyItem("google", undefined, "idle", en);
    expect(item).toMatchObject({
      provider: "google",
      label: "Google (Gemini) API Key",
      value: "",
      placeholder: "AIza...",
      helperText: "Enter your Google (Gemini) API key",
      validationStatus: "idle",
      showKey: false,
    });
  });

  it("describes every status", () => {
    const helper = (status: "valid" | "validating" | "invalid") =>
      apiKeyItem("openai", undefined, status, en).helperText;
    expect(helper("valid")).toBe("API key configured");
    expect(helper("validating")).toBe("Validating...");
    expect(helper("invalid")).toBe("Invalid API key");
  });

  it("carries the stored key, error and visibility", () => {
    const item = apiKeyItem(
      "xai",
      { key: "xai-123", visible: true, error: "Rate limited" },
      "invalid",
      en,
    );
    expect(item).toMatchObject({
      value: "xai-123",
      showKey: true,
      error: "Rate limited",
    });
  });

  it("is translated into French", () => {
    const item = apiKeyItem("anthropic", undefined, "idle", fr);
    expect(item.label).toBe("Clé API Anthropic");
    expect(item.helperText).toBe("Saisissez votre clé API Anthropic");
    expect(apiKeyItem("anthropic", undefined, "valid", fr).helperText).toBe(
      "Clé API configurée",
    );
  });

  it("covers the six key providers in display order", () => {
    expect(API_KEY_PROVIDERS).toEqual([
      "openai",
      "anthropic",
      "google",
      "xai",
      "deepseek",
      "perplexity",
    ]);
  });
});
