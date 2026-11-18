import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ModeSwitch, type WorkspaceMode } from './ModeSwitch';
import { CreditNotice } from '../CreditNotice';
import { SignInPanel } from '../SignInPanel';

const noop = () => undefined;
const signIn = <SignInPanel onGoogle={noop} onEmailLink={noop} />;
const credits = <CreditNotice variant="balance" balance="$4.20" packs={[{ id: 'pack-5', label: '$5' }, { id: 'pack-20', label: '$20' }]} onBuy={noop} />;

const meta = {
  title: 'Molecules/ModeSwitch',
  component: ModeSwitch,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { mode: 'free', onModeChange: noop, proAvailable: true },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof ModeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Free mode chosen. */
export const Free: Story = {};

/** Pro chosen while signed out: the sign-in panel. */
export const ProSignedOut: Story = { args: { mode: 'pro', proPanel: signIn } };

/** Pro chosen while signed in: the credit balance. */
export const ProSignedIn: Story = { args: { mode: 'pro', proPanel: credits } };

/** The server has no sign-in configured. */
export const ProUnavailable: Story = { args: { proAvailable: false } };

/** Interactive: switch with a click or the arrow keys. */
export const Interactive: Story = {
  render: function Render(args) {
    const [mode, setMode] = React.useState<WorkspaceMode>('free');
    return <ModeSwitch {...args} mode={mode} onModeChange={setMode} proPanel={credits} />;
  },
};
