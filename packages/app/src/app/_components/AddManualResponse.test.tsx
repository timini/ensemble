import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddManualResponse } from "./AddManualResponse";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("AddManualResponse", () => {
  it("adds the answer under its name and provider and closes the dialog", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddManualResponse onAdd={onAdd} />);

    await user.click(screen.getByTestId("add-manual-response"));
    await user.type(screen.getByTestId("model-name-input"), "Textbook");
    await user.type(screen.getByTestId("model-provider-input"), "Library");
    await user.type(screen.getByTestId("response-textarea"), "  Forty-two.  ");
    await user.click(screen.getByTestId("submit-button"));

    expect(onAdd).toHaveBeenCalledWith("Textbook (Library)", "Forty-two.");
    expect(
      screen.queryByTestId("manual-response-modal"),
    ).not.toBeInTheDocument();
  });

  it("does not add anything when cancelled", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddManualResponse onAdd={onAdd} />);

    await user.click(screen.getByTestId("add-manual-response"));
    await user.type(screen.getByTestId("response-textarea"), "Draft");
    await user.click(screen.getByTestId("cancel-button"));

    expect(onAdd).not.toHaveBeenCalled();
  });
});
