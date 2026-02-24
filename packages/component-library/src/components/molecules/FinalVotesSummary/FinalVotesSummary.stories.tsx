import type { Meta, StoryObj } from "@storybook/react";
import { FinalVotesSummary } from "./FinalVotesSummary";

const meta = {
  title: "Molecules/FinalVotesSummary",
  component: FinalVotesSummary,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FinalVotesSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const responses = [
  { modelId: "gpt4", modelName: "GPT-4", provider: "openai" },
  { modelId: "claude", modelName: "Claude 3 Opus", provider: "anthropic" },
  { modelId: "gemini", modelName: "Gemini Pro", provider: "google" },
];

export const Default: Story = {
  args: {
    votes: [
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
    ],
    responses,
  },
};

export const EmptyVotes: Story = {
  args: {
    votes: [],
    responses,
  },
};
