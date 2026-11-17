import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Sheet } from './Sheet';
import { Button } from '../Button';

const meta = {
  title: 'Atoms/Sheet',
  component: Sheet,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: () => undefined,
    title: 'Settings',
    description: 'Keys, local endpoints, theme and language.',
    children: null,
  },
  render: function Render(args) {
    const [open, setOpen] = React.useState(args.open);
    return (
      <div className="min-h-[480px] p-6">
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <Sheet {...args} open={open} onOpenChange={setOpen}>
          <div className="space-y-3 text-label text-muted-foreground">
            <p>A side panel from 768 px up and a bottom sheet below.</p>
            <p>Escape, the close button and the overlay all close it. Focus stays inside while it is open.</p>
          </div>
        </Sheet>
      </div>
    );
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens from the right: settings, onboarding, manual answers. */
export const Right: Story = {};

/** Opens from the left: history on small screens. */
export const Left: Story = { args: { side: 'left', title: 'History and presets', description: undefined } };

/** With a footer for the primary action. */
export const WithFooter: Story = {
  args: {
    title: 'Add an answer by hand',
    description: 'Paste an answer from another tool. It counts in the agreement score and the consensus.',
    footer: <Button className="w-full">Add answer</Button>,
  },
};

/** Phone width: the sheet rises from the bottom. */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1' } },
};
