import type { Meta, StoryObj } from '@storybook/react';
import { ShareDialog } from './ShareDialog';

const meta = {
  title: 'Molecules/ShareDialog',
  component: ShareDialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: () => undefined,
    status: 'ready',
    url: 'https://ensemble.example.app/s/Qx3v9q2tKm7Pz1aB4cD8eF',
    expiresOn: '18 December 2026',
    onCreate: () => undefined,
    onDelete: () => undefined,
  },
} satisfies Meta<typeof ShareDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Looking up whether the run already has a link. */
export const Loading: Story = { args: { status: 'loading', url: undefined } };

/** No link yet: what the link shows, and Create link. */
export const Create: Story = { args: { status: 'create', url: undefined } };

/** While the link is being created. */
export const Creating: Story = { args: { status: 'creating', url: undefined } };

/** The link, with Copy, its expiry and Delete link. */
export const Ready: Story = {};

/** While the link is being deleted. */
export const Deleting: Story = { args: { status: 'deleting' } };

/** Creating the link failed. */
export const Failed: Story = { args: { status: 'error', error: 'failed', url: undefined } };

/** Too many links created in the last hour. */
export const Limit: Story = { args: { status: 'error', error: 'limit', url: undefined } };

/** The run is too large to share. */
export const TooLarge: Story = { args: { status: 'error', error: 'tooLarge', url: undefined } };
