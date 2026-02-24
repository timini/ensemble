import * as React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "../../../lib/test-utils/i18n-test-wrapper";
import { ConsensusMetrics } from "./ConsensusMetrics";

describe("ConsensusMetrics", () => {
  const defaultProps = {
    roundsToConsensus: 3,
    finalAgreement: 78,
    unanimousConsensus: false,
    maxRounds: 5,
  };

  it("renders the component and stat labels", () => {
    renderWithI18n(<ConsensusMetrics {...defaultProps} />);

    expect(screen.getByTestId("consensus-metrics")).toBeInTheDocument();
    expect(screen.getByText("Rounds")).toBeInTheDocument();
    expect(screen.getByText("Final Agreement")).toBeInTheDocument();
    expect(screen.getByText("Unanimous")).toBeInTheDocument();
  });

  it("renders rounds text and progress indicator values", () => {
    renderWithI18n(<ConsensusMetrics {...defaultProps} />);

    expect(screen.getByText("3/5 rounds")).toBeInTheDocument();
    const progress = screen.getByTestId("consensus-metrics-rounds-progress");
    expect(progress).toHaveAttribute("aria-valuenow", "3");
    expect(progress).toHaveAttribute("aria-valuemax", "5");
  });

  it("renders agreement percentage and medium level", () => {
    renderWithI18n(<ConsensusMetrics {...defaultProps} finalAgreement={65} />);

    expect(screen.getByText("65%")).toBeInTheDocument();
    const agreement = screen.getByTestId("consensus-metrics-agreement");
    expect(agreement).toHaveAttribute("data-agreement-level", "medium");
  });

  it("renders high and low agreement levels", () => {
    const { rerender } = renderWithI18n(
      <ConsensusMetrics {...defaultProps} finalAgreement={91} />,
    );

    expect(screen.getByTestId("consensus-metrics-agreement")).toHaveAttribute(
      "data-agreement-level",
      "high",
    );

    rerender(<ConsensusMetrics {...defaultProps} finalAgreement={22} />);

    expect(screen.getByTestId("consensus-metrics-agreement")).toHaveAttribute(
      "data-agreement-level",
      "low",
    );
  });

  it("sets progress variant for warning and destructive round counts", () => {
    const { rerender } = renderWithI18n(
      <ConsensusMetrics
        {...defaultProps}
        roundsToConsensus={4}
        maxRounds={5}
      />,
    );

    expect(
      screen.getByTestId("consensus-metrics-rounds-progress"),
    ).toHaveAttribute("data-variant", "warning");

    rerender(
      <ConsensusMetrics
        {...defaultProps}
        roundsToConsensus={5}
        maxRounds={5}
      />,
    );

    expect(
      screen.getByTestId("consensus-metrics-rounds-progress"),
    ).toHaveAttribute("data-variant", "destructive");
  });

  it("renders unanimous true and false states", () => {
    const { rerender } = renderWithI18n(
      <ConsensusMetrics {...defaultProps} unanimousConsensus />,
    );

    expect(screen.getByText("Yes")).toBeInTheDocument();

    rerender(<ConsensusMetrics {...defaultProps} unanimousConsensus={false} />);

    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("forwards ref and merges className", () => {
    const ref = React.createRef<HTMLDivElement>();

    renderWithI18n(
      <ConsensusMetrics {...defaultProps} className="custom-class" ref={ref} />,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("custom-class");
  });

  it("renders French translations", () => {
    renderWithI18n(<ConsensusMetrics {...defaultProps} unanimousConsensus />, {
      language: "fr",
    });

    expect(screen.getByText("Tours")).toBeInTheDocument();
    expect(screen.getByText("Accord final")).toBeInTheDocument();
    expect(screen.getByText("Unanime")).toBeInTheDocument();
    expect(screen.getByText("Oui")).toBeInTheDocument();
    expect(screen.getByText("3/5 tours")).toBeInTheDocument();
  });
});
