import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ModelPickerOption } from "@/components/molecules/ModelPicker";
import { useStore } from "~/store";
import { useStarterEnsemble } from "../useStarterEnsemble";

const OPENAI: ModelPickerOption[] = [
  {
    id: "gpt-6-astra",
    name: "GPT-6 Astra",
    provider: "openai",
    group: "OpenAI",
  },
  { id: "gpt-6-luna", name: "GPT-6 Luna", provider: "openai", group: "OpenAI" },
];

const chosen = () => useStore.getState().selectedModels.map((m) => m.model);

describe("useStarterEnsemble", () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true);
  });

  it("does nothing until asked", () => {
    renderHook(() => useStarterEnsemble(OPENAI));
    expect(chosen()).toEqual([]);
  });

  it("adds a starting ensemble once asked", () => {
    const { result } = renderHook(() => useStarterEnsemble(OPENAI));
    act(() => result.current());
    expect(chosen()).toEqual(["gpt-6-luna", "gpt-6-astra"]);
  });

  it("waits for the models of a key that is still being checked", () => {
    const { result, rerender } = renderHook(
      (options: ModelPickerOption[]) => useStarterEnsemble(options),
      { initialProps: [] as ModelPickerOption[] },
    );
    act(() => result.current());
    expect(chosen()).toEqual([]);
    rerender(OPENAI);
    expect(chosen()).toEqual(["gpt-6-luna", "gpt-6-astra"]);
  });

  it("keeps models already chosen, and does not come back once they are removed", () => {
    useStore.getState().addModel("openai", "gpt-6-astra");
    const { result, rerender } = renderHook(() => useStarterEnsemble(OPENAI));
    act(() => result.current());
    expect(chosen()).toEqual(["gpt-6-astra"]);

    act(() => useStore.setState({ selectedModels: [] }));
    rerender();
    expect(chosen()).toEqual([]);
  });

  it("replaces chosen models the mode cannot run, such as local models when starting Pro", () => {
    useStore.getState().addModel("openai-compatible", "ollama/llama3.2:3b");
    const { result } = renderHook(() => useStarterEnsemble(OPENAI));
    act(() => result.current());
    expect(chosen()).toEqual(["gpt-6-luna", "gpt-6-astra"]);
  });

  it("keeps the chosen models when one of them can run", () => {
    useStore.getState().addModel("openai-compatible", "ollama/llama3.2:3b");
    useStore.getState().addModel("openai", "gpt-6-astra");
    const { result } = renderHook(() => useStarterEnsemble(OPENAI));
    act(() => result.current());
    expect(chosen()).toEqual(["ollama/llama3.2:3b", "gpt-6-astra"]);
  });
});
