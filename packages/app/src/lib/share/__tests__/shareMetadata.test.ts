import { describe, expect, it } from "vitest";
import { sharedLevel, sharedRunSummary, truncate } from "../shareMetadata";
import type { SharedRun } from "../sharedRun";

const run: SharedRun = {
  v: 1,
  prompt: "Is 17 prime?",
  runAt: 1,
  method: "standard",
  consensus: "Yes.",
  agreement: { score: 0.91, pairs: [] },
  answers: [
    { id: "a", modelName: "A", status: "complete" },
    { id: "b", modelName: "B", status: "complete" },
  ],
};

describe("share metadata", () => {
  it("cuts long prompts on a word", () => {
    expect(truncate("one two three four", 12)).toBe("one two…");
    expect(truncate("short", 12)).toBe("short");
  });

  it("describes the agreement in the summary", () => {
    expect(sharedRunSummary(run)).toEqual({
      title: "Is 17 prime?",
      description:
        "2 AI answers compared. High agreement (91%). Read every answer and the consensus.",
    });
    expect(sharedLevel({ ...run, agreement: { score: 0.6, pairs: [] } })).toBe(
      "medium",
    );
    expect(sharedRunSummary({ ...run, agreement: null }).description).toBe(
      "2 AI answers compared. Read every answer and the consensus.",
    );
  });
});
