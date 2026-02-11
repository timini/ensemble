import type { Meta, StoryObj } from '@storybook/react';

interface SwatchProps {
  name: string;
  bgClass: string;
  textClass?: string;
  border?: boolean;
}

function Swatch({ name, bgClass, textClass, border }: SwatchProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-16 h-16 rounded-lg ${bgClass} ${border ? 'border border-border' : ''}`}
      />
      <span className={`text-xs font-mono ${textClass ?? 'text-foreground'}`}>
        {name}
      </span>
    </div>
  );
}

interface TokenRowProps {
  label: string;
  tokens: SwatchProps[];
}

function TokenRow({ label, tokens }: TokenRowProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <div className="flex flex-wrap gap-4">
        {tokens.map((t) => (
          <Swatch key={t.name} {...t} />
        ))}
      </div>
    </div>
  );
}

function TextSample({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium ${className}`}>
        The quick brown fox
      </span>
      <code className="text-xs font-mono text-muted-foreground">{label}</code>
    </div>
  );
}

function ColorPalette() {
  return (
    <div className="space-y-10 p-6 bg-background text-foreground max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">
          Design System Colors
        </h2>
        <p className="text-sm text-muted-foreground">
          Semantic tokens defined in globals.css and mapped in tailwind.config.ts.
          Toggle light/dark mode using the toolbar above.
        </p>
      </div>

      <TokenRow
        label="Core"
        tokens={[
          { name: 'background', bgClass: 'bg-background', border: true },
          { name: 'foreground', bgClass: 'bg-foreground' },
          { name: 'border', bgClass: 'bg-border' },
          { name: 'input', bgClass: 'bg-input' },
          { name: 'ring', bgClass: 'bg-ring' },
        ]}
      />

      <TokenRow
        label="Primary"
        tokens={[
          { name: 'primary', bgClass: 'bg-primary' },
          { name: 'primary-fg', bgClass: 'bg-primary-foreground', border: true },
          { name: 'primary/10', bgClass: 'bg-primary/10', border: true },
          { name: 'primary/20', bgClass: 'bg-primary/20', border: true },
        ]}
      />

      <TokenRow
        label="Secondary"
        tokens={[
          { name: 'secondary', bgClass: 'bg-secondary', border: true },
          { name: 'secondary-fg', bgClass: 'bg-secondary-foreground' },
        ]}
      />

      <TokenRow
        label="Muted"
        tokens={[
          { name: 'muted', bgClass: 'bg-muted', border: true },
          { name: 'muted-fg', bgClass: 'bg-muted-foreground' },
        ]}
      />

      <TokenRow
        label="Accent"
        tokens={[
          { name: 'accent', bgClass: 'bg-accent', border: true },
          { name: 'accent-fg', bgClass: 'bg-accent-foreground' },
        ]}
      />

      <TokenRow
        label="Surfaces"
        tokens={[
          { name: 'card', bgClass: 'bg-card', border: true },
          { name: 'card-fg', bgClass: 'bg-card-foreground' },
          { name: 'popover', bgClass: 'bg-popover', border: true },
          { name: 'popover-fg', bgClass: 'bg-popover-foreground' },
        ]}
      />

      <TokenRow
        label="Semantic States"
        tokens={[
          { name: 'destructive', bgClass: 'bg-destructive' },
          { name: 'destructive-fg', bgClass: 'bg-destructive-foreground', border: true },
          { name: 'success', bgClass: 'bg-success' },
          { name: 'success-fg', bgClass: 'bg-success-foreground', border: true },
          { name: 'warning', bgClass: 'bg-warning' },
          { name: 'warning-fg', bgClass: 'bg-warning-foreground', border: true },
        ]}
      />

      <TokenRow
        label="Semantic States with Opacity"
        tokens={[
          { name: 'destructive/10', bgClass: 'bg-destructive/10', border: true },
          { name: 'destructive/20', bgClass: 'bg-destructive/20', border: true },
          { name: 'success/10', bgClass: 'bg-success/10', border: true },
          { name: 'success/20', bgClass: 'bg-success/20', border: true },
          { name: 'warning/10', bgClass: 'bg-warning/10', border: true },
          { name: 'warning/20', bgClass: 'bg-warning/20', border: true },
        ]}
      />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Text Colors</h3>
        <div className="space-y-2 p-4 bg-card rounded-lg border border-border">
          <TextSample label="text-foreground" className="text-foreground" />
          <TextSample label="text-muted-foreground" className="text-muted-foreground" />
          <TextSample label="text-primary" className="text-primary" />
          <TextSample label="text-destructive" className="text-destructive" />
          <TextSample label="text-success" className="text-success" />
          <TextSample label="text-warning" className="text-warning" />
          <TextSample label="text-primary/80" className="text-primary/80" />
          <TextSample label="text-muted" className="text-muted" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Border Radius</h3>
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 bg-primary/20 border border-primary/40 rounded-sm" />
            <span className="text-xs font-mono text-muted-foreground">sm</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 bg-primary/20 border border-primary/40 rounded-md" />
            <span className="text-xs font-mono text-muted-foreground">md</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 bg-primary/20 border border-primary/40 rounded-lg" />
            <span className="text-xs font-mono text-muted-foreground">lg</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Foundations/Color Palette',
  component: ColorPalette,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ColorPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
