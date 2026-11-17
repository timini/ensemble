import type { Meta, StoryObj } from '@storybook/react';
import { LocalServerHelp } from './LocalServerHelp';

const meta = {
  title: 'Molecules/LocalServerHelp',
  component: LocalServerHelp,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    reason: 'blocked',
    localRunCommand: 'npm run local',
    guideUrl: 'https://github.com/timini/ensemble/blob/main/docs/LOCAL_MODELS.md',
  },
} satisfies Meta<typeof LocalServerHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The hosted site could not reach a server on this computer. */
export const Blocked: Story = {};

/** Ollama was not found from the hosted site (it may not run, or may be blocked). */
export const NotFound: Story = { args: { reason: 'notFound' } };

/** Without a guide link. */
export const WithoutGuide: Story = { args: { guideUrl: undefined } };
