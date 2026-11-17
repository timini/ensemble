import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
}));

import { useWorkspacePanel } from "../useWorkspacePanel";

describe("useWorkspacePanel", () => {
  beforeEach(() => {
    replace.mockReset();
    query = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens the settings sheet for ?panel=settings once the store has loaded", () => {
    query = "panel=settings";
    const { result, rerender } = renderHook(
      ({ hydrated }) => useWorkspacePanel(hydrated),
      { initialProps: { hydrated: false } },
    );
    expect(result.current.settingsOpen).toBe(false);
    rerender({ hydrated: true });
    expect(result.current.settingsOpen).toBe(true);
  });

  it("drops panel from the URL when the sheet closes, keeping other parameters", () => {
    query = "panel=settings&mockErrors=openai";
    const { result } = renderHook(() => useWorkspacePanel(true));
    act(() => result.current.onSettingsChange(false));
    expect(result.current.settingsOpen).toBe(false);
    expect(replace).toHaveBeenCalledWith("/workspace?mockErrors=openai");
  });

  it("leaves the URL alone when the sheet was opened without a panel", () => {
    const { result } = renderHook(() => useWorkspacePanel(true));
    expect(result.current.settingsOpen).toBe(false);
    act(() => result.current.setSettingsOpen(true));
    act(() => result.current.onSettingsChange(false));
    expect(replace).not.toHaveBeenCalled();
  });

  it("focuses the prompt for ?panel=prompt", () => {
    query = "panel=prompt";
    const prompt = document.createElement("textarea");
    prompt.dataset.testid = "composer-prompt";
    document.body.append(prompt);
    renderHook(() => useWorkspacePanel(true));
    expect(document.activeElement).toBe(prompt);
  });

  it("opens the model picker for ?panel=models", () => {
    query = "panel=models";
    const trigger = document.createElement("button");
    trigger.dataset.testid = "model-picker-trigger";
    const click = vi.fn();
    trigger.addEventListener("click", click);
    document.body.append(trigger);
    renderHook(() => useWorkspacePanel(true));
    expect(click).toHaveBeenCalledTimes(1);
  });
});
