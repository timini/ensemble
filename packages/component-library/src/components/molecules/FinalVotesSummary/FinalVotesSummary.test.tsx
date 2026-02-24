import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithI18n } from "../../../lib/test-utils/i18n-test-wrapper";
import { FinalVotesSummary } from "./FinalVotesSummary";

const votes = [
  {
    modelId: "gpt4",
    decision: "Adopt option A",
    reasoning: "Option A balances risk and speed.",
    confidence: 92,
  },
  {
    modelId: "claude",
    decision: "Adopt option B",
    reasoning: "Option B has better long-term maintainability.",
    confidence: 67,
  },
  {
    modelId: "gemini",
    decision: "Defer decision",
    reasoning: "Need more evidence before selecting an option.",
    confidence: 31,
  },
];

const responses = [
  { modelId: "gpt4", modelName: "GPT-4", provider: "openai" },
  { modelId: "claude", modelName: "Claude 3 Opus", provider: "anthropic" },
  { modelId: "gemini", modelName: "Gemini Pro", provider: "google" },
];

describe("FinalVotesSummary", () => {
  it("renders all votes with model metadata", () => {
    renderWithI18n(<FinalVotesSummary votes={votes} responses={responses} />);

    expect(screen.getByTestId("final-votes-summary")).toBeInTheDocument();
    expect(screen.getByText("GPT-4")).toBeInTheDocument();
    expect(screen.getByText("Claude 3 Opus")).toBeInTheDocument();
    expect(screen.getByText("Gemini Pro")).toBeInTheDocument();
    expect(screen.getByText("Adopt option A")).toBeInTheDocument();
    expect(screen.getByText("Adopt option B")).toBeInTheDocument();
    expect(screen.getByText("Defer decision")).toBeInTheDocument();
  });

  it("renders confidence percentages and color variants", () => {
    renderWithI18n(<FinalVotesSummary votes={votes} responses={responses} />);

    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("31%")).toBeInTheDocument();

    expect(screen.getByTestId("final-vote-confidence-gpt4")).toHaveAttribute(
      "data-variant",
      "success",
    );
    expect(screen.getByTestId("final-vote-confidence-claude")).toHaveAttribute(
      "data-variant",
      "warning",
    );
    expect(screen.getByTestId("final-vote-confidence-gemini")).toHaveAttribute(
      "data-variant",
      "destructive",
    );
  });

  it("expands and collapses reasoning", async () => {
    const user = userEvent.setup();

    renderWithI18n(<FinalVotesSummary votes={votes} responses={responses} />);

    expect(
      screen.queryByText("Option A balances risk and speed."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("final-vote-toggle-gpt4"));

    expect(
      screen.getByText("Option A balances risk and speed."),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("final-vote-toggle-gpt4"));

    expect(
      screen.queryByText("Option A balances risk and speed."),
    ).not.toBeInTheDocument();
  });

  it("renders fallback metadata for unknown model response", () => {
    renderWithI18n(
      <FinalVotesSummary
        votes={[
          {
            modelId: "unknown-model",
            decision: "Unknown decision",
            reasoning: "Unknown reasoning",
            confidence: 50,
          },
        ]}
        responses={[]}
      />,
    );

    expect(screen.getByText("unknown-model")).toBeInTheDocument();
    expect(screen.getByText("Unknown provider")).toBeInTheDocument();
  });

  it("renders no-votes state", () => {
    renderWithI18n(<FinalVotesSummary votes={[]} responses={responses} />);

    expect(screen.getByText("No final votes available")).toBeInTheDocument();
  });

  it("renders French translations", async () => {
    const user = userEvent.setup();

    renderWithI18n(<FinalVotesSummary votes={votes} responses={responses} />, {
      language: "fr",
    });

    expect(screen.getAllByText("Confiance").length).toBeGreaterThan(0);

    const toggle = screen.getByTestId("final-vote-toggle-gpt4");
    expect(toggle).toHaveTextContent("Afficher le raisonnement");

    await user.click(toggle);

    expect(toggle).toHaveTextContent("Masquer le raisonnement");
    expect(
      screen.getByText("Option A balances risk and speed."),
    ).toBeInTheDocument();
  });
});
