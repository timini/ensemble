import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './Icon';
import {
  Check,
  X,
  Info,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  HelpCircle,
  Share,
  Copy,
  Loader2,
} from 'lucide-react';

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
      description: 'Icon size',
    },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'destructive', 'muted'],
      description: 'Icon color variant',
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic icons from wireframes
export const CheckIcon: Story = {
  args: {
    children: <Check />,
  },
};

export const CloseIcon: Story = {
  args: {
    children: <X />,
  },
};

export const InfoIcon: Story = {
  args: {
    children: <Info />,
  },
};

export const AlertIcon: Story = {
  args: {
    children: <AlertCircle />,
  },
};

export const WarningIcon: Story = {
  args: {
    children: <AlertTriangle />,
  },
};

// Icons from wireframes
export const EyeIcon: Story = {
  args: {
    children: <Eye />,
  },
};

export const EyeOffIcon: Story = {
  args: {
    children: <EyeOff />,
  },
};

export const CheckCircleIcon: Story = {
  args: {
    children: <CheckCircle />,
    variant: 'success',
  },
};

export const HelpCircleIcon: Story = {
  args: {
    children: <HelpCircle />,
    variant: 'muted',
  },
};

export const ShareIcon: Story = {
  args: {
    children: <Share />,
  },
};

export const CopyIcon: Story = {
  args: {
    children: <Copy />,
  },
};

export const LoadingIcon: Story = {
  args: {
    children: <Loader2 className="animate-spin" />,
    variant: 'primary',
  },
};

// Size variants
export const SmallSize: Story = {
  args: {
    children: <Check />,
    size: 'sm',
  },
};

export const DefaultSize: Story = {
  args: {
    children: <Check />,
    size: 'default',
  },
};

export const LargeSize: Story = {
  args: {
    children: <Check />,
    size: 'lg',
  },
};

// Color variants
export const Primary: Story = {
  args: {
    children: <Info />,
    variant: 'primary',
  },
};

export const Success: Story = {
  args: {
    children: <CheckCircle />,
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: <AlertTriangle />,
    variant: 'warning',
  },
};

export const Destructive: Story = {
  args: {
    children: <AlertCircle />,
    variant: 'destructive',
  },
};

export const Muted: Story = {
  args: {
    children: <HelpCircle />,
    variant: 'muted',
  },
};

// All icons showcase
export const AllIcons: Story = {
  args: { children: <Check /> },
  render: () => (
    <div className="flex flex-wrap gap-8 items-center">
      <div className="flex flex-col items-center space-y-2">
        <Icon><Check /></Icon>
        <span className="text-xs text-muted-foreground">Check</span>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <Icon><X /></Icon>
        <span className="text-xs text-muted-foreground">Close</span>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <Icon><Info /></Icon>
        <span className="text-xs text-muted-foreground">Info</span>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <Icon variant="success"><CheckCircle /></Icon>
        <span className="text-xs text-muted-foreground">Success</span>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <Icon variant="warning"><AlertTriangle /></Icon>
        <span className="text-xs text-muted-foreground">Warning</span>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <Icon variant="destructive"><AlertCircle /></Icon>
        <span className="text-xs text-muted-foreground">Error</span>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <Icon variant="muted"><HelpCircle /></Icon>
        <span className="text-xs text-muted-foreground">Help</span>
      </div>
    </div>
  ),
};
