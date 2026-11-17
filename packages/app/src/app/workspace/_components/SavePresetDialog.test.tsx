import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "~/lib/i18n";
import { SavePresetDialog } from "./SavePresetDialog";

describe("SavePresetDialog", () => {
  it("saves under the trimmed name and closes", () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <SavePresetDialog open onOpenChange={onOpenChange} onSave={onSave} />,
    );
    expect(screen.getByTestId("preset-save-button")).toBeDisabled();
    fireEvent.change(screen.getByTestId("preset-name-input"), {
      target: { value: "  Quick pair " },
    });
    fireEvent.click(screen.getByTestId("preset-save-button"));
    expect(onSave).toHaveBeenCalledWith("Quick pair");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("saves nothing for a blank name", () => {
    const onSave = vi.fn();
    render(
      <SavePresetDialog open onOpenChange={() => undefined} onSave={onSave} />,
    );
    fireEvent.change(screen.getByTestId("preset-name-input"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByTestId("preset-name-input").closest("form")!);
    expect(onSave).not.toHaveBeenCalled();
  });
});
