import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import i18n from "~/lib/i18n";
import { HistoryRunNotice } from "./HistoryRunNotice";

const startedAt = new Date("2026-11-10T09:30:00Z").getTime();

describe("HistoryRunNotice", () => {
  it("says the run is saved and read only, with its date", () => {
    render(<HistoryRunNotice startedAt={startedAt} onNewQuestion={vi.fn()} />);
    const notice = screen.getByTestId("history-run-notice");
    expect(notice).toHaveTextContent("Saved run from");
    expect(notice).toHaveTextContent("read only");
    expect(notice).toHaveTextContent("2026");
  });

  it("starts a new question", () => {
    const onNewQuestion = vi.fn();
    render(
      <HistoryRunNotice startedAt={startedAt} onNewQuestion={onNewQuestion} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ask a new question" }));
    expect(onNewQuestion).toHaveBeenCalled();
  });

  it("is translated", async () => {
    await act(() => i18n.changeLanguage("fr"));
    render(<HistoryRunNotice startedAt={startedAt} onNewQuestion={vi.fn()} />);
    expect(screen.getByTestId("history-run-notice")).toHaveTextContent(
      "lecture seule",
    );
    await act(() => i18n.changeLanguage("en"));
  });
});
