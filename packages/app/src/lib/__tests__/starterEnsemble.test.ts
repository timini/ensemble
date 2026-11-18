import { describe, expect, it } from "vitest";
import type { ModelPickerOption } from "@/components/molecules/ModelPicker";
import { pickStarterModels } from "../starterEnsemble";

const option = (
  id: string,
  group: string,
  provider: ModelPickerOption["provider"] = "openai",
): ModelPickerOption => ({ id, name: id, provider, group });

describe("pickStarterModels", () => {
  it("picks nothing while no model is offered", () => {
    expect(pickStarterModels([])).toEqual([]);
  });

  it("takes two models when one provider is connected", () => {
    const options = [
      option("gpt-6-astra", "OpenAI"),
      option("gpt-6-luna", "OpenAI"),
    ];
    expect(pickStarterModels(options)).toEqual(["gpt-6-luna", "gpt-6-astra"]);
  });

  it("takes one fast model from each provider, three at most", () => {
    const options = [
      option("grok-4.7", "xAI", "xai"),
      option("grok-4.3", "xAI", "xai"),
      option("gpt-6-astra", "OpenAI"),
      option("gpt-6-luna", "OpenAI"),
      option("claude-opus-5-5", "Anthropic", "anthropic"),
      option("claude-haiku-5-5", "Anthropic", "anthropic"),
      option("gemini-4-carbon", "Google", "google"),
      option("gemini-3.5-flash-lite", "Google", "google"),
    ];
    expect(pickStarterModels(options)).toEqual([
      "gpt-6-luna",
      "claude-haiku-5-5",
      "gemini-3.5-flash-lite",
    ]);
  });

  it("finds the recorded example's models on OpenRouter by their name", () => {
    const options = [
      option("ep1/openai/gpt-9-pro", "OpenRouter", "openai-compatible"),
      option(
        "ep1/mistralai/mistral-small-3.2-24b-instruct",
        "OpenRouter",
        "openai-compatible",
      ),
      option(
        "ep1/meta-llama/llama-3.3-70b-instruct",
        "OpenRouter",
        "openai-compatible",
      ),
      option(
        "ep1/google/gemini-2.5-flash-lite",
        "OpenRouter",
        "openai-compatible",
      ),
    ].map((o) => ({ ...o, name: o.id.replace(/^ep1\//, "") }));
    expect(pickStarterModels(options)).toEqual([
      "ep1/meta-llama/llama-3.3-70b-instruct",
      "ep1/mistralai/mistral-small-3.2-24b-instruct",
      "ep1/google/gemini-2.5-flash-lite",
    ]);
  });

  it("takes the first models of a small list it does not know, such as a local server", () => {
    const options = [
      option("ep2/llama3.2", "Ollama", "openai-compatible"),
      option("ep2/qwen3:8b", "Ollama", "openai-compatible"),
      option("ep2/gemma3", "Ollama", "openai-compatible"),
      option("ep2/phi4", "Ollama", "openai-compatible"),
    ];
    expect(pickStarterModels(options)).toEqual([
      "ep2/llama3.2",
      "ep2/qwen3:8b",
      "ep2/gemma3",
    ]);
  });

  it("leaves out embedding models, which cannot answer", () => {
    const options = [
      option("ep2/nomic-embed-text", "Ollama", "openai-compatible"),
      option("ep2/llama3.2", "Ollama", "openai-compatible"),
      option("ep2/qwen3:8b", "Ollama", "openai-compatible"),
    ];
    expect(pickStarterModels(options)).toEqual([
      "ep2/llama3.2",
      "ep2/qwen3:8b",
    ]);
  });

  it("does not guess in a large catalogue it does not know", () => {
    const options = Array.from({ length: 40 }, (_, i) =>
      option(`ep3/vendor/model-${i}`, "Catalogue", "openai-compatible"),
    );
    expect(pickStarterModels(options)).toEqual([]);
  });
});
