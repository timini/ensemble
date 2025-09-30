import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './Separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-80">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">AI Ensemble</h4>
        <p className="text-sm text-muted-foreground">
          Compare responses from multiple AI models
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Config</div>
        <Separator orientation="vertical" />
        <div>Ensemble</div>
        <Separator orientation="vertical" />
        <div>Prompt</div>
        <Separator orientation="vertical" />
        <div>Review</div>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center">
      <div className="px-4">Item 1</div>
      <Separator orientation="vertical" />
      <div className="px-4">Item 2</div>
      <Separator orientation="vertical" />
      <div className="px-4">Item 3</div>
    </div>
  ),
};

export const InContent: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Introduction</h3>
        <p className="text-sm text-gray-600 mt-2">
          This is an introduction paragraph that provides context.
        </p>
      </div>
      <Separator />
      <div>
        <h3 className="text-lg font-semibold">Main Content</h3>
        <p className="text-sm text-gray-600 mt-2">
          This is the main content section with detailed information.
        </p>
      </div>
      <Separator />
      <div>
        <h3 className="text-lg font-semibold">Conclusion</h3>
        <p className="text-sm text-gray-600 mt-2">
          This is the concluding section that wraps up the content.
        </p>
      </div>
    </div>
  ),
};

export const InNavigation: Story = {
  render: () => (
    <div className="flex h-12 items-center space-x-4 text-sm">
      <a href="#" className="font-medium">
        Home
      </a>
      <Separator orientation="vertical" />
      <a href="#" className="text-muted-foreground">
        About
      </a>
      <Separator orientation="vertical" />
      <a href="#" className="text-muted-foreground">
        Contact
      </a>
      <Separator orientation="vertical" />
      <a href="#" className="text-muted-foreground">
        FAQ
      </a>
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div>
        <p>Default separator</p>
        <Separator className="my-2" />
      </div>
      <div>
        <p>Thick separator</p>
        <Separator className="my-2 h-[2px]" />
      </div>
      <div>
        <p>Colored separator</p>
        <Separator className="my-2 bg-blue-500" />
      </div>
      <div>
        <p>Dashed separator</p>
        <Separator className="my-2 border-t border-dashed bg-transparent" />
      </div>
    </div>
  ),
};

export const InCard: Story = {
  render: () => (
    <div className="w-80 rounded-lg border p-6">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Configuration</h4>
        <p className="text-sm text-muted-foreground">
          Manage your AI model settings
        </p>
      </div>
      <Separator className="my-4" />
      <div className="space-y-4">
        <div className="text-sm">
          <div className="font-medium">API Keys</div>
          <div className="text-muted-foreground">2 connected</div>
        </div>
        <Separator />
        <div className="text-sm">
          <div className="font-medium">Selected Models</div>
          <div className="text-muted-foreground">3 active</div>
        </div>
        <Separator />
        <div className="text-sm">
          <div className="font-medium">Usage</div>
          <div className="text-muted-foreground">84% of monthly limit</div>
        </div>
      </div>
    </div>
  ),
};
