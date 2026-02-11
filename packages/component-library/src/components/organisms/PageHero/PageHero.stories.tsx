import type { Meta, StoryObj } from '@storybook/react';
import { PageHero } from './PageHero';

const meta = {
  title: 'Organisms/PageHero',
  component: PageHero,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: 'Page title',
    },
    description: {
      description: 'Page description',
    },
    breadcrumbs: {
      description: 'Optional breadcrumb navigation items',
    },
  },
} satisfies Meta<typeof PageHero>;

export default meta;
type Story = StoryObj<typeof meta>;

// Config page
export const ConfigPage: Story = {
  args: {
    title: 'Configure Your AI Ensemble',
    description:
      'Choose your preferred mode and configure provider access before selecting models.',
  },
};

// Ensemble page
export const EnsemblePage: Story = {
  args: {
    title: 'Select Models to Create Your Ensemble',
    description:
      'Choose the AI models you want to include in your ensemble and select a summarizer.',
  },
};

// Prompt page
export const PromptPage: Story = {
  args: {
    title: 'Create Your Prompt',
    description:
      'Enter the question or brief you want to send to every model in your ensemble.',
  },
};

// Review page
export const ReviewPage: Story = {
  args: {
    title: 'Ensemble Response',
    description:
      "Compare each model's answer, inspect agreement, and read the consensus summary before finalising.",
  },
};

// With breadcrumbs
export const WithBreadcrumbs: Story = {
  args: {
    title: 'Ensemble Response',
    description:
      "Compare each model's answer, inspect agreement, and read the consensus summary before finalising.",
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Config', href: '/config' },
      { label: 'Ensemble', href: '/ensemble' },
      { label: 'Prompt', href: '/prompt' },
      { label: 'Review', href: '#' },
    ],
  },
};

// Long title
export const LongTitle: Story = {
  args: {
    title: 'Configure Your Comprehensive Multi-Model AI Ensemble System with Advanced Settings',
    description: 'This is a very long title to test how the component handles lengthy titles.',
  },
};

// Long description
export const LongDescription: Story = {
  args: {
    title: 'Configure Your AI Ensemble',
    description:
      'This is a comprehensive description that explains in great detail all the options available for configuring your AI ensemble, including selecting providers, configuring API keys, choosing models, and setting up advanced parameters for optimal performance across multiple AI providers.',
  },
};

// Dark mode with breadcrumbs
export const DarkMode: Story = {
  args: {
    title: 'Configure Your AI Ensemble',
    description:
      'Choose your preferred mode and configure provider access before selecting models.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Config', href: '/config' },
      { label: 'Ensemble', href: '#' },
    ],
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

// Minimal
export const Minimal: Story = {
  args: {
    title: 'Getting Started',
    description: 'Begin your journey.',
  },
};
