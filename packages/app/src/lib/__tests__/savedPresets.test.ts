import { describe, expect, it } from "vitest";
import type { SavedEnsemble } from "~/store";
import { savedEnsembleName, toSidebarPresets } from "../savedPresets";

const models = [
  { id: "gpt-6-astra", name: "GPT-6 Astra" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5" },
];

const saved = (overrides: Partial<SavedEnsemble> = {}): SavedEnsemble => ({
  id: "ensemble-1",
  name: "Quick pair",
  description: "",
  models: [
    { id: "openai-gpt-6-astra-1", provider: "openai", model: "gpt-6-astra" },
    {
      id: "anthropic-claude-haiku-5-5-1",
      provider: "anthropic",
      model: "claude-haiku-5-5",
    },
  ],
  summarizer: "claude-haiku-5-5",
  consensusMethod: "standard",
  eloTopN: 3,
  ...overrides,
});

describe("toSidebarPresets", () => {
  it("lists the model names and the summarizer name", () => {
    const [preset] = toSidebarPresets([saved()], models);
    expect(preset).toEqual({
      id: "ensemble-1",
      name: "Quick pair",
      description: "GPT-6 Astra, Claude Haiku 5.5",
      modelIds: ["gpt-6-astra", "claude-haiku-5-5"],
      summarizerId: "claude-haiku-5-5",
      summarizerName: "Claude Haiku 5.5",
    });
  });

  it("falls back to the first model when no summarizer was chosen", () => {
    const [preset] = toSidebarPresets([saved({ summarizer: "" })], models);
    expect(preset?.summarizerId).toBe("gpt-6-astra");
    expect(preset?.summarizerName).toBe("GPT-6 Astra");
  });

  it("formats ids of models missing from the list", () => {
    const [preset] = toSidebarPresets(
      [
        saved({
          models: [{ id: "x", provider: "xai", model: "grok-9" }],
          summarizer: "grok-9",
        }),
      ],
      models,
    );
    expect(preset?.description).not.toBe("");
    expect(preset?.modelIds).toEqual(["grok-9"]);
  });
});

describe("savedEnsembleName", () => {
  it("returns the name of the current saved ensemble", () => {
    expect(savedEnsembleName([saved()], "ensemble-1")).toBe("Quick pair");
  });

  it("returns an empty name when none is current", () => {
    expect(savedEnsembleName([saved()], null)).toBe("");
    expect(savedEnsembleName([saved()], "gone")).toBe("");
  });
});
