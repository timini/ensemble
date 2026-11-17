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
