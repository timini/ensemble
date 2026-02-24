import type { Meta, StoryObj } from "@storybook/react";
import { ConsensusMetrics } from "./ConsensusMetrics";

const meta = {
  title: "Molecules/ConsensusMetrics",
  component: ConsensusMetrics,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    roundsToConsensus: {
      control: { type: "number", min: 0, max: 20 },
      description: "Number of rounds needed to reach consensus",
    },
    finalAgreement: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Final agreement percentage (0-100)",
    },
    unanimousConsensus: {
      control: "boolean",
      description: "Whether consensus was unanimous",
    },
    maxRounds: {
      control: { type: "number", min: 1, max: 20 },
      description: "Maximum number of council rounds",
    },
  },
} satisfies Meta<typeof ConsensusMetrics>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    roundsToConsensus: 3,
    finalAgreement: 78,
    unanimousConsensus: false,
    maxRounds: 5,
  },
};

export const HighAgreementUnanimous: Story = {
  args: {
    roundsToConsensus: 2,
    finalAgreement: 94,
    unanimousConsensus: true,
    maxRounds: 5,
  },
};

export const LowAgreementSplit: Story = {
  args: {
    roundsToConsensus: 5,
    finalAgreement: 33,
    unanimousConsensus: false,
    maxRounds: 5,
  },
};
