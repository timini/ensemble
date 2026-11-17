import type { Meta, StoryObj } from '@storybook/react';
import { CommandSnippet } from './CommandSnippet';

const meta = {
  title: 'Atoms/CommandSnippet',
  component: CommandSnippet,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { command: 'ollama pull nomic-embed-text' },
} satisfies Meta<typeof CommandSnippet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single shell command with a copy button. */
export const Default: Story = {};

/** A longer command, which wraps instead of scrolling the page. */
export const Long: Story = {
  args: {
    command:
      'git clone https://github.com/timini/ensemble && cd ensemble && npm install && npm run local',
  },
};
