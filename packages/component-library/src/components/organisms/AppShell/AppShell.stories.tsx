import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';
import { AppShell } from './AppShell';
import { Button } from '../../atoms/Button';
import { Sheet } from '../../atoms/Sheet';
import { Composer, type ComposerModel } from '../Composer';
import { modelOptions, samplePrompt, threeModels } from '../Composer/fixtures';
import { ConsensusPanel } from '../ConsensusPanel';
import { AnswerColumns } from '../AnswerColumns';
import { sampleAnswers } from '../AnswerColumns/fixtures';
import { HistorySidebar } from '../HistorySidebar';
import { NOW, samplePresets, sampleHistory } from '../HistorySidebar/fixtures';
import { sampleEstimates } from '../../molecules/MethodMenu/fixtures';
import { samplePairs } from '../../molecules/AgreementSummary/fixtures';
import { sampleConsensus } from '../../molecules/ConsensusAnswer/fixtures';

const cost = { variant: 'actual' as const, callCount: 7, totalUsd: 0.011, estimated: false, pricedCallCount: 7, unpricedCallCount: 0 };

type Stage = 'empty' | 'running' | 'done';

/** The workspace assembled from the library parts, for review at every width. */
function Workspace({ stage }: { stage: Stage }) {
  const [prompt, setPrompt] = React.useState(stage === 'empty' ? '' : samplePrompt);
  const [models, setModels] = React.useState<ComposerModel[]>(stage === 'empty' ? [] : threeModels);
  const [method, setMethod] = React.useState<ConsensusMethod>('standard');
  const [settings, setSettings] = React.useState(false);
  const running = stage === 'running';
  const toggle = (id: string) =>
    setModels((current) => {
      if (current.some((m) => m.id === id)) return current.filter((m) => m.id !== id);
      const o = modelOptions.find((x) => x.id === id);
      return o ? [...current, { id, name: o.name, provider: o.provider }] : current;
    });

  return (
    <AppShell
      sidebar={
        <HistorySidebar
          items={sampleHistory}
          presets={samplePresets}
          activeId={stage === 'empty' ? undefined : 'r1'}
          now={NOW}
          onSelect={() => undefined}
          onDelete={() => undefined}
          onSelectPreset={() => undefined}
          onNewQuestion={() => undefined}
        />
      }
      onOpenSettings={() => setSettings(true)}
      account={<Button variant="outline" size="sm" className="ml-1 hidden sm:inline-flex">Sign in</Button>}
    >
      <div className={`mx-auto space-y-6 px-gutter py-6 ${stage === 'empty' ? 'max-w-2xl pt-12 lg:pt-20' : 'max-w-6xl'}`}>
        {stage === 'empty' && (
          <div className="space-y-2 text-center">
            <h1 className="font-display text-title font-normal">Ask several models at once.</h1>
            <p className="text-body text-muted-foreground">See where they agree, and get one answer you can check.</p>
          </div>
        )}
        <Composer
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={() => undefined}
          models={models}
          onRemoveModel={(id) => setModels((m) => m.filter((x) => x.id !== id))}
          modelOptions={modelOptions}
          onToggleModel={toggle}
          method={method}
          onMethodChange={setMethod}
          estimates={sampleEstimates}
          summarizers={threeModels.map(({ id, name }) => ({ id, name }))}
          summarizerId={threeModels[1].id}
          onAddManualResponse={() => undefined}
          onSavePreset={() => undefined}
          running={running}
        />
        {stage !== 'empty' && (
          <>
            <ConsensusPanel
              agreement={
                running
                  ? { status: 'pending', progress: { done: 1, total: 3 } }
                  : { status: 'ready', score: 0.86, pairs: samplePairs, calibration: { calibrated: false, embeddingModel: 'text-embedding-3-small' } }
              }
              consensus={
                running
                  ? { status: 'awaiting', method, summarizerName: 'Claude Opus 5.5' }
                  : { status: 'success', text: sampleConsensus, method, summarizerName: 'Claude Opus 5.5', cost, durationMs: 6200, onShare: () => undefined }
              }
            />
            <AnswerColumns
              answers={
                running
                  ? [
                      { ...sampleAnswers[0], status: 'streaming', content: 'About 70 °C. Air pressure at the summit is roughly 34 kPa,' },
                      { ...sampleAnswers[1], status: 'waiting', content: undefined },
                      sampleAnswers[2],
                    ]
                  : sampleAnswers
              }
            />
          </>
        )}
      </div>
      <Sheet open={settings} onOpenChange={setSettings} title="Settings" description="Keys, local endpoints, theme and language.">
        <p className="text-label text-muted-foreground">Settings content comes from the settings workstream.</p>
      </Sheet>
    </AppShell>
  );
}

const meta = {
  title: 'Organisms/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: { children: null, onOpenSettings: () => undefined },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The frame alone, with a placeholder sidebar. */
export const Frame: Story = {
  args: {
    sidebar: <p className="p-2 text-label text-muted-foreground">History goes here.</p>,
    children: <div className="p-6 text-label text-muted-foreground">Workspace goes here.</div>,
  },
};

/** First visit: the composer alone, centred. */
export const WorkspaceEmpty: Story = { render: () => <Workspace stage="empty" /> };

/** Answers streaming in. */
export const WorkspaceRunning: Story = { render: () => <Workspace stage="running" /> };

/** A finished run: agreement and consensus above the answers. */
export const WorkspaceDone: Story = { render: () => <Workspace stage="done" /> };
