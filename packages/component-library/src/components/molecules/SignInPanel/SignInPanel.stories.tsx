import type { Meta, StoryObj } from '@storybook/react';
import { SignInPanel } from './SignInPanel';

const meta = {
  title: 'Molecules/SignInPanel',
  component: SignInPanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onGoogle: () => undefined,
    onEmailLink: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-xl border border-border bg-popover p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignInPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Google and email link, before anything is sent. */
export const Default: Story = {};

/** After the email link was sent. */
export const LinkSent: Story = { args: { emailSentTo: 'ada@example.com' } };

/** While a sign-in request is in flight. */
export const Pending: Story = { args: { pending: true } };

/** A sign-in error, here the Google window closed early. */
export const WithError: Story = { args: { error: 'popupClosed' } };

/** An email link opened on another device asks for the address again. */
export const ConfirmEmail: Story = { args: { confirmEmail: true } };

/** An expired link while confirming. */
export const ConfirmExpired: Story = { args: { confirmEmail: true, error: 'expiredLink' } };
