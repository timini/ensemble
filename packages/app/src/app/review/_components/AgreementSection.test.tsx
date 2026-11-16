import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "~/lib/i18n";
import { AgreementSection } from "./AgreementSection";

const comparisons = [
  { model1: "gpt", model2: "gemini", similarity: 0.9, confidence: 0.9 },
];

const baseProps = {
  overallAgreement: 0.9,
  pairwiseComparisons: comparisons,
  responseCount: 2,
  averageConfidence: 0.9,
};

describe("AgreementSection", () => {
  it("shows the analysis when embeddings are ready", () => {
    render(<AgreementSection {...baseProps} status="ready" />);
    expect(screen.getByTestId("agreement-analysis")).toBeInTheDocument();
    expect(
      screen.queryByTestId("agreement-unavailable"),
    ).not.toBeInTheDocument();
  });

  it("explains that no embedding provider is available instead of a score", () => {
    render(<AgreementSection {...baseProps} status="unavailable" />);
    expect(screen.getByTestId("agreement-unavailable")).toHaveTextContent(
      "No agreement score",
    );
    expect(screen.queryByTestId("agreement-analysis")).not.toBeInTheDocument();
  });

  it("says when embeddings failed instead of showing a score", () => {
    render(<AgreementSection {...baseProps} status="error" />);
    expect(
      screen.getByTestId("agreement-embeddings-error"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("agreement-analysis")).not.toBeInTheDocument();
  });

  it("renders nothing with fewer than two answers", () => {
    const { container } = render(
      <AgreementSection
        {...baseProps}
        responseCount={1}
        status="unavailable"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while embeddings are pending", () => {
    const { container } = render(
      <AgreementSection
        {...baseProps}
        pairwiseComparisons={[]}
        status="pending"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
