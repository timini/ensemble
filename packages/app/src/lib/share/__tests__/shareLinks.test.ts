import { describe, expect, it } from "vitest";
import { formatShareDate, sharePath, shareUrl } from "../shareLinks";
import { toSharedRunView } from "../sharedRunView";
import type { SharedRun } from "../sharedRun";

describe("share links", () => {
  it("builds the public link", () => {
    expect(sharePath("abc")).toBe("/s/abc");
    expect(shareUrl("https://example.app/", "abc")).toBe(
      "https://example.app/s/abc",
    );
  });

  it("formats dates in UTC in the reader's language", () => {
    const ms = Date.UTC(2026, 11, 18, 23, 30);
    expect(formatShareDate(ms, "en")).toBe("18 December 2026");
    expect(formatShareDate(ms, "fr")).toBe("18 décembre 2026");
  });
});

describe("toSharedRunView", () => {
  const run: SharedRun = {
    v: 1,
    prompt: "Q",
    runAt: 1,
    method: "majority",
    consensus: null,
    agreement: { score: 0.4, pairs: [] },
    answers: [
      {
        id: "a",
        modelName: "A",
        provider: "openai",
        status: "complete",
        content: "x",
      },
    ],
  };

  it("shows a run with no consensus as not saved, and its score as ready", () => {
    const view = toSharedRunView(run);
    expect(view.consensus).toMatchObject({
      status: "notSaved",
      method: "majority",
    });
    expect(view.agreement).toMatchObject({ status: "ready", score: 0.4 });
    expect(view.answers[0]).toMatchObject({
      id: "a",
      status: "complete",
      content: "x",
    });
  });

  it("has no agreement card for a run without a score", () => {
    expect(toSharedRunView({ ...run, agreement: null }).agreement).toBeNull();
  });
});
