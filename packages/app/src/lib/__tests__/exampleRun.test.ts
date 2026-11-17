import { describe, expect, it } from "vitest";
import recorded from "~/data/example-run.json";
import { exampleRunProps, type RecordedRun } from "../exampleRun";

const run = recorded as RecordedRun;

describe("exampleRunProps", () => {
  it("scores agreement the way the workspace does: mean of the pairwise (cosine + 1) / 2", () => {
    const props = exampleRunProps(run, "en");
    const [[, ab, ac], [, , bc]] = run.similarity as [
      number[],
      number[],
      number[],
    ];
    const expected = ((ab! + 1) / 2 + (ac! + 1) / 2 + (bc! + 1) / 2) / 3;
    expect(props.score).toBeCloseTo(expected, 6);
    expect(props.level).toBe("high");
    expect(props.calibrated).toBe(false);
  });

  it("keeps the recorded answers, consensus and models, and labels the run as real", () => {
    const props = exampleRunProps(run, "en");
    expect(props.prompt).toBe(run.prompt);
    expect(props.answers.map((a) => a.name)).toEqual(
      run.answers.map((a) => a.name),
    );
    expect(props.answers[0]!.provider).toBe("openai-compatible");
    expect(props.consensus).toBe(run.consensus.text);
    expect(props.summarizer).toBe("Gemini 2.5 Flash Lite");
    expect(props.illustrative).toBe(false);
    expect(props.calls).toBe(7);
  });

  it("formats the date and cost for the language", () => {
    expect(exampleRunProps(run, "en").recordedOn).toBe("17 November 2026");
    expect(exampleRunProps(run, "fr").recordedOn).toBe("17 novembre 2026");
    expect(exampleRunProps(run, "en").cost).toBe("$0.00028");
  });

  it("leaves the cost out when it is unknown", () => {
    expect(
      exampleRunProps({ ...run, totalCost: null }, "en").cost,
    ).toBeUndefined();
  });
});
