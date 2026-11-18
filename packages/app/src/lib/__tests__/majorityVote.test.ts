import { describe, expect, it } from "vitest";
import type { MajorityConsensusOutcome } from "@ensemble-ai/consensus-majority";
import {
  toMajorityVoteBreakdownProps,
  toMajorityVoteRecord,
} from "../majorityVote";

const responses = [
  { modelId: "id-a", modelName: "gpt-6-astra", content: "42" },
  { modelId: "id-b", modelName: "claude-opus-5-5", content: "42" },
  { modelId: "manual-1", modelName: "My answer", content: "41" },
  { modelId: "id-c", modelName: "gemini-3-pro", content: "An essay" },
];

const tally = (answer: string, modelIds: string[]) => ({
  answer,
  normalised: `num:${answer}`,
  votes: modelIds.length,
  modelIds,
});

describe("toMajorityVoteRecord", () => {
  it("keeps the vote without the consensus text and records model names", () => {
    const outcome: MajorityConsensusOutcome = {
      text: "42",
      method: "vote",
      vote: null,
    };
    const record = toMajorityVoteRecord(outcome, responses);
    expect(record).toEqual({
      method: "vote",
      vote: null,
      modelNames: {
        "id-a": "gpt-6-astra",
        "id-b": "claude-opus-5-5",
        "manual-1": "My answer",
        "id-c": "gemini-3-pro",
      },
    });
    expect(record).not.toHaveProperty("text");
  });
});

describe("toMajorityVoteBreakdownProps", () => {
  const modelNames = toMajorityVoteRecord(
    { text: "", method: "vote", vote: null },
    responses,
  ).modelNames;

  it("maps a winning vote to options with model names and abstentions", () => {
    const winner = tally("42", ["id-a", "id-b"]);
    const props = toMajorityVoteBreakdownProps({
      method: "vote",
      modelNames,
      vote: {
        status: "winner",
        winner,
        tied: [],
        tallies: [winner, tally("41", ["manual-1"])],
        totalResponses: 4,
        abstentions: ["id-c"],
      },
    });

    expect(props).toEqual({
      outcome: "winner",
      totalResponses: 4,
      options: [
        { answer: "42", votes: 2, models: ["gpt-6-astra", "claude-opus-5-5"] },
        { answer: "41", votes: 1, models: ["My answer"] },
      ],
      abstainedModels: ["gemini-3-pro"],
    });
  });

  it("maps a tie", () => {
    const a = tally("1", ["id-a", "id-b"]);
    const b = tally("2", ["manual-1", "id-c"]);
    const props = toMajorityVoteBreakdownProps({
      method: "llm",
      fallbackReason: "tie",
      modelNames,
      vote: {
        status: "tie",
        winner: null,
        tied: [a, b],
        tallies: [a, b],
        totalResponses: 4,
        abstentions: [],
      },
    });
    expect(props.outcome).toBe("tie");
    expect(props.options).toHaveLength(2);
  });

  it("maps long-form answers to no-short-answers", () => {
    const props = toMajorityVoteBreakdownProps({
      method: "llm",
      fallbackReason: "long-form",
      modelNames,
      vote: {
        status: "no-short-answers",
        winner: null,
        tied: [],
        tallies: [],
        totalResponses: 4,
        abstentions: ["id-a", "id-b", "manual-1", "id-c"],
      },
    });
    expect(props.outcome).toBe("no-short-answers");
  });

  it("maps a failed extraction and counts every response", () => {
    const props = toMajorityVoteBreakdownProps({
      method: "llm",
      fallbackReason: "extraction-failed",
      modelNames,
      vote: null,
    });
    expect(props).toEqual({
      outcome: "extraction-failed",
      totalResponses: 4,
      options: [],
      abstainedModels: [],
    });
  });

  it("falls back to the model id when a name is missing", () => {
    const winner = tally("7", ["x", "y"]);
    const props = toMajorityVoteBreakdownProps({
      method: "vote",
      modelNames: {},
      vote: {
        status: "winner",
        winner,
        tied: [],
        tallies: [winner],
        totalResponses: 2,
        abstentions: [],
      },
    });
    expect(props.options[0]!.models).toEqual(["x", "y"]);
  });
});
