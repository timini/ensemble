import type { Meta, StoryObj } from '@storybook/react';
import { PageIntro } from './PageIntro';
import { buttonVariants } from '../../atoms/Button';

const meta = {
  title: 'Molecules/PageIntro',
  component: PageIntro,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    eyebrow: 'Features',
    title: 'Everything you need to compare AI answers',
    lead: 'Ensemble asks several models the same question, shows every answer side by side and measures how closely they agree.',
  },
} satisfies Meta<typeof PageIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Eyebrow, title and lead. */
export const Default: Story = {};

/** With actions. */
export const WithActions: Story = {
  args: {
    children: (
      <>
        <a className={buttonVariants({ size: 'lg' })} href="/workspace">Open the workspace</a>
        <a className={buttonVariants({ size: 'lg', variant: 'outline' })} href="/benchmarks">See the benchmarks</a>
      </>
    ),
  },
};

/** Title only. */
export const TitleOnly: Story = { args: { eyebrow: undefined, lead: undefined } };
