import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "~/lib/i18n";
import {
  ExampleQuestions,
  SetupCard,
  WorkspaceHeading,
} from "./WorkspaceIntro";

describe("WorkspaceIntro", () => {
  it("says what the product does in one heading", () => {
    render(<WorkspaceHeading />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Ask several models at once.",
    );
  });

  it("offers one way in until a key or endpoint works", () => {
    const onOpenSettings = vi.fn();
    render(<SetupCard onOpenSettings={onOpenSettings} ollamaOffer={null} />);
    expect(screen.getByTestId("workspace-setup")).toHaveTextContent(
      "One key is enough",
    );
    fireEvent.click(screen.getByTestId("workspace-setup-open"));
    expect(onOpenSettings).toHaveBeenCalled();
    expect(screen.queryByTestId("ollama-notice")).not.toBeInTheDocument();
  });

  it("fills the prompt with an example question", () => {
    const onPick = vi.fn();
    render(<ExampleQuestions onPick={onPick} />);
    const examples = screen.getAllByTestId("workspace-example");
    expect(examples).toHaveLength(3);
    fireEvent.click(examples[0]!);
    expect(onPick).toHaveBeenCalledWith(examples[0]!.textContent);
  });
});
