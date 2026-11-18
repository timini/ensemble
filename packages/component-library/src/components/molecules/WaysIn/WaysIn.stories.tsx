import type { Meta, StoryObj } from '@storybook/react';
import { WaysIn } from './WaysIn';

const meta = {
  title: 'Molecules/WaysIn',
  component: WaysIn,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { keysHref: '/workspace?start=keys', localHref: '/workspace?start=local' },
} satisfies Meta<typeof WaysIn>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before Pro exists: Pro shows as coming soon. */
export const Default: Story = {};

/** Once sign-in exists, Pro is a link. */
export const WithPro: Story = { args: { proHref: '/workspace?start=pro' } };
