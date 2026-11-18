import { describe, expect, it } from "vitest";
import type {
  Provider,
  ValidationStatus,
} from "@/components/molecules/ApiKeyInput";
import { getHydratedStatus } from "../providerStatus";

const statuses: Record<Provider, ValidationStatus> = {
  openai: "valid",
  anthropic: "invalid",
  google: "validating",
  xai: "idle",
  deepseek: "idle",
  perplexity: "idle",
};

describe("provider status utilities", () => {
  it("returns default statuses before hydration", () => {
    const result = getHydratedStatus(false, statuses);
    expect(result).toEqual<Record<Provider, ValidationStatus>>({
      openai: "idle",
      anthropic: "idle",
      google: "idle",
      xai: "idle",
      deepseek: "idle",
      perplexity: "idle",
    });
  });

  it("returns actual statuses after hydration", () => {
    const result = getHydratedStatus(true, statuses);
    expect(result).toEqual(statuses);
  });
});
