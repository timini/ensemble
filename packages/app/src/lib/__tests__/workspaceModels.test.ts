import { describe, expect, it } from "vitest";
import { toComposerModels, toPickerOptions } from "../workspaceModels";

const models = [
  { id: "gpt-6-astra", provider: "openai" as const, name: "GPT-6 Astra" },
  {
    id: "claude-haiku-5-5",
    provider: "anthropic" as const,
    name: "Claude Haiku 5.5",
  },
  {
    id: "ollama/llama3.2:3b",
    provider: "openai-compatible" as const,
    name: "llama3.2:3b (Ollama)",
  },
];
const statuses = {
  openai: "valid",
  anthropic: "idle",
  google: "idle",
  xai: "idle",
  deepseek: "idle",
  perplexity: "idle",
} as const;
const endpoints = [{ id: "ollama", label: "Ollama" }];

describe("toPickerOptions", () => {
  it("offers only models whose provider has a working key or a connected endpoint", () => {
    const options = toPickerOptions(models, statuses, endpoints);
    expect(options.map((o) => o.id)).toEqual([
      "gpt-6-astra",
      "ollama/llama3.2:3b",
    ]);
  });

  it("groups key models by provider and endpoint models by endpoint, with the bare id as name", () => {
    const [gpt, llama] = toPickerOptions(models, statuses, endpoints);
    expect(gpt).toMatchObject({
      group: "OpenAI",
      name: "GPT-6 Astra",
      provider: "openai",
    });
    expect(llama).toMatchObject({
      group: "Ollama",
      name: "llama3.2:3b",
      provider: "openai-compatible",
    });
  });

  it("offers no endpoint models when no endpoint is connected", () => {
    expect(toPickerOptions(models, statuses, []).map((o) => o.id)).toEqual([
      "gpt-6-astra",
    ]);
  });
});

describe("toComposerModels", () => {
  it("names each selected model, in selection order", () => {
    const chips = toComposerModels(
      [
        {
          id: "s2",
          provider: "openai-compatible",
          model: "ollama/llama3.2:3b",
        },
        { id: "s1", provider: "openai", model: "gpt-6-astra" },
      ],
      models,
      endpoints,
    );
    expect(chips).toEqual([
      {
        id: "ollama/llama3.2:3b",
        name: "llama3.2:3b (Ollama)",
        provider: "openai-compatible",
      },
      { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "openai" },
    ]);
  });

  it("falls back to a label from the id for a model no longer listed", () => {
    const [chip] = toComposerModels(
      [{ id: "s", provider: "openai", model: "gpt-9-x" }],
      [],
      [],
    );
    expect(chip?.name).toBeTruthy();
    expect(chip?.id).toBe("gpt-9-x");
  });
});
