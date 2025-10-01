import type { Meta, StoryObj } from '@storybook/react';
import { EnsembleHeader } from './EnsembleHeader';

const meta = {
  title: 'Molecules/EnsembleHeader',
  component: EnsembleHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EnsembleHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPage: Story = {
  render: () => (
    <div>
      <EnsembleHeader />
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Page Content</h2>
        <p className="text-gray-600">
          This is how the header looks when placed above page content.
        </p>
      </div>
    </div>
  ),
};
