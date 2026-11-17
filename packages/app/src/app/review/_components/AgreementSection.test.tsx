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

  it("marks the labels uncalibrated for an embedding model with no fit", () => {
    render(
      <AgreementSection
        {...baseProps}
        status="ready"
        embeddingsProvider="openai"
      />,
    );
    expect(screen.getByTestId("agreement-calibration")).toHaveAttribute(
      "data-calibrated",
      "false",
    );
    expect(screen.getByTestId("agreement-calibration")).toHaveTextContent(
      "Uncalibrated",
    );
  });

  it("explains that no embedding provider is available instead of a score", () => {
    render(<AgreementSection {...baseProps} status="unavailable" />);
    expect(screen.getByTestId("agreement-unavailable")).toHaveTextContent(
      "No agreement score",
    );
    expect(screen.queryByTestId("agreement-analysis")).not.toBeInTheDocument();
  });

  it("gives the ollama pull command when Ollama has no embedding model", () => {
    const { rerender } = render(
      <AgreementSection {...baseProps} status="unavailable" />,
    );
    expect(
      screen.queryByTestId("agreement-ollama-pull"),
    ).not.toBeInTheDocument();
    rerender(
      <AgreementSection
        {...baseProps}
        status="unavailable"
        ollamaPullCommand="ollama pull nomic-embed-text"
      />,
    );
    expect(screen.getByTestId("agreement-unavailable")).toHaveTextContent(
      "Your Ollama server has no embedding model",
    );
    expect(
      screen.getByTestId("agreement-ollama-pull-command"),
    ).toHaveTextContent("ollama pull nomic-embed-text");
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

  it("lists answers left out of the score when some embeddings failed", () => {
    render(
      <AgreementSection
        {...baseProps}
        responseCount={3}
        excludedModels={["claude"]}
        status="ready"
      />,
    );
    expect(screen.getByTestId("agreement-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("agreement-partial-note")).toHaveTextContent(
      "claude",
    );
  });

  it("shows no partial note when every answer was embedded", () => {
    render(<AgreementSection {...baseProps} status="ready" />);
    expect(
      screen.queryByTestId("agreement-partial-note"),
    ).not.toBeInTheDocument();
  });

  it("shows the error message when ready but nothing could be compared", () => {
    render(
      <AgreementSection
        {...baseProps}
        pairwiseComparisons={[]}
        status="ready"
      />,
    );
    expect(
      screen.getByTestId("agreement-embeddings-error"),
    ).toBeInTheDocument();
  });
});
