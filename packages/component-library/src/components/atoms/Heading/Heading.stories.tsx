import type { Meta, StoryObj } from '@storybook/react';
import { Heading } from './Heading';

const meta = {
  title: 'Atoms/Heading',
  component: Heading,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
      description: 'Semantic heading level (h1-h6)',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'],
      description: 'Visual size (independent of semantic level)',
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

// All heading levels with default sizes
export const AllLevels: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading level={1}>Heading 1 (default size: lg)</Heading>
      <Heading level={2}>Heading 2 (default size: lg)</Heading>
      <Heading level={3}>Heading 3 (default size: lg)</Heading>
      <Heading level={4}>Heading 4 (default size: lg)</Heading>
      <Heading level={5}>Heading 5 (default size: lg)</Heading>
      <Heading level={6}>Heading 6 (default size: lg)</Heading>
    </div>
  ),
};

// All size variants with h2
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading level={2} size="xs">Extra Small (xs)</Heading>
      <Heading level={2} size="sm">Small (sm)</Heading>
      <Heading level={2} size="md">Medium (md)</Heading>
      <Heading level={2} size="lg">Large (lg) - Default</Heading>
      <Heading level={2} size="xl">Extra Large (xl)</Heading>
      <Heading level={2} size="2xl">2X Large (2xl)</Heading>
      <Heading level={2} size="3xl">3X Large (3xl)</Heading>
    </div>
  ),
};

// Page title example (h2 with 3xl size)
export const PageTitle: Story = {
  args: {
    level: 2,
    size: '3xl',
    children: 'Page Title',
  },
};

// Section heading example (h3 with lg size)
export const SectionHeading: Story = {
  args: {
    level: 3,
    size: 'lg',
    children: 'Section Heading',
  },
};

// Subsection heading example (h4 with md size)
export const SubsectionHeading: Story = {
  args: {
    level: 4,
    size: 'md',
    children: 'Subsection Heading',
  },
};

// Small heading example (h5 with sm size)
export const SmallHeading: Story = {
  args: {
    level: 5,
    size: 'sm',
    children: 'Small Heading',
  },
};

// Semantic vs Visual demonstration
export const SemanticVsVisual: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600 mb-2">H1 with small visual size:</p>
        <Heading level={1} size="sm">
          Small but semantically H1
        </Heading>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">H6 with large visual size:</p>
        <Heading level={6} size="3xl">
          Large but semantically H6
        </Heading>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">H2 with medium visual size:</p>
        <Heading level={2} size="md">
          Medium H2
        </Heading>
      </div>
    </div>
  ),
};

// With custom styling
export const CustomStyling: Story = {
  args: {
    level: 2,
    size: 'xl',
    className: 'text-blue-600 mb-4',
    children: 'Heading with Custom Classes',
  },
};

// Long text
export const LongText: Story = {
  args: {
    level: 2,
    size: 'lg',
    children:
      'This is a very long heading that demonstrates how the component handles text that might wrap to multiple lines in a constrained layout',
  },
};

// Hierarchy example
export const HierarchyExample: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading level={1} size="3xl">
        Main Page Title
      </Heading>
      <Heading level={2} size="2xl" className="mt-6">
        Section Heading
      </Heading>
      <Heading level={3} size="xl" className="mt-4">
        Subsection Heading
      </Heading>
      <Heading level={4} size="lg" className="mt-3">
        Content Heading
      </Heading>
      <Heading level={5} size="md" className="mt-2">
        Minor Heading
      </Heading>
    </div>
  ),
};

// Playground (default export for interactive testing)
export const Playground: Story = {
  args: {
    level: 2,
    size: 'lg',
    children: 'Editable Heading Text',
  },
};
