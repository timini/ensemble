import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus/types';
import { ConsensusPresetSelector } from './ConsensusPresetSelector';

const meta = {
  title: 'Molecules/ConsensusPresetSelector',
  component: ConsensusPresetSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedModelCount: {
      control: { type: 'range', min: 2, max: 8, step: 1 },
      description: 'Number of currently selected ensemble models',
    },
    consensusMethod: {
      control: 'radio',
      options: ['standard', 'elo', 'majority', 'council'],
      description: 'Active consensus method',
    },
    topN: {
      control: { type: 'range', min: 3, max: 8, step: 1 },
      description: 'Top N for ELO synthesis',
    },
  },
} satisfies Meta<typeof ConsensusPresetSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: {
    selectedModelCount: 4,
    consensusMethod: 'standard',
    topN: 3,
    onConsensusMethodChange: () => {},
    onTopNChange: () => {},
  },
};

export const EloEnabled: Story = {
  args: {
    selectedModelCount: 5,
    consensusMethod: 'elo',
    topN: 3,
    onConsensusMethodChange: () => {},
    onTopNChange: () => {},
  },
};

export const Majority: Story = {
  args: {
    selectedModelCount: 4,
    consensusMethod: 'majority',
    topN: 3,
    onConsensusMethodChange: () => {},
    onTopNChange: () => {},
  },
};

export const Council: Story = {
  args: {
    selectedModelCount: 4,
    consensusMethod: 'council',
    topN: 3,
    onConsensusMethodChange: () => {},
    onTopNChange: () => {},
  },
};

export const EloDisabledWithTwoModels: Story = {
  args: {
    selectedModelCount: 2,
    consensusMethod: 'standard',
    topN: 3,
    onConsensusMethodChange: () => {},
    onTopNChange: () => {},
  },
};

export const Interactive: Story = {
  args: {
    selectedModelCount: 4,
    consensusMethod: 'standard',
    topN: 3,
  },
  render: function Render(args) {
    const [consensusMethod, setConsensusMethod] = React.useState<ConsensusMethod>(
      args.consensusMethod
    );
    const [topN, setTopN] = React.useState(args.topN);

    return (
      <div className="w-[900px] rounded-lg border p-6 bg-background">
        <ConsensusPresetSelector
          selectedModelCount={args.selectedModelCount}
          consensusMethod={consensusMethod}
          topN={topN}
          onConsensusMethodChange={setConsensusMethod}
          onTopNChange={setTopN}
        />
      </div>
    );
  },
};
