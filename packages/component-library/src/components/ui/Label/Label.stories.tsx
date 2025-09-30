import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './Label';
import { Input } from '../Input';

const meta = {
  title: 'UI/Label',
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Label Text',
  },
};

export const WithInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">Email Address</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <Label>
      Email Address <span className="text-destructive">*</span>
    </Label>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="disabled-input" className="peer-disabled:opacity-70">
        Disabled Field
      </Label>
      <Input id="disabled-input" disabled placeholder="Cannot edit" />
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => (
    <div className="space-y-2">
      <Label className="text-lg text-blue-600">Large Blue Label</Label>
      <Label className="text-xs text-gray-500">Small Gray Label</Label>
      <Label className="font-bold text-destructive">Bold Red Label</Label>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-form">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input id="email-form" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Input id="bio" placeholder="Tell us about yourself" />
      </div>
    </div>
  ),
};
