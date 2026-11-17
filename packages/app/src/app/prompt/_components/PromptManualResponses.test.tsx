import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptManualResponses } from "./PromptManualResponses";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("PromptManualResponses", () => {
  it("shows the add button and no preview when there are no manual answers", () => {
    render(<PromptManualResponses manualResponses={[]} onAdd={vi.fn()} />);

    expect(screen.getByTestId("add-manual-response")).toBeInTheDocument();
    expect(
      screen.queryByTestId("manual-responses-preview"),
    ).not.toBeInTheDocument();
  });

  it("previews each manual answer", () => {
    render(
      <PromptManualResponses
        manualResponses={[
          {
            id: "manual-1",
            label: "Textbook (Library)",
            response: "Forty-two.",
          },
        ]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByTestId("manual-responses-preview")).toHaveTextContent(
      "Textbook (Library)",
    );
    expect(screen.getByTestId("manual-preview-manual-1")).toBeInTheDocument();
  });
});
