import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingSheet, type OnboardingPath } from './OnboardingSheet';
import { OllamaDetectedNotice } from '../../molecules/OllamaDetectedNotice';
import type { OnboardingKeyProvider } from '../../molecules/OnboardingKeyField';
import { SignInPanel } from '../../molecules/SignInPanel';
import { CreditNotice } from '../../molecules/CreditNotice';

const noop = () => undefined;
const notice = (
  <OllamaDetectedNotice state="found" chatModels={['llama3.2:3b', 'qwen2.5:7b', 'gemma3:4b']} embeddingModel="nomic-embed-text"
    embeddingPullCommand="ollama pull nomic-embed-text" chatPullCommand="ollama pull llama3.2:3b" hosted={false}
    localRunCommand="npm run local" probeUrl="http://localhost:11434" onAdd={noop} onCheck={noop} onDismiss={noop} />
);

const meta = {
  title: 'Organisms/OnboardingSheet',
  component: OnboardingSheet,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: noop,
    path: 'keys',
    onPathChange: noop,
    keyField: { provider: 'openrouter', onProviderChange: noop, value: '', onChange: noop, status: 'idle' },
    local: { onOpenSettings: noop },
    canStart: false,
    onStart: noop,
    onSkip: noop,
  },
} satisfies Meta<typeof OnboardingSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** First visit: keys path, nothing typed. */
export const Keys: Story = {};

/** A key that works: Start is enabled. */
export const KeyValid: Story = {
  args: { canStart: true, keyField: { provider: 'openrouter', onProviderChange: noop, value: 'sk-or-v1-0000', onChange: noop, status: 'valid' } },
};

/** A key the provider rejected. */
export const KeyInvalid: Story = {
  args: { keyField: { provider: 'openai', onProviderChange: noop, value: 'sk-wrong', onChange: noop, status: 'invalid', error: 'Invalid API key (401 Unauthorized)' } },
};

/** Local path with Ollama found. */
export const LocalFound: Story = { args: { path: 'local', local: { notice, onOpenSettings: noop } } };

/** Local path, Ollama added and connected. */
export const LocalConnected: Story = { args: { path: 'local', canStart: true, local: { connected: { name: 'Ollama', models: 3 }, onOpenSettings: noop } } };

/** Local path with nothing found. */
export const LocalNone: Story = { args: { path: 'local' } };

/** Pro path, signed out: the sign-in panel. */
export const ProSignIn: Story = {
  args: { path: 'pro', pro: { panel: <SignInPanel onGoogle={noop} onEmailLink={noop} /> } },
};

/** Pro path, signed in with credits: Start is enabled. */
export const ProSignedIn: Story = {
  args: {
    path: 'pro',
    canStart: true,
    pro: { panel: <CreditNotice variant="balance" balance="$5.00" packs={[{ id: 'pack-5', label: '$5' }]} onBuy={noop} /> },
  },
};

/** Interactive: switch path and type a key. */
export const Interactive: Story = {
  render: function Render(args) {
    const [path, setPath] = React.useState<OnboardingPath>('keys');
    const [provider, setProvider] = React.useState<OnboardingKeyProvider>('openrouter');
    const [value, setValue] = React.useState('');
    return (
      <OnboardingSheet {...args} path={path} onPathChange={setPath} canStart={value.length > 8}
        keyField={{ provider, onProviderChange: setProvider, value, onChange: setValue, status: value.length > 8 ? 'valid' : 'idle' }}
        local={{ notice, onOpenSettings: noop }} pro={{ panel: <SignInPanel onGoogle={noop} onEmailLink={noop} /> }} />
    );
  },
};
