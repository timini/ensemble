import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'JD',
  },
};

export const WithImage: Story = {
  args: {
    src: 'https://github.com/shadcn.png',
    alt: 'User avatar',
  },
};

export const Fallback: Story = {
  args: {
    children: 'AB',
  },
};

export const Small: Story = {
  args: {
    children: 'SM',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'LG',
    size: 'lg',
  },
};

export const WithIcon: Story = {
  args: {
    children: '🤖',
  },
};

export const Anthropic: Story = {
  args: {
    children: 'A',
    variant: 'anthropic',
  },
};

export const OpenAI: Story = {
  args: {
    children: 'O',
    variant: 'openai',
  },
};

export const Google: Story = {
  args: {
    children: 'G',
    variant: 'google',
  },
};

export const Custom: Story = {
  args: {
    children: '⚡',
    variant: 'warning',
  },
};
