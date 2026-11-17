import type { Meta, StoryObj } from '@storybook/react';
import { AgreementRing } from './AgreementRing';

const meta = {
  title: 'Atoms/AgreementRing',
  component: AgreementRing,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    level: { control: 'inline-radio', options: ['high', 'medium', 'low'] },
    score: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
  },
} satisfies Meta<typeof AgreementRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = { args: { score: 0.86, level: 'high' } };
export const Medium: Story = { args: { score: 0.64, level: 'medium' } };
export const Low: Story = { args: { score: 0.31, level: 'low' } };
/** While answers are still streaming. */
export const Pending: Story = { args: { pending: true } };
/** Smaller, for tight layouts. */
export const Small: Story = { args: { score: 0.86, level: 'high', size: 56 } };
