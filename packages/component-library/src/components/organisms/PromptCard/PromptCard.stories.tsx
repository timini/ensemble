import type { Meta, StoryObj } from '@storybook/react';
import { PromptCard } from './PromptCard';

const meta = {
  title: 'Organisms/PromptCard',
  component: PromptCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          "Shows the user's prompt on the review page, with an optional copy button. The heading and button labels are translated; pass `heading` to override the heading.",
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    prompt: { control: 'text', description: 'The prompt text to display' },
    heading: { control: 'text', description: 'Overrides the translated heading' },
    showCopy: { control: 'boolean', description: 'Show the copy button' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PromptCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const shortPrompt = 'What are the main causes of inflation?';
const longPrompt = `Compare three approaches to caching in a web application:

1. In-memory caching on the server
2. A shared cache such as Redis
3. HTTP caching with CDN edge nodes

For each, explain when it is the right choice and what can go wrong.`;

export const Default: Story = {
  args: {
    prompt: shortPrompt,
  },
};

export const LongMultilinePrompt: Story = {
  args: {
    prompt: longPrompt,
  },
};

export const CustomHeading: Story = {
  args: {
    prompt: shortPrompt,
    heading: 'Original question',
  },
};

export const WithoutCopyButton: Story = {
  args: {
    prompt: shortPrompt,
    showCopy: false,
  },
};

export const DarkTheme: Story = {
  args: {
    prompt: shortPrompt,
  },
  globals: { theme: 'dark' },
};

export const French: Story = {
  args: {
    prompt: 'Quelles sont les principales causes de l’inflation ?',
  },
  globals: { locale: 'fr' },
};
