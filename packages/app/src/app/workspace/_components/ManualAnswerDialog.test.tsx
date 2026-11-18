import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManualAnswerDialog } from "./ManualAnswerDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function Harness({ onAdd }: { onAdd: (label: string, text: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <span data-testid="open-state">{String(open)}</span>
      <ManualAnswerDialog open={open} onOpenChange={setOpen} onAdd={onAdd} />
    </>
  );
}

describe("ManualAnswerDialog", () => {
  it("adds the answer under its name and provider and closes", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);

    await user.type(screen.getByTestId("model-name-input"), "Textbook");
    await user.type(screen.getByTestId("model-provider-input"), "Library");
    await user.type(screen.getByTestId("response-textarea"), "  Forty-two.  ");
    await user.click(screen.getByTestId("submit-button"));

    expect(onAdd).toHaveBeenCalledWith("Textbook (Library)", "Forty-two.");
    expect(screen.getByTestId("open-state")).toHaveTextContent("false");
    expect(
      screen.queryByTestId("manual-response-modal"),
    ).not.toBeInTheDocument();
  });

  it("adds nothing when cancelled", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);

    await user.type(screen.getByTestId("response-textarea"), "Draft");
    await user.click(screen.getByTestId("cancel-button"));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByTestId("open-state")).toHaveTextContent("false");
  });
});
