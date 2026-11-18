import type { Meta, StoryObj } from '@storybook/react';
import { AccountMenu } from './AccountMenu';

const signIn = { onGoogle: () => undefined, onEmailLink: () => undefined };

const meta = {
  title: 'Molecules/AccountMenu',
  component: AccountMenu,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { status: 'signedOut', signIn, onSignOut: () => undefined },
  decorators: [
    (Story) => (
      <div className="flex min-h-[420px] justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed out: the trigger says Sign in. */
export const SignedOut: Story = {};

/** Signed out with the sign-in panel open. */
export const SignedOutOpen: Story = { args: { defaultOpen: true } };

/** Waiting for Firebase to report the session. */
export const Loading: Story = { args: { status: 'loading' } };

/** Signed in with no photo, so initials show. */
export const SignedIn: Story = {
  args: { status: 'signedIn', user: { name: 'Ada Lovelace', email: 'ada@example.com' }, defaultOpen: true },
};

/** Signed in with an email address only. */
export const SignedInEmailOnly: Story = {
  args: { status: 'signedIn', user: { email: 'ada@example.com' } },
};

/** No Firebase config on this server: the panel explains and points to Free mode. */
export const Unavailable: Story = { args: { status: 'unavailable', defaultOpen: true } };
