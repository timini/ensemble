import type { Meta, StoryObj } from '@storybook/react';
import { ShareDialog } from './ShareDialog';
import { fn } from '@storybook/test';

const meta = {
  title: 'Organisms/ShareDialog',
  component: ShareDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: fn(),
    onCopyLink: fn(),
    isLoading: false,
    error: null,
    shareUrl: null,
  },
} satisfies Meta<typeof ShareDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    isLoading: true,
    shareUrl: null,
    error: null,
  },
};

export const WithShareUrl: Story = {
  args: {
    shareUrl: 'https://ensemble-ai.example.com/share/abc12345',
    isLoading: false,
    error: null,
  },
};

export const WithError: Story = {
  args: {
    error: 'Share feature is not available. Firestore is not configured.',
    isLoading: false,
    shareUrl: null,
  },
};

export const LongUrl: Story = {
  args: {
    shareUrl:
      'https://ensemble-ai-production.firebaseapp.com/share/abc12345xyz',
    isLoading: false,
    error: null,
  },
};
