import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "~/lib/i18n";
import { Landing } from "./Landing";

describe("Landing", () => {
  it("explains the product in one sentence and shows the recorded run", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Ask several AI models at once. See where they agree.",
    );
    expect(screen.getByTestId("landing-lead")).toHaveTextContent(
      "scores how closely their answers agree",
    );
    expect(screen.getByTestId("example-run-kind")).toHaveTextContent(
      "Real answers",
    );
  });

  it("offers the three ways in, with Pro coming soon", () => {
    render(<Landing />);
    expect(screen.getByTestId("ways-in-keys")).toHaveAttribute(
      "href",
      "/workspace?start=keys",
    );
    expect(screen.getByTestId("ways-in-local")).toHaveAttribute(
      "href",
      "/workspace?start=local",
    );
    expect(screen.getByTestId("ways-in-pro")).toHaveTextContent("Coming soon");
  });

  it("links to the benchmarks and makes no accuracy claim", () => {
    render(<Landing />);
    expect(screen.getByTestId("score-guide-benchmarks")).toHaveAttribute(
      "href",
      "/benchmarks",
    );
    expect(screen.getByTestId("landing")).not.toHaveTextContent(
      /more accurate|better answers|outperform/i,
    );
  });
});
