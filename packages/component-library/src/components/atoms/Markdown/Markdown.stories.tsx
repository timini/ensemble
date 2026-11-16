import type { Meta, StoryObj } from '@storybook/react';
import { Markdown } from './Markdown';

const meta = {
  title: 'Atoms/Markdown',
  component: Markdown,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Renders model output written in Markdown, including GitHub Flavored Markdown (tables, strikethrough, task lists, autolinks). Raw HTML is not rendered.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text', description: 'Markdown source' },
    className: { control: 'text', description: 'Additional CSS classes' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const fullDocument = `# Consensus answer

All three models agree that **interest rates** are the main lever, with some *disagreement* on timing.

## Key points

- Demand-pull inflation comes from spending outpacing supply
- Cost-push inflation comes from rising input prices
- Expectations can make inflation self-reinforcing

1. Raise rates
2. Watch core inflation
3. Adjust

> Low agreement on the timing question: treat that part with care.

Inline \`code\` and a [link](https://example.com).

| Model | Agreement |
| --- | --- |
| Model A | 0.91 |
| Model B | 0.87 |
`;

export const Default: Story = {
  args: {
    children: fullDocument,
  },
};

export const PlainParagraph: Story = {
  args: {
    children: 'A single paragraph of plain text with no Markdown syntax.',
  },
};

export const CodeBlock: Story = {
  args: {
    children: 'Run this:\n\n```ts\nconst total = items.reduce((sum, x) => sum + x, 0);\n```',
  },
};

export const GfmFeatures: Story = {
  args: {
    children: `~~Deprecated answer~~

- [x] Checked all sources
- [ ] Verified the numbers

Autolink: https://example.com`,
  },
};

export const RawHtmlIsIgnored: Story = {
  args: {
    children: 'This <b>HTML</b> is shown as text and not rendered.',
  },
};

export const DarkTheme: Story = {
  args: {
    children: fullDocument,
  },
  globals: { theme: 'dark' },
};
