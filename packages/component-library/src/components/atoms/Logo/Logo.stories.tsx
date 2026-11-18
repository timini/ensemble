import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from './Logo';

const meta = {
  title: 'Atoms/Logo',
  component: Logo,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mark and wordmark, as in the header. */
export const Default: Story = {};

/** Mark only, for tight spaces. */
export const MarkOnly: Story = { args: { wordmark: false } };
