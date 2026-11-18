import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HistorySidebar } from './HistorySidebar';
import { NOW, samplePresets, sampleHistory } from './fixtures';

const meta = {
  title: 'Organisms/HistorySidebar',
  component: HistorySidebar,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    items: sampleHistory,
    presets: samplePresets,
    activeId: 'r1',
    now: NOW,
    onSelect: () => undefined,
    onDelete: () => undefined,
    onSelectPreset: () => undefined,
    onDeletePreset: () => undefined,
    onNewQuestion: () => undefined,
  },
  render: function Render(args) {
    const [items, setItems] = React.useState(args.items);
    const [active, setActive] = React.useState(args.activeId);
    return (
      <div className="w-72 rounded-xl border border-border bg-card/40 p-3">
        <HistorySidebar {...args} items={items} activeId={active} onSelect={setActive} onDelete={(id) => setItems((i) => i.filter((x) => x.id !== id))} />
      </div>
    );
  },
} satisfies Meta<typeof HistorySidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Runs grouped by date, with presets. */
export const Default: Story = {};

/** First visit: nothing saved yet. */
export const Empty: Story = { args: { items: [], presets: [] } };

/** Presets only. */
export const PresetsOnly: Story = { args: { items: [] } };

/** A run in progress: the other runs are shut until its answers are in. */
export const Locked: Story = { args: { activeId: 'r1', locked: true } };

/** A run whose start time is not known: listed last with no date or time. */
export const Undated: Story = {
  args: { items: [...sampleHistory.slice(0, 2), { id: 'u1', prompt: 'Run saved before run times were kept' }], activeId: 'u1' },
};

/** Signed in: each run has a share button, and history is synced to the account. */
export const SignedInSynced: Story = { args: { onShare: () => undefined, syncStatus: 'synced' } };

/** Signed out: history stays in this browser. */
export const LocalOnly: Story = { args: { syncStatus: 'local' } };
