import type { Meta, StoryObj } from '@storybook/react';

const steps: Array<{ name: string; className: string; sample: string }> = [
  { name: 'display', className: 'font-display text-display', sample: 'Ask several models. See where they agree.' },
  { name: 'title', className: 'text-title', sample: 'Workspace' },
  { name: 'heading', className: 'text-heading', sample: 'Consensus answer' },
  { name: 'lead', className: 'text-lead text-muted-foreground', sample: 'One prompt, several models, one agreement score.' },
  { name: 'body', className: 'text-body', sample: 'Water boils at about 70 °C on the summit of Everest.' },
  { name: 'label', className: 'text-label font-medium', sample: 'Consensus method' },
  { name: 'caption', className: 'text-caption text-muted-foreground', sample: '7 calls · about $0.01' },
];

/** The semantic type scale from tokens.css, plus the three font families. */
function Typography() {
  return (
    <div className="max-w-3xl space-y-8 bg-background p-6 text-foreground">
      <div className="space-y-6">
        {steps.map((step) => (
          <div key={step.name} className="grid gap-1 border-b border-border pb-4 sm:grid-cols-[8rem_1fr] sm:items-baseline">
            <code className="font-mono text-caption text-muted-foreground">text-{step.name}</code>
            <p className={step.className}>{step.sample}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="font-sans text-body">font-sans: Geist, for everything by default</p>
        <p className="font-display text-title font-normal">font-display: Instrument Serif</p>
        <p className="font-mono text-label">font-mono: Geist Mono, for keys and code</p>
      </div>
    </div>
  );
}

const meta: Meta<typeof Typography> = {
  title: 'Foundations/Typography',
  component: Typography,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Typography>;

export const Default: Story = {};
