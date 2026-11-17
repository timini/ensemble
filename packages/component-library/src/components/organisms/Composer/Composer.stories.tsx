import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';
import { Composer, type ComposerModel } from './Composer';
import { modelOptions, samplePrompt, threeModels } from './fixtures';
import { sampleEstimates } from '../../molecules/MethodMenu/fixtures';

const summarizers = threeModels.map(({ id, name }) => ({ id, name }));

const meta = {
  title: 'Organisms/Composer',
  component: Composer,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    prompt: samplePrompt,
    onPromptChange: () => undefined,
    onSubmit: () => undefined,
    models: threeModels,
    onRemoveModel: () => undefined,
    modelOptions,
    onToggleModel: () => undefined,
    method: 'standard',
    onMethodChange: () => undefined,
    estimates: sampleEstimates,
    summarizers,
    summarizerId: summarizers[1].id,
    onSummarizerChange: () => undefined,
    onAddManualResponse: () => undefined,
    onSavePreset: () => undefined,
  },
  render: function Render(args) {
    const [prompt, setPrompt] = React.useState(args.prompt);
    const [models, setModels] = React.useState<ComposerModel[]>(args.models);
    const [method, setMethod] = React.useState<ConsensusMethod>(args.method);
    const toggle = (id: string) =>
      setModels((current) => {
        if (current.some((m) => m.id === id)) return current.filter((m) => m.id !== id);
        const option = modelOptions.find((o) => o.id === id);
        return option ? [...current, { id, name: option.name, provider: option.provider }] : current;
      });
    return (
      <div className="mx-auto min-h-[520px] max-w-3xl">
        <Composer
          {...args}
          prompt={prompt}
          onPromptChange={setPrompt}
          models={models}
          onRemoveModel={(id) => setModels((m) => m.filter((x) => x.id !== id))}
          onToggleModel={toggle}
          method={method}
          onMethodChange={setMethod}
        />
      </div>
    );
  },
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ready to ask: a prompt, three models, the method with its cost. */
export const Ready: Story = {};

/** First visit: no prompt and no models yet. */
export const Empty: Story = { args: { prompt: '', models: [] } };

/** With an answer pasted from another tool. */
export const WithManualAnswer: Story = {
  args: { manualResponses: [{ id: 'm1', label: 'Answer from my notes' }], onRemoveManualResponse: () => undefined },
};

/** While the answers stream in. */
export const Running: Story = { args: { running: true } };

/** Phone width. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile1' } } };
